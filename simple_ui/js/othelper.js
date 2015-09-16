'use strict';

var OTHelper = (function() {

  var OPENTOK_SRC = 'https://static.opentok.com/webrtc/v2/js/opentok.js';

  var otLoaded = LazyLoader.load(OPENTOK_SRC);
  var debugOTHelper = true;
  var logger = new Utils.Logger('OTHelper', debugOTHelper);
  var debug = logger.log.bind(logger);

  // This will store the presence Session object
  var presenceSession = null;


  function _connectToSession(aSession, aApiKey, aToken, aHandlerTemplates) {
    debug('_connectToSession');
    return otLoaded.
      then(() => {
        // Pending to check, the way I believe this should go is:
        // a) init the session object
        var _session = OT.initSession(aApiKey, aSession);
        // b) set the handlers (at least for connectionCreatedEvent)
        // Nifty trick to get a reference to the session inside the handler...
        // Where by 'nifty' I mean dirty
        var _handlers = {};
        Object.
          keys(aHandlerTemplates).
          forEach(aEvtName => _handlers[aEvtName] = aHandlerTemplates[aEvtName].bind(_session));
        _session.on(_handlers);

        // c) call session.connect and hope for the best
        return new Promise( (resolve, reject) =>
          _session.
            connect(aToken,
                    error => (error && reject(error)) || resolve(_session)));
    });
  }

  function connectToPresenceSession(aConfig, aTokenInfo, aNick, aHandlers) {
    debug('connectToPresenceSession: ' + aNick + ' => ' + JSON.stringify(aHandlers));
    return _connectToSession(aConfig.sessionId, aConfig.apiKey, aTokenInfo.token, aHandlers).
      then(aSession => presenceSession = aSession);
  }


  // apiKey, sessionId, token
  function acceptCall(aTokenInfo, aNick, aHandlers) {
    debug('acceptCall(' + aNick + '): ' + JSON.stringify(aTokenInfo));
    return _connectToSession(aTokenInfo.sessionId, aTokenInfo.apiKey, aTokenInfo.token, aHandlers);
  }

  // 
  function endCall(aChatSession) {
    debug('endCall');
    return new Promise((resolve, reject) =>{
      aChatSession.on('sessionDisconnected', evt => {
        debug('endCall: session disconnected');
        // Note that I don't know if this is expected or not...
        aChatSession.off();
        resolve();
      });
      // If we haven't disconnected in 3 seconds, something's broken
      setTimeout(reject, 3000);
      aChatSession.disconnect();
    });
//    aChatSession
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

  function initPublisher(aComponent) {
    debug('initPublisher');
    return new Promise((resolve, reject) => {
      var publisher = OT.initPublisher(aComponent, (error) =>
        (error && reject(error)) || resolve(publisher)
      );
    });
  }

  function addPublisherToSession(aSession, aPublisher) {
    debug('addPublisherToSession: ' + aSession);
    return new Promise((resolve, reject) => {
      aSession.publish(aPublisher, (error) =>
        (error && reject(error)) || resolve(aSession));
    });
  }

  function publishStreams(aSession, aComponent) {
    debug('publishStreams: ' + aSession);
    initPublisher(aComponent).then(publisher => addPublisherToSession(aSession, publisher));
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
    publishStreams: publishStreams,
    acceptCall: acceptCall,
    endCall: endCall
  };

})();
