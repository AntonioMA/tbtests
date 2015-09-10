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

  function sendContactSession(aSelfNick, aNick, aSessionId) {
    throw 'NOT_IMPLEMENTED_YET';
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
    sendContactSesssion: sendContactSession,
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
