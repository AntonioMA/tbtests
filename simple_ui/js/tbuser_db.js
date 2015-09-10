// Let's take all the indexedDB... well, crap, here so the other part is cleaner
var TBUserDb = (function() {

  'use strict';

  var DB_NAME = 'tbusers_db_test';
  var DB_VERSION = 1.0;
  var DB_TNAME = 'tbUsers';

  var MY_ID = 'id_self';
  // Now this is taking the database table maybe a little bit too far
  // But I don't really feel like adding another table just for this
  var URL_PARTNER_SERVER = 'url_partner_server';

  var debugPushDb = true;
  var logger = new Utils.Logger('tbuser_db', debugPushDb);
  var debug = logger.log.bind(logger);

  var indexedDB =
    window.mozIndexedDB || window.webkitIndexedDB || window.indexedDB;

  var database = null;

  function init(db_name, version) {
    return new Promise((resolve, reject) => {

      var dbHandle = indexedDB.open(db_name, version);

      dbHandle.onsuccess = function (event) {
        debug("IDB.open.onsuccess called: " + dbHandle.result);
        database = dbHandle.result;
        resolve();
      };

      dbHandle.onerror = function(event) {
        debug("Ups! Cannot create or access the database! Error: " +
              event.target.error);
      };

      dbHandle.onupgradeneeded = function (event) {
        // For this version I will create just one of object store to keep track
        // of the different sessionIDs I've registered
        // Oh and I'm happily assuming that the operation is always a create.
        debug("IDB.open.onupgrade called");
        try {
          dbHandle.result.createObjectStore(DB_TNAME, {keyPath: "sessionId"});
        } catch (x) {
          dbHandle.result.deleteObjectStore(DB_TNAME);
          dbHandle.result.createObjectStore(DB_TNAME, {keyPath: "sessionId"});
        }
      };
    });
  };

  // DB_TNAME should have a valid IDBDatabase for these methods to work...
  // otherwise they'll happily fail.
  function getNickForSessionId(aSessionId) {
    return new Promise((resolve, reject) => {
      var getRequest = database.
        transaction(DB_TNAME,'readonly').
        objectStore(DB_TNAME).
        get(aSessionId);

      getRequest.onsuccess = function() {
        resolve(getRequest.result);
      };

      getRequest.onerror = function() {
        debug("getNickForSession: get.onerror called" + getRequest.error.name);
      };
    });
  }

  function eraseSessionId(aSessionId) {
    return new Promise((resolve, reject) => {
      var eraseRequest = database.
        transaction(DB_TNAME,'readwrite').
        objectStore(DB_TNAME).
        delete(aSessionId);

      eraseRequest.onsuccess = function() {
        resolve(eraseRequest.result);
      };

      eraseRequest.onerror = function() {
        debug("eraseSessionId: delete.onerror called" +
              eraseRequest.error.name);
      };
    });
  }

  function setNickForSessionId(aSessionId, aNick, aRemoteSessionId) {
    return new Promise((resolve, reject) => {
      var putRequest = database.
        transaction(DB_TNAME,'readwrite').
        objectStore(DB_TNAME).
        put(
          {
            sessionId: aSessionId,
            nick: aNick,
            remoteSessionId: aRemoteSessionId
          }
        );
      putRequest.onsuccess = resolve;
    });
  }

  function getRegisteredNicks() {
    return new Promise((resolve, reject) => {
      var returnedValue = [];
      var store = database.
        transaction(DB_TNAME,'readwrite').
        objectStore(DB_TNAME);
      var readAllReq = store.openCursor();
      readAllReq.onsuccess = function() {
        debug ("getRegisteredNicks: readAllReq.onsuccess called");
        var cursor = readAllReq.result;
        if (!cursor) {
          resolve(returnedValue);
        } else {
          var getReq = store.get(cursor.key);
          getReq.onsuccess = function() {
            // Don't add myself or the server to the list
            if ((getReq.result.sessionId !== MY_ID) &&
                (getReq.result.sessionId !== URL_PARTNER_SERVER)) {
              returnedValue.push(getReq.result);
            }
            cursor.continue();
          };
        }
      };
    });
  };

  function clearDB() {
    var store = database.
      transaction(DB_TNAME,'readwrite').
      objectStore(DB_TNAME);
    store.clear();
  }

  function initDB() {
    return init(DB_NAME, DB_VERSION);
  }

  return {
    getNickForSessionId: getNickForSessionId,
    setNickForSessionId: setNickForSessionId,
    eraseSessionId: eraseSessionId,
    getSelfNick: getNickForSessionId.bind(undefined, MY_ID),
    setSelfNick: setNickForSessionId.bind(undefined, MY_ID),
    getFriendServer: getNickForSessionId.bind(undefined, URL_PARTNER_SERVER),
    setFriendServer: setNickForSessionId.bind(undefined, URL_PARTNER_SERVER),
    getRegisteredNicks: getRegisteredNicks,
    clearDB: clearDB,
    initDB: initDB
  };

})();

/*

// Usage sample
PushDb.setSelfNick('pepito');
PushDb.getSelfNick().then(function (aValue) {
  console.log("My nick is " + JSON.stringify(aValue));
});
PushDb.setNickForSessionId('an_invented_ep','friend_of_myself');
PushDb.setNickForSessionId('other_invented_ep','friend_of_myself');
PushDb.getRegisteredNicks().then(function (values) {
  values.forEach(function (value) {
    console.log("Read value: "+ JSON.stringify(value));
  });
});

*/