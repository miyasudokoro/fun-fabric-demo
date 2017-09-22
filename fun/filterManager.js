(function (global) {
    var fabric = global.fabric;

    /**
     * @exports filterManager
     * @description Manages fabricJS filters.
     */
    var filterManager = {
        controls: {
            BlendColor: {
                color: {
                    type: 'color',
                    label: 'Blend color'
                },
                alpha: {
                    type: 'range',
                    label: 'Blend alpha',
                    attrs: {min: 0.0, max: 1.0, step: 0.01}
                },
                mode: {
                    type: 'select',
                    label: 'Blend mode',
                    attrs: {
                        options: Object.keys(fabric.Image.filters.BlendColor.prototype.fragmentSource)
                    }
                }
            },
            Blur: {
                blur: {
                    type: 'range',
                    label: 'Blur range',
                    attrs: {min: 0.0, max: 1.0, step: 0.01}
                }
            },
            Brightness: {
                brightness: {
                    type: 'range',
                    label: 'Bright. range',
                    attrs: {min: -1, max: 1, step: 0.01}
                }
            },
            Contrast: {
                contrast: {
                    type: 'range',
                    label: 'Cont. range',
                    attrs: {min: -1, max: 1, step: 0.01}
                }
            },
            Noise: {
                noise: {
                    type: 'range',
                    label: 'Noise range',
                    attrs: {min: 0, max: 1000, step: 1}
                }
            },
            Pixelate: {
                blocksize: {
                    type: 'range',
                    label: 'Pixel. size',
                    attrs: {min: 2, max: 20, step: 1}
                }
            },
            RemoveColor: {
                color: {
                    type: 'color',
                    label: 'Remove color'
                },
                distance: {
                    type: 'range',
                    label: 'Remove distance',
                    attrs: {min: 0, max: 1, step: 0.01}
                }
            },
            Saturation: {
                saturation: {
                    type: 'range',
                    label: 'Sat. range',
                    attrs: {min: -1, max: 1, step: 0.01}
                }
            }
        },

        /** Collects filters from the fabric library.
         */
        init: function () {
            this.filters = {};

            //The filters in this array will not be displayed
            var notUsed = ['BaseFilter', 'ColorMatrix', 'Convolute', //abstract filter types
                'Composed',     //used to combine multiple filters into one filter
                'Resize',       //used for better display of scaled images; put in property resizeFilter, not in filters array
                'BlendImage',   //requires a separate fabric.Image object to blend with and is still a work in progress
                'Gamma'         //excluded because I don't want to set up controls to set each value in the gamma array
            ];

            //get existing filters
            var types = Object.keys(fabric.Image.filters);

            //remove abstract and special filters
            types = types.filter(function (n) {
                return notUsed.indexOf(n) === -1;
            });

            //alphabetical order
            types.sort();

            for (var i = 0; i < types.length; i++) {
                var type = types[i],
                    proto = fabric.Image.filters[type].prototype,
                    settings = {},
                    control = filterManager.controls[type];

                if (control) {
                    for (var property in control) {
                        if (typeof proto[property] !== 'undefined') {
                            //set the initial values from the prototype's defaults
                            settings[property] = proto[property];
                        } else if (control.type === 'range') {
                            //set the initial values from the range
                            settings[property] = (control.attrs.min + control.attrs.max) / 2;
                        } else if (control.type === 'select') {
                            //set the initial value to the first option
                            settings[property] = control.attrs.options[0];
                        } else if (control.type === 'color') {
                            //set a default color
                            settings[property] = '#F95C63';
                        }
                    }
                }
                filterManager.filters[type] = settings;
            }
        },

        /** Creates a filter of the given type using the values saved in this.
         * @param type {string} type of filter
         * @returns {fabric.Image.filters.BaseFilter} image filter object
         */
        createFilter: function (type) {
            return new fabric.Image.filters[type](this.filters[type]);
        },

        /** Sets the value of the property on the filter settings of the given type.
         *
         * @param type {string} type of filter
         * @param property {string} property to set
         * @param value {*} value to set for property
         */
        setFilterProperty: function (type, property, value) {
            this.filters[type] && (this.filters[type][property] = value);
        },

        /** Makes an array of filter values to apply.
         * @param options {object} options from input values
         * @returns {[object]} array of filters to apply
         */
        collectInputValues: function (options) {
            var filters = [];
            for (var property in options) {
                if (this.filters[property] && options[property]) {
                    var settings = this.filters[property],
                        opts = {
                            type: property
                        };
                    if (settings) {
                        for (var prop in settings) {
                            opts[prop] = settings[prop];
                        }
                    }
                    filters.push(opts);
                }
            }
            return filters;
        }
    };

    filterManager.init();

    global.filterManager = filterManager;
})(typeof exports !== 'undefined' ? exports : this);