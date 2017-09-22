(function (global) {
    var fabric = global.fabric || (global.fabric = {});

    if (fabric.FImage) {
        fabric.warn('fabric.FImage is already defined.');
        return;
    }

    fabric.FImage = fabric.util.createClass(fabric.Image, /** @lends fabric.FImage.prototype */ {

            type: 'fImage', //note: the type must be defined using camelCase to match the class name

            /**
             * FImage class
             * @constructs fabric.FImage
             * @param options {object} options for initialization
             */
            initialize: function (options) {
                //we will asynchronously load after creating an HTMLImageElement from the string src
                fabric.util.loadImage(options.src, function(img, error) {
                    if (error) {
                        this._onLoadError(e);
                    } else {
                        try {
                            this._onLoadComplete(options, img);
                        } catch (e) {
                            this._onLoadError(e);
                        }
                    }
                }.bind(this), null, options.crossOrigin);
            },

            /** Handles the correct load of the HTMLImageElement.
             * @see fabric.Image.fromObject for the basis of this code
             * @param options {object} the options on initialization or undo/redo
             * @param img {HTMLImageElement}
             * @private
             */
            _onLoadComplete: function (options, img) {
                //set image filters, if any
                this._initFilters(options.filters, function(filters) {
                    options.filters = filters || [];

                    //set resize filter, if any
                    this._initFilters([options.resizeFilter], function(resizeFilters) {
                        options.resizeFilter = resizeFilters[0];

                        //call the fabric.Image loading code, which puts the options into this
                        this.callSuper('initialize', img, options);
                        //scale if needed
                        this.scaleLessThanMaxSize(options.maxSize);
                        //reset the coords for mouse events
                        this.setCoords();

                        //fire the custom 'load' event
                        this.fire('load');
                        this.canvas && this.canvas.fire('image:load', {target: this});
                    }.bind(this));
                }.bind(this));
            },

            /** Handles the incorrect load of the HTMLImageElement.
             *
             * @param error {Error}
             * @private
             */
            _onLoadError: function (error) {
                console.error(error);
                //fire the custom 'error' event
                this.fire('error');
                this.canvas && this.canvas.fire('image:error', {target: this});
            },

            /** Scales to less than the given max size if it is greater than the max size in either dimension.
             * This is needed when the image is added so the resize controls will be reachable.
             *
             * @param maxSize {{width: number, height: number}}
             */
            scaleLessThanMaxSize: function (maxSize) {
                if(maxSize && (this.width > maxSize.width || this.height > maxSize.height)) {
                    //to keep the image completely visible, use the smaller ratio
                    var scale = Math.min(maxSize.width / this.width, maxSize.height / this.height);
                    this.set('scaleY',scale);
                    this.set('scaleX',scale);
                }
            }
        });

    /**
     * Indicates that instances of this type are async
     * @static
     * @type Boolean
     * @default
     */
    fabric.FImage.async = true;

    /**
     * Creates an instance of fabric.FImage from its object representation
     * @static
     * @param {Object} object Object to create an instance from
     * @param {Function} callback Callback to invoke when an image instance is created
     */
    fabric.FImage.fromObject = function (object, callback) {
        return fabric.Object._fromObject('FImage', object, callback);
    };

})(typeof exports !== 'undefined' ? exports : this);