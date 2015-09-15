'use strict';

var OTHelper = (function() {

  var OPENTOK_SRC = 'https://static.opentok.com/webrtc/v2/js/opentok.js';

  var otLoaded = LazyLoader.load(OPENTOK_SRC);
  var debugOTHelper = true;
  var logger = new Utils.Logger('OTHelper', debugOTHelper);
  var debug = logger.log.bind(logger);

  // This will store the presence Session object
  var presenceSession = null;

        // apiKey, sessionId, token
  function acceptCall(aTokenInfo, aNick) {
    return otLoaded.
      then(() => {
        return new Promise((resolve, reject) => {
        // Pending to check, the way I believe this should go is:
        // a) init the session object
        var chatSession = OT.initSession(aTokenInfo.apiKey, aTokenInfo.sessionId);
        // b) set the handlers (at least for connectionCreatedEvent)
        // c) call session.connect and hope for the best
          var peopleConnected = 0;
          chatSession.on('connectionCreated', (evt) => {
            peopleConnected++;
            if (peopleConnected >= 2) {
              resolve(chatSession);
            }
          });

          chatSession.connect(aTokenInfo.token, error => error && reject(error));
        });
      });
  }

  function sendCallTo(aConnection, aSelfNick, aRemoteSession) {
    debug('sendCallTo: ' + JSON.stringify(aConnection));
    return new Promise((resolve, reject) => {
      if (!aConnection || !presenceSession) {
        reject('User not present or lost connection');
        return;
      }
      var signal = {
        type: 'incomingCall',
        data: JSON.stringify({
          nick: aSelfNick,
          sessionId: aRemoteSession
        }),
        to: aConnection
      };
      presenceSession.signal(signal, (error) => {
        error && reject(error) || resolve(aRemoteSession);
      });
    });
  }

  function connectToPresenceSession(aConfig, aToken, aNick, aHandlers) {
    debug('connectToPresenceSession: ' + aNick + ' => ' + JSON.stringify(aHandlers));
    return otLoaded.
      then(() => {
        // Pending to check, the way I believe this should go is:
        // a) init the session object
        presenceSession = OT.initSession(aConfig.apiKey, aConfig.sessionId);
        // b) set the handlers (at least for connectionCreatedEvent)
        presenceSession.on(aHandlers);

        // c) call session.connect and hope for the best
        return new Promise( (resolve, reject) =>
          presenceSession.
            connect(aToken,
                    error => (error && reject(error)) || resolve()));
      });
  }

  function initPublisher(aComponent) {
    return new Promise((resolve, reject) => {
      var publisher = OT.initPublisher(aComponent, (error) =>
        (error && reject(error)) || resolve(publisher)
      );
    });
  }

  function addPublisherToSession(session, publisher) {
    return new Promise((resolve, reject) => {
      session.publish(publisher, (error) =>
        (error && reject(error)) || resolve(session));
    });
  }

  function publishStreams(aSession, aComponent) {
    initPublisher.then(publisher => addPublisherToSession(aSession, publisher));
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
        type: 'setPeerSessionId',
        data: JSON.stringify({
          nick: aSelfNick,
          sessionId: aReg.canContactUs ? aReg.sessionId : null
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
    updatePeer: updatePeer,
    publishStream: publishStreams
  };

})();
