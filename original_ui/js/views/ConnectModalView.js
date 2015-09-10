/* -----------------------------------------------------------------------------------------------
 * Connect Modal View
 * ----------------------------------------------------------------------------------------------*/
/* global Backbone, _, log, alert */
/* exported ConnectModalView */

// Prevent leaking into global scope
!(function(exports, undefined) {

  exports.ConnectModalView = Backbone.View.extend({

    events: {
      'shown.bs.modal': 'focusInput',
      'hidden.bs.modal': 'clearInputs',
      'submit #connect-form': 'connect',
      'click #connect-btn': 'connect'
    },

    _showDone: false,

    _waitingForShow: [],

    initialize: function(options) {
      if (!options.dispatcher) {
        log.error('ConnectModalView: initialize() cannot be called without a dispatcher');
        return;
      }
      options.dispatcher.once('presenceSessionReady', this.presenceSessionReady, this);

      this.listenTo(this.model, 'change:status', this.userStatusChanged);
      this.listenTo(this.model, 'invalid', this.validationFailed);
      this.listenTo(this.model, 'error', this.saveFailed);
    },

    connect: function(event) {
      log.info('ConnectModalView: connect');
      event.preventDefault();

      if (!this.presenceSession) {
        log.warn('ConnectModalView: ignoring connect() because presenceSession is not initialized');
        return;
      }

      this.disableInputs();
      this.resetValidation();

      this.model.save(this.serializeForm());
    },

    userStatusChanged: function(user, status) {
      if (status === 'online') {
        this.hide();
      }
    },

    validationFailed: function(user, errors) {
      log.warn('ConnectModalView: validationFailed');
      _.each(errors, function(error) {
        var group = this.$form.find('[name=\'user['+error.attribute+']\']').parents('.form-group');
        group.addClass('has-error');
        group.append('<p class="help-block">'+error.reason+'</p>');
      }, this);
      this.enableInputs();
    },

    saveFailed: function(user, xhr) {
      log.error('ConnectModalView: saveFailed', xhr);
      alert('Server error, please try again later: ' + xhr.textStatus);
      this.enableInputs();
    },

    show: function() {
      log.info('ConnectModalView: show');

      // DOM queries
      this.$form = this.$('#connect-form');
      this.$connectButton = this.$('#connect-btn');
      this._showDone = true;

      // We might need to queue again whatever stalled because this wasn't done
      this._waitingForShow.forEach(setTimeout);
      this._waitingForShow = [];

      // Delegate to bootstrap plugin
      this.$el.modal('show');
    },

    hide: function() {
      log.info('ConnectModalView: hide');
      this.$el.modal('hide');
    },

    focusInput: function() {
      this.$form.find(':input').first().focus();
    },

    clearInputs: function() {
      this.$form[0].reset();
    },

    disableInputs: function() {
      this.$form.find(':input').prop('disabled', true);
      this.$connectButton.button('loading');
    },

    enableInputs: function() {
      this.$form.find(':input').prop('disabled', false);
      this.$connectButton.button('reset');
    },

    serializeForm: function() {
      return {
        name: this.$form.find('[name=\'user[name]\']').val()
      };
    },

    resetValidation: function() {
      var groups = this.$form.find('.has-error');
      groups.find('.help-block').remove();
      groups.removeClass('has-error');
    },

    presenceSessionReady: function(presenceSession) {
      if (!this._showDone) {
        // Just queue ourselves for when show is done
        this._waitingForShow.
          push(this.presenceSessionReady.bind(this, presenceSession));
        return;
      }
      this.presenceSession = presenceSession;
      // Now that a presence session exists, enable the form
      this.$connectButton.prop('disabled', false);
      this.$connectButton.text('Connect');
    }
  });

}(window));
