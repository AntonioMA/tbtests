/* -----------------------------------------------------------------------------------------------
 * Remote User Model
 * ----------------------------------------------------------------------------------------------*/
/* global Backbone, _, log */
/* exported RemoteUser */

// Prevent leaking into global scope
!(function(exports, undefined) {

  exports.RemoteUser = Backbone.Model.extend({

    defaults: {
      name: null,
      status: 'online',
      // NOTE: this is a derived property but it makes templating easier
      available: true
    },

    // NOTE: 'offline' isn't a status the remote user object would be removed
    allStatuses: ['online', 'unavailable'],

    // NOTE: explicitly stating the available statuses allows more 'available' or 'unavailable'
    // statuses to be defined later
    availableStatuses: ['online'],

    initialize: function(attrs, options) {
      if (!options.presenceSession) {
        throw Error('Remote user cannot be initialized without a presence session');
      }
      this.presenceSession = options.presenceSession;

      if (!options.connection) {
        throw Error('Remote user cannot be initialized without a connection');
      }
      this.connection = options.connection;

      var connectionData = JSON.parse(this.connection.data);
      this.set('name', connectionData.name);

      this.presenceSession.on('signal:' + this.connection.connectionId + '~status',
                              this.remoteStatusUpdated,
                              this);
      this.on('change:status', this.statusChanged, this);
    },

    statusChanged: function(self, status) {
      log.info('RemoteUser: statusChanged', status);
      this.set('available', _.include(this.availableStatuses, status));
    },

    remoteStatusUpdated: function(event) {
      log.info('RemoteUser: remoteStatusUpdated', event);
      this.set('status', event.data);
    }
  });

}(window));
