var TokesServer = (function() {

  'use strict';

  // Toggle this if/when the server side is installed
  //  var server = undefined;
  // This one should work if the page is served from the same server.
  var server = window.location.origin;

  var debugTServer = true;
  var logger = new Utils.Logger('TokesServer');

  var config;

  var debug = logger.log.bind(logger);

  function isConfigured() {
    return (server != null && server != undefined && server != "");
  }

  function getPresenceSession() {
    return Utils.sendXHR('GET', server + '/presence').then(aConfig => {
      config = _aConfig;
      return config;
    });
  }

  // Do a POST to /users to get the token
  function getPresenceToken(aNick) {
    // Note that the other UI sends also a status, connected and token fields
    // which the server promptly goes and ignore
    var dataToSend = {
      'name': aNick
    };
    return Utils.
      sendXHR('POST', server + '/users',
              JSON.stringify(dataToSend), 'application/json');

  }

  // POST to /chats with
  // Request: (JSON encoded)
  // *  `invitee`: the name of the other user who is being invited to the chat
  //
  // Response: (JSON encoded)
  // *  `apiKey`: an OpenTok API key that owns the session ID
  // *  `sessionId`: an OpenTok session ID to conduct the chat within
  // *  `token`: a token that the creator of the chat (or inviter) can use to
  //             connect to the chat session
  function getChatSession(aSelfNick, aNick, aSessionId) {
    var dataToSend = {
      invitee: aNick
    };
    return Utils.sendXHR('POST', '/chats', , 'application/json');
  }

  function eraseEndpoint(aSelfNick, aNick, aEndpoint, aSuccessCallback, aFailureCallback) {
    throw 'NOT_IMPLEMENTED_YET';
  }

  function loadMyRemoteFriends(aSelfNick, aSuccessCallback, aFailureCallback) {
    throw 'NOT_IMPLEMENTED_YET';
  }

  // What this really should do is to queue a notification for the friends
  // that still don't know they're my friends
  function saveFriendsToRemote(aSelfNick, aFriendList) {
    throw 'NOT_IMPLEMENTED_YET';
  }

  return {
    getPresenceSession: getPresenceSession,
    getPresenceToken: getPresenceToken,
    getChatSession: getChatSession,
    get friendServer() {
      return server;
    },
    set friendServer(aServer) {
      server = aServer;
    },
    saveFriendsToRemote: saveFriendsToRemote,
    loadMyRemoteFriends: loadMyRemoteFriends,
    eraseEndpoint: eraseEndpoint,
    isConfigured: isConfigured
  };

})();
