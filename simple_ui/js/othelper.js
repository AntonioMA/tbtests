'use strict';

var OTHelper = (function() {

  var debugPush = true;
  var logger = new Utils.Logger('OTHelper');
  var debug = logger.log.bind(logger);

  // This will store the presence Session object
  var presenceSession = null;

  function getNewSession() {
    debug('getNewSession');
    return new Promise((resolve, reject) => {
      throw 'NOT_IMPLEMENTED_YET';
    });
  }

  function deleteSession(aSessionId) {
    debug('deleteSession: ' + aSessionId);
    return new Promise((resolve, reject) => {
      throw 'NOT_IMPLEMENTED_YET';
    });
  }

  function sendCallTo(aConnection) {
    debug('sendCallTo: ' + JSON.stringify(aConnection));
    return new Promise((resolve, reject) => {
      throw 'NOT_IMPLEMENTED_YET';
    });
  }

  function connectToPresenceSession(aConfig, aNick) {
    return TokesServer.
      getPresenceToken(aNick).
      then(tokenInfo => {
        // Pending to check, the way I believe this should go is:
        // a) init the session object
        presenceSession = OT.initSession(aConfig.apiKey, aConfig.sessionId);
        // b) set the handlers (at least for connectionCreatedEvent)
        presenceSession.
          on({
              connectionCreated: event => { throw 'NOT_IMPLEMENTED';}
          });

        // c) call session.connect and hope for the best
        return new Promise( (resolve, reject) =>
          presenceSession.
            connect(tokenInfo.token,
                    error => (error && reject(error)) || resolve()));
      });
  }

  // Events that we can get:
  // SessionConnectEvent => Session connected
  // SessionDisconnectEvent => Sessino disconnected
  // SignalEvent => We got mail!
  // ConnectionEvent => Somebody (or us!) connected
  function setPresenceHandlers(aHandlers) {
    // aHandlers will be an array of {type: 'signalName', handler: handledFunc}
    throw 'NOT_IMPLEMENTED_YET';
  }


  return {
    connectToPresenceSession: connectToPresenceSession,
    sendCallTo: sendCallTo,
    getNewSession: getNewSession,
    setPresenceHandlers: setPresenceHandlers,
    deleteSession: deleteSession  };
})();
