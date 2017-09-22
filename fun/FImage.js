(function (global) {
    var fabric = global.fabric || (global.fabric = {}),
        filterManager = global.filterManager;

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
            },
            
            
            /***** filters ****************************************************/

            /** Sets or updates a filter on this image.
             * @param type {string} type of image filter
             * @param on {boolean} true to turn it on, false to turn it off
             */
            setFilter: function (type, on) {
                var filter,
                    changed = false,
                    index = this.findFilterIndex(type);

                if (index > -1) {
                    //set current filter
                    filter = this.filters[index];
                    //remove it (even if filter is on, because order of filters matters)
                    this.filters.splice(index, 1);
                    //If turning off the filter, a change has occurred
                    changed = !on;
                }

                if (on) {
                    if (!filter) {
                        //Make a new filter of this type
                        filter = filterManager.createFilter(type);
                    }
                    var newIndex = this.filters.length;
                    //Put it at the end of the list of filters
                    this.filters.push(filter);
                    //If the filter has moved or is new, a change has occurred
                    changed = newIndex !== index;
                }

                //Apply and notify if a change occurred
                changed && this._applyFiltersAndNotify();
            },

            /** Sets the property on the filter.
             * @param type {string} type of the filter
             * @param property {string} property to set
             * @param value {*} value to set
             */
            setFilterProperty: function (type, property, value) {
                var filter = this.filters[this.findFilterIndex(type)];
                if (filter && filter[property] !== value) {
                    filter[property] = value;
                    this._applyFiltersAndNotify();
                }
            },

            /** Returns the value of the property of the applied filter.
             * @param type {string} type of the filter
             * @param property {string} property to get
             * @returns {*|undefined} value of the property, if any
             */
            getFilterProperty: function (type, property) {
                var filter = this.filters[this.findFilterIndex(type)];
                return filter && filter[property];
            },

            /** Returns true if the filter is active on this image.
             * @param type {string} the type of the filter
             * @returns {boolean}
             */
            isFilterOn: function (type) {
                return this.findFilterIndex(type) > -1;
            },

            /** Finds index of a filter of the given type.
             * @param type {string} type of the filter
             * @returns {number} index of filter
             */
            findFilterIndex: function (type) {
                for (var i = this.filters.length; i--; ) {
                    if (this.filters[i].type === type) {
                        return i;
                    }
                }
                return -1;
            },

            /** Applies the filters to this image and notifies app they have changed.
             */
            _applyFiltersAndNotify: function () {
                //Apply the filters on this image
                this.applyFilters();
                //Fire change event
                this.fire('changed');
                this.canvas && this.canvas.fire('object:changed',
                    {target: this, key: 'filters'}
                );
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