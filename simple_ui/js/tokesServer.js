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

  // Gets a new session id from the server. We're going to be astute here to
  // reuse the server and just do a POST to /chats and ignore the token happily.
  // POST to /chats with
  // Request: (JSON encoded)
  // *  `invitee`: the name of the other user who is being invited to the chat
  //
  // Response: (JSON encoded)
  // *  `apiKey`: an OpenTok API key that owns the session ID
  // *  `sessionId`: an OpenTok session ID to conduct the chat within
  // *  `token`: a token that the creator of the chat (or inviter) can use to
  //             connect to the chat session
  function getNewSessionId(aNick) {
    var dataToSend = {
      invitee: aNick
    };
    return Utils.
      sendXHR('POST', '/chats', JSON.stringify(dataToSend),
              'application/json').
      then(sessionData => sessionData.sessionId);
  }

  return {
    getPresenceSession: getPresenceSession,
    getPresenceToken: getPresenceToken,
    getNewSessionId: getNewSessionId,
    get friendServer() {
      return server;
    },
    set friendServer(aServer) {
      server = aServer;
    },
    isConfigured: isConfigured
  };

})();
