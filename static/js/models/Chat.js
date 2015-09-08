/* -----------------------------------------------------------------------------------------------
 * Chat Model
 * ----------------------------------------------------------------------------------------------*/
/* global OT, Backbone, _, log */
/* exported Chat */

// Prevent leaking into global scope
!(function(exports, undefined) {

  exports.Chat = Backbone.Model.extend({

    defaults: {
      subscriberName: null
    },

    videoProperties: {
      insertMode: 'append',
      width: '100%',
      height: '100%',
      style: {
        buttonDisplayMode: 'off'
      }
    },

    initialize: function(attrs, options) {
      if (!options.localUser) {
        log.error('Chat: initialize() cannot be called without a local user');
        return;
      }
      this.localUser = options.localUser;

      if (!options.invitation) {
        log.error('Chat: initialize() cannot be called without an invitation');
        return;
      }
      this.invitation = options.invitation;

      this.set('subscriberName', this.invitation.get('remoteUser').get('name'));
    },

    start: function(publisherEl, subscriberEl) {
      var self = this,
          _start;
      log.info('Chat: start');

      _start = function () {
        self.subscriberEl = subscriberEl;

        self.session = OT.initSession(self.invitation.get('apiKey'),
                                      self.invitation.get('sessionId'));
        self.session.on('sessionConnected', self.sessionConnected, self)
                    .on('sessionDisconnected', self.sessionDisconnected, self)
                    .on('streamCreated', self.streamCreated, self)
                    .on('connectionCreated', self.connectionCreated, self)
                    .on('connectionDestroyed', self.connectionDestroyed, self);
        self.session.connect(self.invitation.get('token'));

        self.publisher = OT.initPublisher(publisherEl, self.videoProperties);

        self.trigger('started');
      };

      this.verifyInvitationReady(function() {
        self.verifyUserStatus(_start);
      });
    },

    end: function() {
      log.info('Chat: end');
      this.session.disconnect();
    },

    sessionConnected: function() {
      log.info('Chat: sessionConnected');
      this.session.publish(this.publisher);
    },

    sessionDisconnected: function() {
      log.info('Chat: sessionDisconnected');
      this.invitation.off(null, null, this);
      this.session.off();
      this.session = null;
      this.subscriberEl = null;
      this.publisher = null;
      this.subscriber = null;
      this.remoteConnection = null;
      this.trigger('ended');
    },

    streamCreated: function(event) {
      log.info('Chat: streamCreated');
      this.subscriber = this.session.subscribe(event.stream,
                                               this.subscriberEl,
                                               this.videoProperties);
      this.trigger('subscriberJoined');
    },

    connectionCreated: function(event) {
      log.info('Chat: connectionCreated');
      if (event.connection.connectionId !== this.session.connection.connectionId) {
        log.info('Chat: remote user has connected to chat');
        this.remoteConnection = event.connection;
      }
    },

    connectionDestroyed: function(event) {
      log.info('Chat: connectionDestroyed');
      if (event.connection.connectionId === this.remoteConnection.connectionId) {
        log.info('Chat: remote user has left the chat, ending');
        this.end();
      } else {
        log.warn('Chat: connectionDestroyed but was not equal to remote user connection');
      }
    },

    verifyInvitationReady: function(done) {
      if (this.invitation.isReadyForChat()) {
        done();
      } else {
        this.invitation.getChatInfo(done, _.bind(this.errorHandler, this));
      }
    },

    verifyUserStatus: function(done) {
      if (this.localUser.get('status') === 'chatting') {
        done();
      } else {
        this.localUser.on('change:status', function waitForStatus(status) {
          if (status === 'chatting') {
            done();
            this.localUser.off('change:status', waitForStatus);
          }
        }, this);
      }
    },

    errorHandler: function() {
      log.error('Chat: an error occurred, chat ending');
      this.end();
    }

  });

}(window));
