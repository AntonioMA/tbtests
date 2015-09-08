/* -----------------------------------------------------------------------------------------------
 * User Info View
 * ----------------------------------------------------------------------------------------------*/
/* global jQuery, Backbone, _, log */
/* exported UserInfoView */

// Prevent leaking into global scope
!(function(exports, $, undefined) {

  exports.UserInfoView = Backbone.View.extend({

    tagName: 'p',
    className: 'navbar-text',

    initialize: function() {
      this.listenTo(this.model, 'change', this.render);
    },

    template: _.template($('#tpl-user-info').html()),

    render: function() {
      log.info('UserInfoView: render');
      this.$el.html(this.template(this.model.attributes));
      return this;
    },
  });

}(window, jQuery));
