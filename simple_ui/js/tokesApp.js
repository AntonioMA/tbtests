// The main flow of the app goes here...

var TokesApp = (function() {

  'use strict';

  var debugTokes = true;

  var debug = debugTokes?Utils.debug.bind(undefined, 'tsimplepush:TokesApp'):function (msg) {};

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

  var presenceSessionConfig;

  // Return false also if the friend exist but isn't registered (so we can talk
  // to him but not the reverse)
  function isAlreadyAFriend(aNick) {
    for (var i in myFriends) {
      if ((myFriends[i].nick === aNick) && (myFriends[i].sessionId)) {
        return true;
      }
    }
    return false;
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
    if (aFriend.remoteSessionId) {
      var asideTOF = Utils.createElementAt(li, 'aside',
        {
          id: 'aside-tof-nick-' + aFriend.nick
        }
      );
      var imgTOF = Utils.createElementAt(asideTOF, 'img',
        {
          id: 'img-nick-' + aFriend.nick,
          src: IMG_SEND
        }
      );
      sendToke = function() {
        debug('Somebody clicked! Sending Toke to ' + arguments[1] + ' on ' + arguments[0]);
        OTHelper.sendPushTo(arguments[0]);
      }.bind(undefined, aFriend.remoteSessionId, aFriend.nick);
      asideTOF.onclick = sendToke;
    }

    // Add the erase button
    if (aFriend.sessionId){
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

  function getFriendFromList(aNick) {
    for (var i in myFriends) {
      if (myFriends[i].nick === aNick) {
        return i;
      }
    }
    return undefined;
  }

  // This should:
  // 1. Erase the remote sessionId
  // 2. Unregister the sessionId
  // 3. Erase the sessionId from the local friend (and from the database)
  // On this version, we're going to happily assume no failures...
  function eraseLocalFriend(aNick) {
    var i = getFriendFromList(aNick);
    function eraseFromDb(aUnregisterSuccess) {
      // Ignoring aUnregisterSuccess for the time being
      TBUserDb.eraseSessionId(myFriends[i].sessionId, function() {
        if (myFriends[i].remoteSessionId === undefined) {
          delete myFriends[i];
        } else {
          myFriends[i].sessionId = undefined;
        }
        updateFriendList(); // Programmer efficiency FTW :P
      });
    }
    if (i !== undefined) {
      Server.eraseSessionId(selfNick, myFriends[i].nick, myFriends[i].sessionId,
                                     OTHelper.deleteSessionId.bind(undefined, myFriends[i].sessionId, eraseFromDb));
    }
  }


  /**
   * What I'll have on the HTML:
   * <ul id='all-friends-lists' class='whatever'>
   *   <li id='friend-id-' + nick onclick='clickOnFriend(ep);'> LI-CONTENT </li>
   * </ul>
   */
  function updateFriendList() {
    // I could prolly do this on a nicer way, but this works also...
    friendsContainer.innerHTML = '';

    // The way this works is:
    var ul = Utils.createElementAt(friendsContainer, 'ul', {id:'ul-friend-list'});
    for (var i in myFriends) {
      createLIContent(ul, myFriends[i]);
    }
  }

  function addFriendSessionId(aNick, aSessionId) {
    var ul = document.getElementById('ul-friend-list') || 
             Utils.createElementAt(friendsContainer, 'ul', {id:'ul-friend-list'});
    TBUserDb.setNickForSessionId(aSessionId, aNick);
    Server.sendSessionId(selfNick, aNick, aSessionId);
    var i = getFriendFromList(aNick);
    if (i !== undefined) { 
      myFriends[i].sessionId = aSessionId;
      updateFriendList();
    } else {
      var newFriend = {
          nick: aNick,
          sessionId: aSessionId,
          remoteSessionId: undefined
      };
      myFriends.push(newFriend);
      createLIContent(ul, newFriend);
    }
  }

  function mixFriends(myRemoteFriends) {
    for (var i in myRemoteFriends) {
      var j = getFriendFromList(myRemoteFriends[i].nick);
      if (j !== undefined) {
        if (myFriends[j].remoteSessionId != myRemoteFriends[i].sessionId) {
          myFriends[j].remoteSessionId = myRemoteFriends[i].sessionId;
          TBUserDb.setNickForSessionId(myFriends[j].sessionId, myFriends[j].nick, myFriends[j].remoteSessionId);
        }
      } else {
        // Should I add it without a local sessionId? I could but not with the DB as currently defined
        // So tough luck...
        // I could use a trick here but let's leave that for V2. Or for the reader. Whatever.
        myFriends.push({
          nick: myRemoteFriends[i].nick,
          remoteSessionId: myRemoteFriends[i].sessionId,
          sessionId: undefined
        });
      }
    }
    updateFriendList();
  }

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
      TBUserDb.setSelfNick(selfNick);
    }
    if (serverField.value !== Server.friendServer) {
      Server.friendServer = serverField.value;
      TBUserDb.friendServer = serverField.value;
    }
    selfNickWrapper.style.display = 'none';
    mainWrapper.style.display = '';
    document.getElementById('header-text').textContent =
      'TokesApp (' + selfNick + ')';

    OTHelper.connectToPresenceSession(presenceSessionConfig, selfNick).
      then(TBUserDb.getRegisteredNicks).
      then(internalFriends =>  {
        // TO-DO TO-DO! Am I going to store the friend list centrally? Shouldn't
        // need to.
        myFriends = internalFriends;
        Server.saveFriendsToRemote(selfNick, myFriends);
        Server.loadMyRemoteFriends(selfNick, mixFriends, updateFriendList);
      });
  }

  function setLoginField(aField, aValue, aDefaultValue) {
    debug('setLoginField called with: ' + JSON.stringify(aValue));
    var aux;
    if (aValue && aValue.nick) {
      debug('setting field to ' + aValue.nick);
      aux = aValue.nick;
    } else {
      aux = aDefaultValue;
    }
    aField.value = aux;
    return aux;
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

    if (isAlreadyAFriend(aNick)) {
      // Should probably inform the user... naaaah
      debug('Nasty user! Trying to add an existing friend ' + aNick + ' no cookie!');
    } else {
      OTHelper.getNewSessionId(true, addFriendSessionId.bind(undefined, aNick));
    }
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
    TokesServer.getPresenceSession().then(aConfig => {
      loginButton.addEventListener('click', onLoginClick);
      loginButton.disabled = false;
      document.getElementById('login-form').
        addEventListener('submit', onLoginClick);
      presenceSessionConfig = aConfig;
    });

    friendNickField.addEventListener('input', onFriendNickChange);

  }

  function processPushRegister(e) {
    TBUserDb.getRegisteredNicks().then( internalFriends => {
      for (var i in internalFriends) {
        //This verification should no be necessary, if it doesn't have a
        // sessionIdn then it will not be in the db.
        //But it doesn't hurt either
        if (internalFriends[i].sessionId !== undefined) {
          TBUserDb.eraseSessionIdP(internalFriends[i].sessionId).
            then( () => {
              OTHelper.
                getNewSession().
                then(addFriendEP.bind(undefined, internalFriends[i].nick));
            });
        }
      }
    });
  }


  return {
    init: init,
    setSelfNick: setSelfNick,
    setFriendServer: setFriendServer,
    processNotification: processNotification
  };

})();

window.addEventListener('load', function showBody() {
  console.log('loadHandler called');
  TBUserDb.initDB().then(function() {
    TokesApp.init();
    TBUserDb.getSelfNick().then(TokesApp.setSelfNick);
    TBUserDb.getFriendServer().then(TokesApp.setFriendServer);
  });

});
