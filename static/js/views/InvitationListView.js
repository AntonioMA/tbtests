/* -----------------------------------------------------------------------------------------------
 * Invitation List View
 * ----------------------------------------------------------------------------------------------*/
/* global jQuery, Backbone, _, log */
/* exported InvitationListView */

// Prevent leaking into global scope
!(function(exports, $, undefined) {

  exports.InvitationListView = Backbone.View.extend({

    className: 'invitation-list',

    events: {
      'click .invite-accept': 'inviteAccept',
      'click .invite-decline': 'inviteDecline',
      'click .invite-cancel': 'inviteCancel'
    },

    initialize: function() {
      this.listenTo(this.collection, 'add remove', this.render);
    },

    incomingTemplate: _.template($('#tpl-incoming-invite').html()),
    outgoingTemplate: _.template($('#tpl-outgoing-invite').html()),

    render: function() {
      var self = this;

      this.$el.empty();
      this.collection.each(function(invitation) {
        var template = invitation.get('incoming') ? self.incomingTemplate : self.outgoingTemplate;
        var invitationData = JSON.parse(JSON.stringify(invitation));
        self.$el.append(template(invitationData));
      });

      return this;
    },

    inviteAccept: function(event) {
      log.info('InvitationListView: inviteAccept');
      var index = this.$('.invitation').index($(event.currentTarget).parents('.invitation'));
      this.collection.acceptInvitation(index);
    },

    inviteDecline: function(event) {
      log.info('InvitationListView: inviteDecline');
      var index = this.$('.invitation').index($(event.currentTarget).parents('.invitation'));
      this.collection.declineInvitation(index);
    },

    inviteCancel: function(event) {
      log.info('InvitationListView: inviteCancel');
      var index = this.$('.invitation').index($(event.currentTarget).parents('.invitation'));
      this.collection.cancelInvitation(index);
    },

  });

}(window, jQuery));
