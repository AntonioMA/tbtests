var parseSearch = function(aSearchStr) {
  function _addValue(currValue, newValue) {
    if (currValue === undefined) {
      return newValue;
    }
    if (!Array.isArray(currValue)) {
      currValue = [currValue];
    }
    currValue.push(newValue);
    return currValue;
  }

  return aSearchStr.slice(1).split('&').
    map(function(aParam) { return aParam.split('='); }).
    reduce(function(aObject, aCurrentValue) {
      var parName = aCurrentValue[0];
      var value = aCurrentValue[1] && window.decodeURIComponent(aCurrentValue[1]) || null;

      aObject.params[parName] = _addValue(aObject.params[parName], value);
      return aObject;
    },
           {
             params: {},
             getFirstValue: function(aParam) {
               return Array.isArray(this.params[aParam]) ? this.params[aParam][0] : this.params[aParam];
             }
           }
          );
};

function onload() {
  var params = parseSearch(document.location.search || "").params;
  console.log(params);
  if (!params.apiKey || !params.sessionId || !params.token) {
    document.getElementById('form-wrapper').classList.remove('hidden');
  } else {
    startOTTest(params);
  }
}

function startOTTest(params) {
  var session = OT.initSession(params.apiKey, params.sessionId);
  session.on({
  "connectionCreated": function(evt) {
    console.log("Got a connection created event. Data: [" + evt.connection.data + "]");
  },
  "connectionDestroyed": function(evt) {
    console.log("Got a connection destroyed event. Data: [" + evt.connection.data + "]");
  }
  });
  session.connect(params.token);
}
