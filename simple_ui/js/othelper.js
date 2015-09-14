'use strict';

var OTHelper = (function() {

  var debugOTHelper = true;
  var logger = new Utils.Logger('OTHelper', debugOTHelper);
  var debug = logger.log.bind(logger);

  // This will store the presence Session object
  var presenceSession = null;

  function sendCallTo(aConnection) {
    debug('sendCallTo: ' + JSON.stringify(aConnection));
    return new Promise((resolve, reject) => {
      throw 'NOT_IMPLEMENTED_YET';
    });
  }

  function connectToPresenceSession(aConfig, aNick, aHandlers) {
    return TokesServer.
      getPresenceToken(aNick).
      then(tokenInfo => {
        // Pending to check, the way I believe this should go is:
        // a) init the session object
        presenceSession = OT.initSession(aConfig.apiKey, aConfig.sessionId);
        // b) set the handlers (at least for connectionCreatedEvent)
        presenceSession.on(aHandlers);

        // c) call session.connect and hope for the best
        return new Promise( (resolve, reject) =>
          presenceSession.
            connect(tokenInfo.token,
                    error => (error && reject(error)) || resolve()));
      });
  }

  // Inform the peer (over the presence channel) of changes on what we
  // know/expect about him. Basically it can set or delete the local
  // sessionId he can use to connect to us. Modifies aRegister.updatePending
  // if the update was successful
  function updatePeer(aConnection, aReg, aSelfNick) {
    return new Promise((resolve, reject) => {
      if (!aConnection || !aReg.updatePending || !presenceSession) {
        resolve(aReg);
        return;
      }
      var signal = {
        type: aReg.canContactUs ? 'setPeerSessionId': 'removePeerSessionId',
        data: JSON.stringify({
          nick: aSelfNick,
          sessionId: aReg.sessionId
        }),
        to: aConnection
      };
      presenceSession.signal(signal, (error) => {
        aReg.updatePending = !!error;
        resolve(aReg);
      });
    });
  }

  return {
    connectToPresenceSession: connectToPresenceSession,
    sendCallTo: sendCallTo,
    updatePeer: updatePeer
  };

})();
