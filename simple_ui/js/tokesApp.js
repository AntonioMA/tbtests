// The main flow of the app goes here...

var TokesApp = (function() {

  'use strict';

  var debugTokes = true;

  var logger = new Utils.Logger('TokesServer', debugTokes);
  var debug = logger.log.bind(logger);

  // This can/have to be changed to allow different kind of servers easily
  var Server = TokesServer;

  var self = this;

  var selfNick = '';

  // Form elements and the rest...
  var selfNickField = null;
  var serverField = null;
  var loginButton = null;
  var mainWrapper = null;
  var selfNickWrapper = null;
  var addFriendButton = null;
  var friendsContainer = null;
  var friendNickField = null;

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

  // This should:
  // 1. Set canContactUs to false
  // 2. Inform the remote user that he can't call us anymore
  // 3. Update the database
  // On this version, we're going to happily assume no failures...
  function eraseLocalFriend(aNick) {
    var i = getFriendFromList(aNick);
    // It erases only if there was no remote endpoint for this
    // user. Otherwise it just removes the ability for the peer to
    // contact us.
    function eraseFromDb() {
      // Ignoring aUnregisterSuccess for the time being
      if (myFriends[i].remoteSessionId === undefined) {
        TBUserDb.
          eraseSessionId(myFriends[i].sessionId).
          then(() => {
            delete myFriends[i];
            updateFriendList(); // Programmer efficiency FTW :P
          });
      } else {
        myFriends[i].canContactUs = false;
        myFriends[i].updatePending = true;
        OTHelper.
          updatePeer(connectedFriends[myFriends[i].remoteSessionId],
                     myFriends[i], selfNick).
          then(TBUserdDb.updateRegister);
      }
    }

    (i !== undefined) && eraseFromDb();
  }


  /**
   *  What should the LI have? something like
   *  <aside class='pack-end'> <!-- only if it's a local friend -->
   *    <img alt='placeholder' src='erase.jpg' onclick='eraseFriend'>
   *  </aside>
   *  <aside class='icon'>
   *    <img src='typeoffriend.jpg'>
   *  </aside>
   *  <p onclick='sendToke'> Friend Nick </p>
   *
   */
  function createLIContent(aUl, aFriend) {
    var li = Utils.createElementAt(aUl, 'li', {id: 'li-nick-' + aFriend.nick});

    // Add the send button...
    var sendToke = undefined;
    if (aFriend.remoteSessionId && connectedFriends[aFriend.remoteSessionId]) {
      var asideTOF =
        Utils.createElementAt(li, 'aside',
                              { id: 'aside-tof-nick-' + aFriend.nick });
      var imgTOF =
        Utils.createElementAt(asideTOF, 'img',
                              {
                                id: 'img-nick-' + aFriend.nick,
                                src: IMG_SEND
                              }
        );
      sendToke = function() {
        debug('Somebody clicked! Sending Call to ' + arguments[1] + '' +
              ' on ' +  arguments[0]);
        OTHelper.sendCallTo(arguments[0]);
      }.bind(undefined, connectedFriends[aFriend.remoteSessionId], aFriend.nick);
      asideTOF.onclick = sendToke;
    }

    // Add the erase button
    if (aFriend.canContactUs) {
      var asideErase = Utils.createElementAt(li, 'aside',
          {
            id: 'aside-erase-nick-' + aFriend.nick,
            'class': 'pack-end'
          }
      );
      var imgErase = Utils.createElementAt(asideErase, 'img',
        {
          id: 'img-nick-' + aFriend.nick,
          src: IMG_ERASE
        }
      );
      asideErase.onclick = function() {
        eraseLocalFriend(arguments[0]);
      }.bind(undefined, aFriend.nick);
    }
    // And finally the name
    var nameHolder = Utils.createElementAt(li, 'p',
                                           { id: 'txt-nick-' + aFriend.nick },
                                           aFriend.nick);
    if (sendToke) {
      nameHolder.onclick = sendToke;
    }

    return li;
  }

  /**
   * What I'll have on the HTML:
   * <ul id='all-friends-lists' class='whatever'>
   *   <li id='friend-id-' + nick onclick='clickOnFriend(sId);'> LI-CONTENT </li>
   * </ul>
   */
  function updateFriendList() {
    // I could prolly do this on a nicer way, but this works also...
    friendsContainer.innerHTML = '';

    // The way this works is:
    var ul = Utils.createElementAt(friendsContainer, 'ul',
                                   {id:'ul-friend-list'});
    for (var i in myFriends) {
      createLIContent(ul, myFriends[i]);
    }
  }

  function addPeerSessionId(aNick, aSessionId) {
    var ul =
      document.getElementById('ul-friend-list') ||
        Utils.createElementAt(friendsContainer, 'ul',
                              {id:'ul-friend-list'});

    // We could get this from onAddFriendClick but it might have changed since
    // we could queue several add and delete operations....
    var i = getFriendFromList(aNick);
    var newFriend = null;

    if (i !== undefined) {
      newFriend = myFriends[i];
      newFriend.canContactUs = true;
      newFriend.updatePending = true;
      updateFriendList();
    } else {
      newFriend = {
        nick: aNick,
        sessionId: aSessionId,
        canContactUs: true,
        updatePending: true,
        remoteSessionId: undefined
      };
      myFriends.push(newFriend);
      createLIContent(ul, newFriend);
    }
    OTHelper.
      updatePeer(connectedPeers[aNick], newFriend, selfNick).
      then(TBUserDb.updateRegister);
  }

  function updateConnection(aAdd, aEvt) {
    var connection = aEvt.connection;
    var connectionData = JSON.parse(connection.data);
    var nick = connectionData.name;
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
    updateFriendList();
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
    signal: evt => {
      var data = JSON.parse(evt.data);
      var peer = data.nick;
      var i = getFriendFromList(peer);
      var friendPromise = (i !== undefined && Promise.resolve(myFriends[i])) ||
        Server.getNewSessionId(peer).then(aSessionId => {
          return {
            nick: peer,
            sessionId: aSessionId,
            canContactUs: false,
            updatePending: false,
            remoteSessionId: data.sessionId
          };
        });

      switch(evt.type) {
        case 'setPeerSessionId':
          friendReg.remoteSessionId = data.sessionId;
          break;
        case 'removePeerSessionId':
          delete friendReg.remoteSessionId;
          break;
        case 'connectCall':
        case 'cancelCall':
      }
    }
  };


  // Self explanatory :P
  function onLoginClick(evt) {
    // Register the handlers for the presence session...
    OTHelper.setPresenceHandlers();

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
      'TokesApp (' + selfNick + ')';

    TBUserDb.getRegisteredUsers().
      then(internalFriends =>  {
        myFriends = internalFriends;
        return OTHelper.
          connectToPresenceSession(presenceSessionConfig,
                                   selfNick,
                                   presenceHandlers);
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
    var newSessionPromise = (i === undefined) ?
      Promise.resolve(myFriends[i].sessionId) :
      Server.getNewSessionId(aNick);

    newSessionPromise.then(addPeerSessionId.bind(undefined, aNick));
  }

  function onFriendNickChange() {
    addFriendButton.disabled = friendNickField.value === '';
  }

  function init() {
    debug('init called');

    selfNickField = document.getElementById('self-nick');
    loginButton = document.getElementById('login-button');
    serverField = document.getElementById('server');
    addFriendButton = document.getElementById('add-friend-button');
    mainWrapper = document.getElementById('main-window');
    friendsContainer = document.getElementById('friends-container');

    // I'm pretty sure there's a better way to do this!!!
    mainWrapper.style.display = 'none';

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

/*
  function processPushRegister(e) {
    TBUserDb.getRegisteredNicks().then( internalFriends => {
      for (var i in internalFriends) {
        //This verification should no be necessary, if it doesn't have a
        // sessionIdn then it will not be in the db.
        //But it doesn't hurt either
        if (internalFriends[i].sessionId !== undefined) {
          TBUserDb.eraseSessionId(internalFriends[i].sessionId).
            then( () => {
              OTHelper.
                getNewSession().
                then(addFriendEP.bind(undefined, internalFriends[i].nick));
            });
        }
      }
    });
  }
*/

  return {
    init: init,
    setSelfNick: setSelfNick,
    setFriendServer: setFriendServer
  };

})();

window.addEventListener('load', function showBody() {
  console.log('loadHandler called');
  TBUserDb.initDB().then(function() {
    TokesApp.init();
    TBUserDb.selfNick.then(TokesApp.setSelfNick);
    TBUserDb.friendServer.then(TokesApp.setFriendServer);
  });

});
