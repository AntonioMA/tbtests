// Note: Since I'm not putting the TB key and data here, and don't really want
// to have a not-checked-in file for that either, I'm just going to store them
// on redis (and assume they're already stored when this runs).
// Just run:
// redis-cli set tb_api_key yourkeyhere
// redis-cli set tb_api_secret yoursecrethere
// Once before trying to run this
function ServerMethods() {
  'use strict';

  const TB_API_KEY = 'tb_api_key';
  const TB_API_SECRET = 'tb_api_secret';
  const TB_PRESENCE_SESS_ID = 'tb_presence_session_id';

  var returnData = require('SimpleHTTPServer').CommonMethods.returnData;
  var Logger = require('SimpleHTTPServer').HTTPLogger;
  var Opentok = require('opentok');
  var Promise = require('promise');

  var logger = new Logger("ServerMethods", true);

  // Add some persistence...
  var Redis = require('ioredis');
  var redis = new Redis();

  // Opentok API instance, which will be configured only after tbConfigPromise
  // is resolved
  var opentok;
  var tbConfigPromise = _initialTBConfig();

  var serveStaticContent =
    require('SimpleHTTPServer').CommonMethods.serveStaticContent;

  // Nothing to do here at the moment
  function doOptions(aReq, aRes, aPathname) {
    logger.log("doOptions: " + aPathname);
    returnData(aRes, 500, "Not supported", "text/html");
  }

  // Returns a nice HTML about page
  function getAboutPage(aReq, aRes, aParsedURL) {
    logger.log("aboutPage");
    serveStaticContent(aReq, aRes, {pathname: "/about.html"});
  }

  // To-do: I could move this to the SimpleHTTPServer module, since it seems
  // very reusable. Well, except for the tbConfigPromise part :)
  function _commonPost(aName, aNext, aReq, aRes, aParsedURL) {
    tbConfigPromise.then(tbConfig => {
      aReq.on('readable', function() {
        aReq.setEncoding('ascii');

        var data = JSON.parse(aReq.read());

        // I'm not doing anything with the URL here (since we don't have any
        // /get/some/resource paths, but I could do that here...
        var parsedPath = aParsedURL.pathname.split('/');
        var parsedQS = qs.parse(aParsedURL.query);

        logger.log(aName, ' <= ', JSON.stringify(data), ',',
                   JSON.stringify(parsedQS));

        aNext(tbConfig, data, parsedPath, parsedQS).then(responseObj => {
          var response = JSON.stringify(responseObj);
          logger.log(aName, ' => ', response);
          returnData(aRes, 200, response,'application/json');
        }).catch(err => returnData(aRes, err.code, err.text, 'text/html'));
      });
    });
  }

  // And ditto this...
  var qs = require('querystring');
  function _commonGet(aName, aNext, aReq, aRes, aParsedURL) {
    tbConfigPromise.then(tbConfig => {
      logger.log(aName,' <= ', JSON.stringify(aParsedURL));

      // I'm not doing anything with the URL here (since we don't have any
      // /get/some/resource paths, but I could do that here...
      var parsedPath = aParsedURL.pathname.split('/');
      var parsedQS = qs.parse(aParsedURL.query);

      aNext(tbConfig, aParsedURL, parsedPath, parsedQS).then(responseObj => {
        var response = JSON.stringify(responseObj);
        logger.log(aName, ' => ', response);
        returnData(aRes, 200, response, 'application/json');
      }).catch(err => returnData(aRes, err.code, err.text, 'text/html'));

    });
  }

  // /users
  // Input: {"name": aName,"status":"offline","connected":false,"token":null}
  // Response:
  // *  `token`: A token that can be used to connect to the presence session,
  //             which also identifies the user to all other users who connect
  //             to it.
  //
  // NOTE: This request allows anonymous access, but if user authentication is
  //       required then the identity of the request should be verified (often
  //       times with session cookies) before a valid response is given.
  // NOTE: Uniqueness of names is not enforced.
  var postUsers = _commonPost.bind(undefined, 'postUsers',
    (tbConfig, data) => {
      // Gotta create a token for this user, and return that...
      return Promise.resolve({
        token: opentok.generateToken(
          tbConfig.presenceSessionId, {
            data: JSON.stringify({name: data.name}),
            role: 'subscriber'
          })
      });
  });

  // /chats
  // Create a chat
  //
  // Request: (JSON encoded)
  // *  `invitee`: the name of the other user who is being invited to the chat
  //
  // Response: (JSON encoded)
  // *  `apiKey`: an OpenTok API key that owns the session ID
  // *  `sessionId`: an OpenTok session ID to conduct the chat within
  // *  `token`: a token that the creator of the chat (or inviter) can use to
  //             connect to the chat session
  //
  // NOTE: This request is designed in a manner that would make it convenient to
  // add user authentication in the future. The `invitee` field is not currently
  // used but could be used to help verify that a user who attempts to create a
  // chat is allowed to do so. An alternative design could be to hand both the
  // `inviterToken` and `inviteeToken` to the inviter, who could then send the
  // invitee a token over an OpenTok signal. The drawback of that design would
  // be that the server loses the ability to keep track of the state of a user
  //  (such as if they have joined a chat or not).
  var postChats = _commonPost.bind(undefined, 'postChats',
    (tbConfig, data) => {
      // Let's see... without looking first. I must create a new session id, and
      //  a new token over that session id. And then I should sent that to the
      //  invitee but the documentation says that isn't used... Strange
      //
      // TO-DO: Error control is severely lacking here. Or non existant.
      // Also note, session.generateToken is a less verbose way of generating
      // tokens
      return new Promise((resolve, reject) => {
        opentok.createSession({mediaMode: 'relayed'}, (error, session) => {
          resolve({
            apiKey: tbConfig.apiKey,
            sessionId: session.sessionId,
            token: session.generateToken({role: 'publisher'})
          });
        });
      });
  });


  // /getPresence
  // Arguments: none
  // Response: (JSON encoded)
  // *  `apiKey`: The presence session API Key
  // *  `sessionId`: The presence session ID
  var getPresence =
    _commonGet.bind(undefined, 'getPresence',
                    (tbConfig, aParsedURL, aParsedPath, aParams) =>
    Promise.resolve({
        apiKey: tbConfig.apiKey,
        sessionId: tbConfig.presenceSessionId
    })
  );

  // Join a chat
  // Should be...
  //   /chats/sessionID
  // but it really is
  //   /chats?sessionId=sessionId
  //
  // Request: (query parameter)
  // *  `sessionId`: the OpenTok session ID which corresponds to the chat an
  //     invitee is attempting to enter
  //
  // Response: (JSON encoded)
  // *  `apiKey`: an OpenTok API key that owns the session ID
  // *  `sessionId`: an OpenTok session ID to conduct the chat within
  // *  `token`: a token that the user joining (or invitee) a chat can use to
  //             connect to the chat session
  //
  // NOTE: This request is designed in a manner that would make it convenient to
  // add user authentication in the future. The query parameter `sessionId` is
  // like a filter on the `/chats` resource to find the appropriate
  // chat. Alternatively, if new chats were stored for some time, each one could
  // be given an independent URI. The invitee would then GET that specific
  // resource.  The response would then contain the `sessionId` and an
  // appropriate token (invitee or inviter) based on user authentication.
  var getChats =
    _commonGet.bind(undefined, 'getChats',
                    (tbConfig, aParsedURL, aParsedPath, aParams) => {
      // aParams.sessionId has the session we want to join...

      try {
        var token = opentok.generateToken(aParams.sessionId);
      } catch(e) {
        token = null;
      }
      logger.log('TESTESTEST', token, JSON.stringify(aParams));
      if (token) {
        return Promise.resolve({
          apiKey: tbConfig.apiKey,
          sessionId: aParams.sessionId, // Why're we returning this again?
          token: token
        });
      } else {
        return Promise.reject({code: 404, text: 'Invalid SessionId'});
      }
  });

  function _initialTBConfig() {
    return new Promise((resolve, reject) => {
      // The first time (and only the first time) this is run I have to create a
      // session id for the presence...
      var solver = (apiKey, apiSecret, maybePresenceSessionId) => {
        opentok = new Opentok(apiKey, apiSecret);
        var presenceSessionPromise;
        if (!maybePresenceSessionId) {
          logger.log('_initialTBConfig:',
                     'We don\'t have a session yet! We have to create it...');
          presenceSessionPromise =
            new Promise((resolveSession, rejectSession) =>
              opentok.createSession(
                {mediaMode: 'relayed'},
                (err, sId) => {
                  if (!err) {
                    var sessionId = sId.sessionId;
                    logger.log('_initialTBConfig:',
                      'Session created: ' + sessionId);
                    redis.set(TB_PRESENCE_SESS_ID, sessionId);
                    resolveSession(sessionId);
                  } else {
                    rejectSession(err);
                  };
              })
            );
          } else {
            logger.log('_initialTBConfig:',
                       'We already had a sessionID: ' + maybePresenceSessionId);
            presenceSessionPromise = Promise.resolve(maybePresenceSessionId);
          }
          presenceSessionPromise.then(presenceSessionId =>
            resolve({
              apiKey: apiKey,
              apiSecret: apiSecret,
              presenceSessionId: presenceSessionId
            })
          );
      };

      var pipeline = redis.pipeline();
      pipeline.get(TB_API_KEY).get(TB_API_SECRET).get(TB_PRESENCE_SESS_ID).
        exec().then( results => {
          // Results should be a three row array of two row arrays...
          var apiKey = results[0][1];
          var apiSecret = results[1][1];
          var presenceSessionId = results[2][1];
          if (apiKey && apiSecret) {
            solver(apiKey, apiSecret, presenceSessionId);
          } else {
            throw('Cannot get the API key or API secret from redis');
          }
        }
        ).catch(error => {
          throw('Cannot get the API key or API secret from redis ' + error);
        }
      );
    });
  }

  return {
    getAboutPage: getAboutPage,
    doOptions: doOptions,
    getPresence: getPresence,
    postUsers: postUsers,
    postChats: postChats,
    getChats: getChats
  };

};

module.exports.ServerMethods = new ServerMethods();
