(function(global) {
  var fabric = global.fabric || (global.fabric = {});

  if (fabric.FText) {
    fabric.warn('fabric.FText is already defined.');
    return;
  }

  fabric.FText = fabric.util.createClass(fabric.Textbox, /** @lends fabric.FText.prototype */ {
    
    type: 'fText', //note: the type must be defined using camelCase to match the class name
    
    /**
     * FText class
     * @constructs fabric.FText
     * @param options {object} options for initialization
     */
    initialize: function(options) {
      this.callSuper('initialize', options.text, options);
    }
  });
  
  /**
   * Returns fabric.FText instance from an object representation
   * @static
   * @memberOf fabric.FText
   * @param {Object} object Object to create an instance from
   * @param {Function} [callback] Callback to invoke when an fabric.FText instance is created
   */
  fabric.FText.fromObject = function(object, callback) {
    return fabric.Object._fromObject('FText', object, callback);
  };
})(typeof exports !== 'undefined' ? exports : this);