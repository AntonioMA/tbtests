var FriendListView = function(aFriendsContainer) {

  'use strict';

  /**
   *  What should the LI have? something like
   * <li> NICK
   *   TOOLBAR
   * </li>
   */
  function getToolbarButton(aFriend, aText, aButtonInfo) {
    var liButton =
      Utils.createElement('li', { id: 'litb-' + aText + '-nick-' + aFriend.nick });
    var button = Utils.createElementAt(liButton, 'button',
      {
        id: 'button-' + aText + '-nick-' + aFriend.nick,
        'class': 'tc-button small' + (aButtonInfo.negative ? ' negative' : '')
      }, aText);
    button.addEventListener('click', aButtonInfo.getHandler(aFriend));
    return button;
  }

  /* Toolbar:
   *   <nav class="tc-toolbar">
   *     <ul class="right">
   *       <li><button class="tc-button subdued small">Cancel</button></li>
   *       <li><button class="tc-button negative small">Delete</button></li>
   *     </ul>
   *   </nav>
   */
  function createToolbar(aFriend, aButtonInfo) {
    var nav = Utils.
      createElement('nav', {id: 'nav-nick-' + aFriend.nick, 'class': 'tc-toolbar'});
    var ulNav = Utils.createElementAt(nav, 'ul', {'class': 'right'});

    for(var button in aButtonInfo) {
      var buttonInfo = aButtonInfo[button];
      buttonInfo.shouldAdd(aFriend) &&
        ulNav.appendChild(getToolbarButton(aFriend, button, buttonInfo));
    }
    return nav;
  }

  function createLIContent(aUl, aFriend, aButtonInfo) {
    var li = Utils.createElementAt(aUl, 'li', {id: 'li-nick-' + aFriend.nick});

    // First the name
    var nameHolder = Utils.addText(li, aFriend.nick);

/*    if (sendToke) {
      nameHolder.onclick = sendToke;
    }
*/

    // Then the toolbar
    var toolbar = createToolbar(aFriend, aButtonInfo);
    li.appendChild(toolbar);

    return li;
  }


  function getToplevelUL() {
    var ul =
      document.getElementById('ul-friend-list') ||
      Utils.createElementAt(aFriendsContainer, 'ul',
                            {id:'ul-friend-list'});
    return ul;

  }

  function addNew(aFriend, aButtonInfo) {
    var ul = getToplevelUL();
    createLIContent(ul, aFriend, aButtonInfo);
  }

  /**
   * What I'll have on the HTML:
   * <ul id='ul-friend-list' class='whatever'>
   *   <li id='friend-id-' + nick onclick='clickOnFriend(sId);'> LI-CONTENT </li>
   * </ul>
   */
  function update(aFriendList, aButtonInfo) {
    // I could prolly do this on a nicer way, but this works also...
    aFriendsContainer.innerHTML = '';

    // The way this works is:
    var ul = getToplevelUL();
    for (var i in aFriendList) {
      createLIContent(ul, aFriendList[i], aButtonInfo);
    }
  }


  return {
    update: update,
    addNew: addNew
  };

};

