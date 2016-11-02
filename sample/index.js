!function(exports) {

  var OTScriptOrigin = new URL(document.currentScript.src).origin;
  console.log('Using:', OTScriptOrigin, 'as baseURL.');

  exports.OTLoadSDK = () => {
    var otSrc = document.createElement('script');
    otSrc.src = 'https://static.opentok.com/webrtc/v2/js/opentok.min.js';
    document.head.appendChild(otSrc);
  };

  exports.OTLoadConfig = (aName) => {
    return new Promise((resolve, reject) => {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', [OTScriptOrigin, 'session', aName].join('/'));
      xhr.responseType = 'json';
      xhr.onload = function(aEvt) {
        if (xhr.status === 200) {
          resolve(xhr.response);
        } else {
          reject(xhr.status);
        }
      };
      xhr.send();
    });
  };

  var publisher;
  exports.OTStart = (aName, aPubContainer, aSubContainer) =>
    exports.OTLoadConfig(aName).then(sessInfo => {
      var session = OT.
        initSession(sessInfo.apiKey, sessInfo.sessionId).
        on('streamCreated', function(event) {
          session.subscribe(event.stream, aSubContainer, { insertMode: 'append' });
        }).
        connect(sessInfo.token, function(error) {
          publisher = OT.initPublisher(aPubContainer, { insertMode: 'append' });
          session.publish(publisher);
        });
    });

  exports.OTResizePublisher = () => {
    publisher.element.style.width = "1000px";
    publisher.element.style.height = "750px";
  };

}(this);
