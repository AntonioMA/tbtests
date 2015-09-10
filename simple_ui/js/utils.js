// Bag of diverse things... all the ugliness, only one place to check :P
var Utils = (function() {

  'use strict';

  function SimpleLogger(name, initialValue) {
    var _enabled = initialValue;

    function log() {
      if (_enabled) {
        var args = Array.prototype.slice.call(arguments);
        args.unshift('[DEBUG] ' + new Date().toString() + ' - ' + name + ":");
        args.push('\n');
        console.log.apply(console, args);
      }
    }

    return {
      log: log,
      set enabled(debugValue) {
        _enabled = debugValue;
      },
      get enabled() {
        return _enabled;
      }
    };
  }

  var debugUtils = true;
  var logger = new SimpleLogger('Utils', debugUtils);
  var debug = logger.log.bind(logger);

  // Doing it generic isn't worth the problem... this expects to get a JSON and
  // will bork otherwise
  function sendXHR(aType, aURL, aData, aDataType) {
    return new Promise((resolve, reject) => {
      var xhr = new XMLHttpRequest();
      xhr.open(aType, aURL);
      xhr.responseType = "json";
      xhr.overrideMimeType("application/json");
      if (aDataType) {
        xhr.setRequestHeader("Content-Type", aDataType); // Note that this requires
          xhr.setRequestHeader("Content-Length", aData.length);
      }

      xhr.onload = function (aEvt) {
        debug("sendXHR. XHR success");
        // Error control is for other people... :P
        resolve(xhr.response);
      };

      xhr.onerror = function (aEvt) {
        debug("sendXHR. XHR failed " + JSON.stringify(aEvt) + "url: "+ aURL +
              " Data: " + aData + " RC: " + xhr.responseCode);
        reject(aEvt);
      };

      xhr.send(aData);
    });
  }

//////////////////////////////////////////////////////////////////////////////
// This exists only so I don't have to keep remembering how to do it...
//////////////////////////////////////////////////////////////////////////////
  function addText(aElem, aText) {
    aElem.appendChild(document.createTextNode(aText));
  }

  function createElementAt(aMainBody, aType, aAttrs, aOptionalText, aBefore) {
    var elem = document.createElement(aType);

    // Add all the requested attributes
    if (aAttrs){
      for (var i in aAttrs){
        elem.setAttribute(i, aAttrs[i]);
      }
    }

    if (!aBefore) {
      aMainBody.appendChild(elem);
    } else {
      mainBody.insertBefore(elem, aBefore);
    }

    if (aOptionalText) {
      addText(elem, aOptionalText);
    }

    return elem;
  }

//////////////////////////////////////////////////////////////////////////////
// End of useful DOM manipulation...
//////////////////////////////////////////////////////////////////////////////
  return {
    sendXHR: sendXHR,
    Logger: SimpleLogger,
    addText: addText,
    createElementAt: createElementAt
  };

})();
