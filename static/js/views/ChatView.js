/* -----------------------------------------------------------------------------------------------
 * Chat View
 * ----------------------------------------------------------------------------------------------*/
/* global jQuery, Backbone, _, log */
/* global Chat */
/* exported ChatView */

// Prevent leaking into global scope
!(function(exports, $, undefined) {

  exports.ChatView = Backbone.View.extend({

    className: 'panel panel-default',

    events: {
      'click .end-button': 'endButtonClicked'
    },

    initialize: function(options) {
      if (!options.dispatcher) {
        log.error('ChatView: initialize() cannot be called without a dispatcher');
        return;
      }
      this.dispatcher = options.dispatcher;

      if (!options.localUser) {
        log.error('ChatView: initialize() cannot be called without a local user');
        return;
      }
      this.localUser = options.localUser;

      this.dispatcher.on('invitationAccepted', this.invitationAccepted, this);
    },

    template: _.template($('#tpl-chat').html()),

    render: function() {
      var templateData = this.model ? this.model.attributes : { subscriberName: false };
      this.$el.html(this.template(templateData));
      return this;
    },

    invitationAccepted: function(invitation) {

      // Create a chat based on this invitation, and store it as the model for this view
      this.model = new Chat({}, {
        localUser: this.localUser,
        invitation: invitation
      });

      // The DOM elements required for the chat should appear on the page
      this.render();
      this.model.on('started', this.chatStarted, this);
      this.model.on('subscriberJoined', this.subscriberJoined, this);
      this.model.on('ended', this.chatEnded, this);
      this.model.start(this.$('.publisher')[0], this.$('.subscriber')[0]);
    },

    subscriberJoined: function() {
      this.$('.waiting').remove();
    },

    chatEnded: function() {
      var self = this;

      setTimeout(function() {
        self.model.off('started', self.chatStarted);
        self.model.off('ended', self.chatEnded);
        self.model = null;
        self.render();
        self.dispatcher.trigger('chatEnded');
      }, 2000);
      this.$('.waiting').remove();
      this.$('.ending').removeClass('hidden');
    },

    endButtonClicked: function() {
      this.model.end();
    }

  });

}(window, jQuery));
