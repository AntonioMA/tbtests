/* -----------------------------------------------------------------------------------------------
 * Buddy List View
 * ----------------------------------------------------------------------------------------------*/
/* global jQuery, Backbone, _, log */
/* exported BuddyListView */

// Prevent leaking into global scope
!(function(exports, $, undefined) {

  exports.BuddyListView = Backbone.View.extend({

    className: 'panel panel-default',

    events: {
      'click .invite-button': 'inviteButtonClicked'
    },

    initialize: function(options) {
      if (!options.dispatcher) {
        log.error('BuddyListView: initialize() cannot be called without a dispatcher');
        return;
      }
      this.dispatcher = options.dispatcher;
      this.dispatcher.on('userAvailability', this.userAvailabilityChanged, this);

      this.listenTo(this.collection, 'add remove change:available', this.render);

      this.allowedToInvite = true;
    },

    template: _.template($('#tpl-buddy-list').html()),

    render: function() {
      this.$el.html(this.template({
        users: this.collection.toJSON()
      }));
      if (!this.allowedToInvite) {
        this.$('.invite-button').prop('disabled', true);
      }
      return this;
    },

    inviteButtonClicked: function(event) {
      var index,
          remoteUser;

      index = this.$('.buddy').index($(event.currentTarget).parents('.buddy'));
      remoteUser = this.collection.at(index);
      if (index === -1 || !remoteUser) {
        log.warn('BuddyListView: inviteButtonClicked remote user not found');
        return;
      }
      this.dispatcher.trigger('inviteRemoteUser', remoteUser);
    },

    userAvailabilityChanged: function(isAvailable) {
      this.allowedToInvite = isAvailable;
      this.render();
    }

  });

}(window, jQuery));
