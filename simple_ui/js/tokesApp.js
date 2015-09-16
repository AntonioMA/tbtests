// The main flow of the app goes here...

var TokesApp = (function() {

  'use strict';

  var debugTokes = true;
  var debug = () => {};

  // This can/have to be changed to allow different kind of servers easily
  var Server;

  var friendList;

  var self = this;

  var selfNick = '';

  // Form elements and the rest...
  var selfNickField = null;
  var serverField = null;
  var loginButton = null;
  var mainWrapper = null;
  var selfNickWrapper = null;
  var addFriendButton = null;
  var friendNickField = null;
  var videoWrapper = null;

  var IMG_SEND = 'style/icons/out.jpg';
  var IMG_ERASE = 'style/icons/clear.png';

  var myFriends = [];

  // This will hold the live list of connected peers for which we
  // have a contact sessionId. The sessionId will be the key...
  var connectedFriends = {};

  // And this is the live list of all the connected peers, even those
  // for which we don't have a contact sessionId. The *nick* is the key here
  var connectedPeers = {};


  var presenceSessionConfig;

  function getFriendFromList(aNick) {
    for (var i in myFriends) {
      if (myFriends[i].nick === aNick) {
        return i;
      }
    }
    return undefined;
  }

  function smartUpdateRegister(aFriendReg) {
    var i = getFriendFromList(aFriendReg.nick);

    // If it doesn't exist and we can't call nor be called, do nothing
    if ((i === undefined) && !aFriendReg.canContactUs && !aFriendReg.remoteSessionId) {
      return Promise.resolve(aFriendReg);
    }

    if (i === undefined) {
      // New friend
      i = myFriends.push(aFriendReg);
      i--;
    }

    if (aFriendReg.canContactUs || aFriendReg.remoteSessionId) {
      // add or update
      return TBUserDb.updateRegister(aFriendReg);
    } else {
      // erase
      return TBUserDb.
        eraseSessionId(aFriendReg.sessionId).
        then(() => {
          delete myFriends[i];
        });
    }
  }


  var waitingOnAnswer;

  /* Buttons that can be added to each friend row. Each element must have
   *  shoulAdd (friend) => boolean (true if the button must be added for that friend)
   *  handler (friend) => function (function that should be called with the button is pressed)
   */
  var toolbarButtons = {
    'Call': {
      shouldAdd: friend => friend.remoteSessionId && connectedFriends[friend.remoteSessionId],
      negative: false,
      getHandler: friend => {
        var handler = function() {
          debug('Somebody clicked! Sending Call to ' + arguments[1] + '' +
                ' on ' +  arguments[0]);
          // TO-DO: UI UI UI Besides sending the call we should show something here!
          OTHelper.
            sendCallTo(arguments[0], selfNick, arguments[1]).
            then(remoteSession => waitingOnAnswer = remoteSession).
            then(Server.getCallToken).
            then(aTokenInfo => OTHelper.acceptCall(aTokenInfo, selfNick)).
            then(session => {
              // Enable the chat div and disable the other temporarily...
              switchVideo();
              // and then...
              OTHelper.publishStreams(session, videoWrapper);
            }).
            catch(error => debug('Error calling: ' + error.message));
        }.bind(undefined, connectedFriends[friend.remoteSessionId], friend.remoteSessionId);
        return handler;
      }
    },
    'Erase': {
      shouldAdd: friend => friend.canContactUs,
      negative: true,
      getHandler: friend => {
        var handler = function() {
          eraseLocalFriend(arguments[0]);
        }.bind(undefined, friend.nick);
        return handler;
      }
    }
  };


  // This should:
  // 1. Set canContactUs to false
  // 2. Inform the remote user that he can't call us anymore
  // 3. Update the database
  // On this version, we're going to happily assume no failures...
  function eraseLocalFriend(aNick) {
    var i = getFriendFromList(aNick);

    if (i === undefined) {
      return;
    }

    if (myFriends[i].canContactUs) {
      myFriends[i].canContactUs = false;
      myFriends[i].updatePending = true;
    }
    // Update the peer if available, then erase/update the DB, then update the screen
    OTHelper.
      updatePeer(connectedPeers[myFriends[i].nick], myFriends[i], selfNick).
      then(smartUpdateRegister).
      then(() => friendList.update(myFriends, toolbarButtons));
  }

  function addPeerSessionId(aNick, aSessionId) {

    // We could get this from onAddFriendClick but it might have changed since
    // we could queue several add and delete operations....
    var i = getFriendFromList(aNick);
    var newFriend = null;

    if (i !== undefined) {
      newFriend = myFriends[i];
      newFriend.canContactUs = true;
      newFriend.updatePending = true;
      friendList.update(myFriends, toolbarButtons);
    } else {
      newFriend = {
        nick: aNick,
        sessionId: aSessionId,
        canContactUs: true,
        updatePending: true,
        remoteSessionId: undefined
      };
      friendList.addNew(newFriend, toolbarButtons);
    }
    OTHelper.
      updatePeer(connectedPeers[aNick], newFriend, selfNick).
      then(smartUpdateRegister);
  }

  function updateConnection(aAdd, aEvt) {
    var connection = aEvt.connection;
    var connectionData = JSON.parse(connection.data);
    var nick = connectionData.name;
    // Ignore myself
    debug('updateConnection: ' + aAdd + ' - ' + nick);
    if (nick === selfNick) {
      return;
    }
    var i = getFriendFromList(nick);

    if (aAdd) {
      connectedPeers[nick] = connection;
    } else {
      delete connectedPeers[nick];
    }

    // If I can talk to him then add the connection to the correct list
    if ( i !== undefined && myFriends[i].nick == nick &&
         myFriends[i].remoteSessionId) {
      if (aAdd) {
        connectedFriends[myFriends[i].remoteSessionId] = connection;
      } else {
        delete connectedFriends[myFriends[i].remoteSessionId];
      }
    }
    // I shouldn't do this on every connection but wait till it has
    // finished... sadly there's no 'no more connections' event.
    friendList.update(myFriends, toolbarButtons);
  }

  // This can be used to set a new remote session id or to erase it.
  function setRemoteSessionId(evt) {
    var data = JSON.parse(evt.data);
    var peer = data.nick;
    var i = getFriendFromList(peer);

    //  b) It's an erase and we don't have the friend or it's only local => return
    if (!data.sessionId && (i === undefined || !myFriends[i].remoteSessionId)) {
      return;
    }

    var friendPromise = (i !== undefined && Promise.resolve(myFriends[i])) ||
      Server.getNewSessionId(peer).then(aSessionId => {
        var newFriend = {
          nick: peer,
          sessionId: aSessionId,
          canContactUs: false,
          updatePending: false,
          remoteSessionId: data.sessionId
        };
        return newFriend;
      });

    friendPromise.then(friendReg => {
      // We should update the connectedFriends list since we have a new friend...
      // or we have lost one.
      if (friendReg.remoteSessionId) {
        delete connectedFriends[friendReg.remoteSessionId];
      }
      if (data.sessionId) {
        connectedFriends[data.sessionId] = connectedPeers[friendReg.nick];
      }
      friendReg.remoteSessionId = data.sessionId || undefined;
      smartUpdateRegister(friendReg).
        then(() => friendList.update(myFriends, toolbarButtons));
    });
  }


  // data {nick, sessionId}
  function incomingCall(evt) {
    var data = JSON.parse(evt.data);
    var peer = data.nick;
    var i = getFriendFromList(peer);
    if (i === undefined || myFriends[i].sessionId !== data.sessionId) {
      debug('We got an incoming call from ' + data.nick + ' but either we do not know him or the' +
            'session is incorrect');
      // TO-DO should we reject the call?
      return;
    }
    // TO-DO Show the ui, for now just accept it magically
    Server.getCallToken(data.sessionId).
      then(aTokenInfo => OTHelper.acceptCall(aTokenInfo, data.nick)).
      then(session => {
              // Enable the chat div and disable the other temporarily...
              switchVideo();
              // and then...
              OTHelper.publishStreams(session, videoWrapper);
      });
  }

  function cancelCall(evt) {
    throw 'NOT_IMPLEMENTED_YET';
  }

  function acceptCall(evt) {
    throw 'NOT_IMPLEMENTED_YET';
  }
  // Handlers for the presence session
  // The presence session is used to keep track of the connected users. I will
  // need to:
  //  * When a user connect, check if I have something pending for him
  //    (I added him as a friend but couldn't notify him for example)
  //  * When a user connects, if I have his contact information enable
  //    the call button
  //  * When a user disconnects, if I have his contact information
  //    disable the call button
  //  * When a signal is received, enable the UI needed to accept or
  //    deny the call
  // evt.connection is a Connection object
  var presenceHandlers = {
    connectionCreated: updateConnection.bind(undefined, true),
    connectionDestroyed: updateConnection.bind(undefined, false),
    'signal:setPeerSessionId': setRemoteSessionId,
    'signal:incomingCall': incomingCall,
    'signal:acceptCall': acceptCall,
    'signal:cancelCall': cancelCall
  };


  // Self explanatory :P
  function onLoginClick(evt) {

    if (evt && evt.preventDefault) {
      evt.preventDefault();
    }
    debug('onLoginClick called');
    if (selfNickField.value !== selfNick) {
      selfNick = selfNickField.value;
      TBUserDb.selfNick = selfNick;
    }
    if (serverField.value !== Server.friendServer) {
      Server.friendServer = serverField.value;
      TBUserDb.friendServer = serverField.value;
    }
    selfNickWrapper.style.display = 'none';
    mainWrapper.style.display = '';
    document.getElementById('header-text').textContent =
      'Hello ' + selfNick;

    TBUserDb.getRegisteredUsers().
      then(internalFriends =>  {
        myFriends = internalFriends;
        // Do a first update with the local list...
        friendList.update(myFriends, toolbarButtons);
        return TokesServer.
          getPresenceToken(selfNick).
          then(token => OTHelper.
              connectToPresenceSession(presenceSessionConfig,
                                       token,
                                       selfNick,
                                       presenceHandlers));
      });
  }

  function setLoginField(aField, aValue, aDefaultValue) {
    debug('setLoginField called with: ' + JSON.stringify(aValue));
    aField.value = (aValue && aValue.nick) || aDefaultValue;
    return aField.value;
  }

  function setSelfNick(aNick) {
    debug('setSelfNick called with: ' + JSON.stringify(aNick));
    selfNick = setLoginField(selfNickField, aNick, '');
  }


  function setFriendServer(aServer) {
    debug('setFriendServer called with: ' + JSON.stringify(aServer));
    setLoginField(serverField, aServer, Server.friendServer);
  }

  function onAddFriendClick(evt) {
    if (evt && evt.preventDefault) {
      evt.preventDefault();
    }

    var aNick = friendNickField.value;
    // If this fails this isn't going to be funny
    friendNickField.value = '';
    addFriendButton.disabled = true;

    var i = getFriendFromList(aNick);
    if (i !== undefined && myFriends[i].canContactUs) {
      // Should probably inform the user... naaaah
      debug('Nasty user! Trying to add an existing friend ' + aNick +
            ' no cookie!');
      return;
    }

    // Either we don't know anything about that user yet, or
    // we already can contact him but not the reverse...
    var newSessionPromise = (i !== undefined) ?
      Promise.resolve(myFriends[i].sessionId) :
      Server.getNewSessionId(aNick);

    newSessionPromise.then(addPeerSessionId.bind(undefined, aNick));
  }

  function onFriendNickChange() {
    addFriendButton.disabled = friendNickField.value === '';
  }

  function switchVideo() {
    // TO-DO I'm pretty sure there's a better way to do this!!!
    if (videoWrapper.style.display == '') {
      mainWrapper.style.display = '';
      videoWrapper.style.display = 'none';
    } else {
      mainWrapper.style.display = 'none';
      videoWrapper.style.display = '';
    }
  }

  function init() {
    var logger = new Utils.Logger('TokesServer', debugTokes);
    debug = logger.log.bind(logger);
    Server = TokesServer;

    debug('init called');

    selfNickField = document.getElementById('self-nick');
    loginButton = document.getElementById('login-button');
    serverField = document.getElementById('server');
    addFriendButton = document.getElementById('add-friend-button');
    mainWrapper = document.getElementById('main-window');
    videoWrapper = document.getElementById('video-wrapper');
    friendList = new FriendListView(document.getElementById('friends-container'));

    // I'm pretty sure there's a better way to do this!!!
    mainWrapper.style.display = 'none';
    videoWrapper.style.display = 'none';

    selfNickWrapper = document.getElementById('self-nick-wrapper');
    friendNickField = document.getElementById('friend-to-add');

    // Event Listeners
    document.getElementById('add-friend-form').
      addEventListener('submit', onAddFriendClick);

    loginButton.disabled = true;
    Server.getPresenceSession().then(aConfig => {
      loginButton.addEventListener('click', onLoginClick);
      loginButton.disabled = false;
      document.getElementById('login-form').
        addEventListener('submit', onLoginClick);
      presenceSessionConfig = aConfig;
    });

    friendNickField.addEventListener('input', onFriendNickChange);

  }

  return {
    init: init,
    setSelfNick: setSelfNick,
    setFriendServer: setFriendServer
  };

})();

window.addEventListener('load', function showBody() {
    LazyLoader.dependencyLoad([
      'js/utils.js',
      'js/friendList.js',
      'js/tokesServer.js',
      'js/tbuser_db.js',
      'js/othelper.js'
    ]).then(() => {
      console.log('loadHandler called');

      TBUserDb.initDB().then(function() {
      TokesApp.init();
      TBUserDb.selfNick.then(TokesApp.setSelfNick);
      TBUserDb.friendServer.then(TokesApp.setFriendServer);
      });
    });

});
