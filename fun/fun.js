(function (global) {
    var fabric = global.fabric,
        view = global.view,
        filterManager = global.filterManager;

    /** @const FULL_SIZE {object} the size of the canvas */
    var FULL_SIZE = {width: 1600, height: 1200};
    /** @const BRUSHES {object} the available brushes */
    var BRUSHES = {
        OFF: 'Off',
        PENCIL: 'Pencil',
        CIRCLE: 'Circle',
        SPRAY: 'Spray',
        PATTERN: 'Pattern'
    };

    /**
     * @exports fun
     * @description Demo application runner.
     */
    var fun = {

        /***** initialization *****************************************************/

        /** Initializes the demo application. */
        start: function () {
            //Puts buttons and inputs in view
            this._putInputsInView();

            //Make the interactive canvas
            this._initializeCanvas();

            //Set canvas size
            this._initializeZoom();
            
            //Set up event listeners for canvas events
            this._setCanvasEventListeners();

            //Set event listeners on the document
            this._setDocumentEventListeners();

            //Creates handler for image file chooser
            this._prepareFileReader();

            //Make the static preview canvas
            this._initializePreview();
        },

        /** Sets up this.canvas and starts listeners.
         * @private
         */
        _initializeCanvas: function () {
            //Create a fabric.Canvas instance using the ID from the view
            var canvasID = view.getCanvasID();
            this.canvas = new fabric.Canvas(canvasID);
        },

        /** Creates inputs and buttons with event handlers.
         * @private
         */
        _putInputsInView: function () {
            var GET = view.GET;

            view.addLink(GET.ACTIONS, 'Download', this.setDownloadURL.bind(this), {
                'download': 'Download'
            });
            view.addButton(GET.ACTIONS, 'Preview', this.updatePreviewImage.bind(this), 1);
            view.addInlineInput(GET.ACTIONS, 'range', 'Zoom', 'zoom', 1,
                this.zoom.bind(this), {
                    min: 0.1, max: 4, step: 0.1
                });
            
            view.addButton(GET.ACTIONS, 'To front',
                this.callCanvasFunction.bind(this, 'bringToFront'));
            view.addButton(GET.ACTIONS, 'To back',
                this.callCanvasFunction.bind(this, 'sendToBack'));
            view.addButton(GET.ACTIONS, 'Forward',
                this.callCanvasFunction.bind(this, 'bringForward'));
            view.addButton(GET.ACTIONS, 'Backward',
                this.callCanvasFunction.bind(this, 'sendBackwards'));

            view.addButton(GET.ACTIONS, 'Remove',
                this.removeActiveObjects.bind(this));
            view.addButton(GET.ACTIONS, 'Deselect', function () {
                this.canvas.discardActiveObject();
                this.canvas.renderAll();
            }.bind(this));
            
            //Add objects row
            view.addInlineInput(GET.TOOLS, 'file', 'Image', 'image', '',
                this.readImage.bind(this), {}, 3);
            view.addButton(GET.TOOLS, 'Rect', this.createObject.bind(this, 'Rect', {
                width: 300,
                height: 300
            }));
            view.addButton(GET.TOOLS, 'Circle', this.createObject.bind(this, 'Circle', {
                radius: '150'
            }));
            view.addButton(GET.TOOLS, 'Text', this.createObject.bind(this, 'FText', {
                text: 'text'
            }));

            //Free drawing row
            view.addRadios(GET.DRAW, 'Draw', Object.values(BRUSHES), BRUSHES.OFF,
                this.setFreeDrawing.bind(this), {
                    'data-get': 'getFreeDrawing'
                });

            //Controls in left column
            view.addRowInput(GET.CONTROLS, 'color', 'Fill color', 'fill', '#00ff00',
                this.set.bind(this, 'fill'));
            view.addRowInput(GET.CONTROLS, 'range', 'Line width', 'strokeWidth', 1,
                this.set.bind(this, 'strokeWidth'), {
                    min: 0, max: 20, step: 1
                });
            view.addRowInput(GET.CONTROLS, 'color', 'Line color', 'stroke', '#0000ff',
                this.set.bind(this, 'stroke'));
            view.addRowInput(GET.CONTROLS, 'range', 'Opacity', 'opacity', 1.0,
                this.set.bind(this, 'opacity'), {
                    min: 0.0, max: 1.0, step: 0.1
                });
                
            view.addRowInput(GET.CONTROLS, 'select', 'Font', 'fontFamily', 'Arial',
                this.set.bind(this, 'fontFamily'), {
                    options: ['serif', 'sans-serif', 'cursive', 'monospace', 'Arial',
                        'Arial Black', 'Courier New', 'Georgia', 'Impact', 'Lucida Console',
                        'Tahoma', 'Times New Roman']
                });
            view.addRowInput(GET.CONTROLS, 'number', 'Font size', 'fontSize', 100,
                this.set.bind(this, 'fontSize'), {
                    min: 4, max: 400, step: 0.5
                });
            view.addText(GET.CONTROLS, 'Image filters:');

            for (var type in filterManager.filters) {
                view.addRowInput(GET.CONTROLS, 'checkbox', type, type, type,
                    this.setFilter.bind(this, type), {
                        'data-get': 'isFilterOn'
                    }
                );
                var controls = filterManager.controls[type];
                if (controls) {
                    for (var property in controls) {
                        var settings = controls[property],
                            attrs = settings.attrs || {},
                            label = settings.label || type + ' ' + property;

                        attrs['data-get'] = 'getFilterProperty';
                        view.addRowInput(GET.CONTROLS, settings.type, label,
                            type + '_' + property,
                            filterManager.filters[type][property],
                            this.setFilterProperty.bind(this, type, property),
                            attrs);
                    }
                }
            }
        },

        /** Sets event listeners for canvas events.
         * @private
         */
        _setCanvasEventListeners: function () {
            //Updates the inputs after a selection is made via dragging a selection box
            this.canvas.on('selection:created', view.updateInputs.bind(view, this));
            //Updates the inputs after selecting object(s)
            this.canvas.on('object:selected', view.updateInputs.bind(view, this));
            //Renders the canvas after a change
            this.canvas.on('object:changed', this.canvas.renderAll.bind(this.canvas));
        },

        /** Sets event listeners on the document.
         * @private
         */
        _setDocumentEventListeners: function () {
            //Prevent drag-drop from loading file
            document.addEventListener('dragover', function (event) {
                event.preventDefault();
            });
            //Add image or text object on paste or drag-drop
            var handleDataTransfer = this.handleDataTransfer.bind(this);
            document.addEventListener('paste', handleDataTransfer);
            document.addEventListener('drop', handleDataTransfer);
        },
        
        
        /***** zoom ***************************************************************/

        /** Sets the canvas size and initializes zoom feature.
         * @private
         */
        _initializeZoom: function () {
            //Size the canvas based on the view
            this.fitToWidth();
            //When view resizes, redo fit-to-width responsively
            view.watchForResize(this.fitToWidth.bind(this));
        },

        /** Zooms to the available width. */
        fitToWidth: function () {
            //Get the level to reset to
            var previousLevel = view.getValueFor('zoom');
            //Get the width of the container to fit to
            var width = view.getCanvasContainerWidth();
            //Get the level that fits the width in the container (max: 1)
            var level = Math.min(1, width / FULL_SIZE.width);

            //Set the baseline for 100% in zoom control
            this._baselineZoom = level;

            //Set the zoom again
            this.zoom(previousLevel);
        },

        /** Sets zoom to the given percent, adjusted for baseline.
         * @param level {number|Event} the level (1.0 = 100%)
         */
        zoom: function (level) {
            level = view.getEventValue(level);
            //Finds the zoom based on what the baseline 100% is
            level = (this._baselineZoom || 1) * level;
            //Sets the zoom from the adjusted level
            this._setZoom(level);
            //Adjust the view if needed
            view.adjustCanvasContainer();
        },

        /** Sets the zoom to the given decimal, not adjusted for baseline.
         * @param level {number} the level (1.0 = 100%)
         */
        _setZoom: function (level) {
            //Set the dimensions based on the level
            this.canvas.setDimensions({
                width: FULL_SIZE.width * level,
                height: FULL_SIZE.height * level
            });

            //Set the zoom on the canvas from top left
            this.canvas.setZoom(level);

            //Adjust the coordinate system for the new zoom size
            this.canvas.calcOffset();
            //Render the changes
            this.canvas.renderAll();
        },

        /** An alternate zoom function without change of dimensions.
         * @param level {number} the zoom level (1.0 = 100%)
         */
        _setZoomWithoutDimensionChange: function (level) {
            //Find point to zoom to
            var active = this.getActive(),
                point;
            if (active) {
                //zoom attempting to keep active object(s) in view
                point = active.getCenterPoint();
            } else {
                //zoom to center of canvas
                point = new fabric.Point(this.canvas.width / 2, this.canvas.height / 2);
            }
            //Set the zoom on the canvas from point
            this.canvas.zoomToPoint(point, level);
            //Adjust the coordinate system for the new zoom size
            this.canvas.calcOffset();
            //Render the changes
            this.canvas.renderAll();
        },

        
        /***** objects on canvas **************************************************/

        /** Calls the canvas function of the given name with the active object(s)
         * as the parameter.
         * @param fnName {string} name of canvas function to call
         */
        callCanvasFunction: function (fnName) {
            this.canvas[fnName](this.getActive());
        },
        
        /** Gets the active object or selection of objects on the canvas.
         * @returns {fabric.Object}
         */
        getActive: function () {
            return this.canvas.isDrawingMode
                ? this.canvas.freeDrawingBrush
                : this.canvas.getActiveObject();
        },

        /** Returns the active objects as an array.
         *
         * @returns {[fabric.Object]} array of current active objects
         */
        getActiveObjects: function () {
            return this.canvas.isDrawingMode
                ? [this.canvas.freeDrawingBrush]
                : this.canvas.getActiveObjects();
        },

        /** Removes the active objects from the canvas.
         */
        removeActiveObjects: function () {
            //get the active objects
            var fobs = this.getActiveObjects();
            //discard the selection
            this.canvas.discardActiveObject();
            //remove all the objects by applying them (canvas.remove takes varargs any number of objects)
            this.canvas.remove.apply(this.canvas, fobs);
        },

        /** Creates a new object of the given type.
         * @param type {string} the fabric type to create
         * @param options {object} the initial values on creation
         */
        createObject: function (type, options) {
            //Get the values out of the inputs to set on the new object
            options = view.collectInputValues(options);
            //Collect image filters from the values if filters can be set
            if (fabric[type].prototype.setFilter) {
                options.filters = filterManager.collectInputValues(options);
            }
            //Set the maximum size (used for automatically resizing images)
            options.maxSize = FULL_SIZE;
            //Create the new object
            var fob = new fabric[type](options);
            
            if (fabric[type].async) {
                //Listen for our custom events "load" and "error"
                fob.on('load', this.addObjectToCanvas.bind(this, fob));
                fob.on('error', function () {
                    alert('Failed to load image')
                });
            } else {
                //Load the object on the canvas immediately
                this.addObjectToCanvas(fob);
            }
        },

        /** Adds an object to the canvas.
         * @param fob {fabric.Object} the the fabric object to add
         */
        addObjectToCanvas: function (fob) {
            //Turn off free drawing mode if it is on
            this.setFreeDrawing(BRUSHES.OFF);
            //Add the object to the canvas
            this.canvas.add(fob);
            //Center the object; use viewportCenter in case canvas is zoomed or clipped
            fob.viewportCenter();
            //Set the coordinates of the object so mouse events will work
            //Use this every time you change an object's location or dimensions using code rather than mouse events
            fob.setCoords();
            //Make the new object the selected object
            this.canvas.setActiveObject(fob);
        },

        /** Sets the value for the property on the selected objects.
         * @param property {string} the property to set
         * @param value {*|Event} the value to set
         */
        set: function (property, value) {
            value = view.getEventValue(value);
            if (typeof value !== 'undefined' && value !== null) {
                //Get the active object(s)
                var fobs = this.getActiveObjects();
                if (fobs && fobs.length > 0) {
                    for (var i = fobs.length; i--; ) {
                        fobs[i].set(property, value);
                    }
                    //Render after setting the property
                    this.canvas.requestRenderAll();
                }
            }
        },

        /** Gets the value for the property from the selected objects.
         * @param property {string} the property to get
         */
        get: function (property) {
            //Get the active object(s)
            var fobs = this.getActiveObjects();
            if (fobs && fobs.length > 0) {
                for (var i = 0; i < fobs.length; i++) {
                    var response = fobs[i].get(property);
                    if (typeof response !== 'undefined' && response !== null) {
                        return response;
                    }
                }
            }
        },

        /** Calls the function with the given arguments on the selected objects.
         * @param fnName {string} the function to call
         * @param args {Array} arguments to apply
         * @returns {*} result of function, if any (first result if activeSelection)
         */
        call: function (fnName, args) {
            var fobs = this.getActiveObjects(),
                response;
            if (fobs && fobs.length > 0) {
                for (var i = fobs.length ; i--; ) {
                    var fob = fobs[i];
                    if (typeof fob[fnName] === 'function') {
                        var r = fob[fnName].apply(fob, args);
                        if (typeof response === 'undefined' || response === null) {
                            //in a activeSelection, respond with the first object's response
                            response = r;
                        }
                    }
                }
            }
            return response;
        },


        /***** free drawing ***************************************************************/

        /** Returns what brush is currently selected.
         *
         * @returns {string} one of the values in BRUSHES
         */
        getFreeDrawing: function (brush) {
            if(this.canvas.isDrawingMode && this.canvas.freeDrawingBrush) {
                return this.canvas.freeDrawingBrush.name === brush;
            }
            return BRUSHES.OFF === brush;
        },

        /** Toggles free drawing on and off and sets which brush.
         * @param brush {string|Event} the name of the brush to use
         */
        setFreeDrawing: function (brush) {
            brush = view.getEventValue(brush);
            if (brush === BRUSHES.OFF) {
                this.canvas.isDrawingMode = false;
            } else {
                this.canvas.discardActiveObject();
                this.canvas.requestRenderAll();
                this.brushes = this.brushes || {};

                if (!this.brushes[brush]) {
                    this.brushes[brush] = new fabric[brush + 'Brush'](this.canvas);
                    //Create the _set function for the brush
                    this.brushes[brush].set = function (property, value) {
                        if (property === 'stroke') this.color = value;
                        else if (property === 'strokeWidth') this.width = value;
                        else this[property] = value;
                    };
                    //Create the get function for the brush
                    this.brushes[brush].get = function (property) {
                        if (property === 'stroke') return this.color;
                        if (property === 'strokeWidth') return this.width;
                        return this[property];
                    };
                    //Set the name so we know which one is selected
                    this.brushes[brush].name = brush;
                }
                this.brushes[brush].color = view.getValueFor('stroke');
                this.brushes[brush].width = view.getValueFor('strokeWidth');

                this.canvas.freeDrawingBrush = this.brushes[brush];
                this.canvas.isDrawingMode = true;
            }
        },


        /***** image **********************************************************/

        /** Prepares the file reader for image file chooser.
         * @private
         */
        _prepareFileReader: function () {
            this.reader = new FileReader();
            this.reader.addEventListener("loadend", function (event) {
                this.createObject('FImage', {src: event.target.result});
            }.bind(this));
        },

        /** Reads the image info out of the file chooser event.
         * @param event {Event}
         */
        readImage: function (event) {
            this.reader.readAsDataURL(event.target.files[0]);
        },

        /** Handles paste and drag-drop by creating new objects.
         * @param event {Event}
         */
        handleDataTransfer: function (event) {
            event = event.originalEvent || event;
            event.preventDefault();
            var data = event.clipboardData || event.dataTransfer;
            if (data) {
                var items = data.items,
                    foundImage,
                    foundText;
                if (items && items.length > 0) {
                    for (var i = 0; i < items.length; i++) {
                        if (items[i].kind === 'file' && items[i].type.indexOf("image") > -1) {
                            foundImage = items[i];
                        } else if (items[i].kind === 'string') {
                            foundText = items[i];
                        }
                    }
                }
                if (foundImage) {
                    var blob = foundImage.getAsFile();
                    var URLObj = window.URL || window.webkitURL;
                    var source = URLObj.createObjectURL(blob);
                    this.createObject('FImage', {src: source});
                } else if (foundText) {
                    foundText.getAsString(function (text) {
                        text && this.createObject('FText', {text: text});
                    }.bind(this));
                }
            }
        },


        /***** image filters **************************************************/

        /** Toggles the filter on or off for the current selected images(s) and for
         * when creating new images.
         *
         * @param type {string} type of filter
         * @param bool {boolean} true to turn on, false to turn off
         */
        setFilter: function (type, bool) {
            bool = view.getEventValue(bool);
            this.call('setFilter', [type, bool]);
        },

        /** Sets the value of the property on the filter of the given type, for both
         * the current selected image(s) and the settings when creating new image
         * filters.
         *
         * @param type {string} type of filter
         * @param property {string} property to set
         * @param value {*} value to set for property
         */
        setFilterProperty: function (type, property, value) {
            value = view.getEventValue(value);
            if (typeof value !== 'undefined') {
                //Set it in the filter settings
                filterManager.setFilterProperty(type, property, value);
                //Set it in active image objects
                this.call('setFilterProperty', [type, property, value]);
            }
        },

        /** Returns the value of the property represented in the given id.
         * @param id {string} id in view, with format type_property
         * @returns {*} value of property
         */
        getFilterProperty: function (id) {
            var sp = id.split('_'),
                type = sp[0],
                property = sp[1];

            var value = this.call('getFilterProperty', [type, property]);
            return typeof value === 'undefined'
                ? filterManager.filters[type][property]
                : value;
        },

        /** Returns true if the given filter is on for a selected image.
         * @param type {string} the type of filter
         * @returns {boolean}
         */
        isFilterOn: function (type) {
            return this.call('isFilterOn', [type]);
        },
        
        
        /***** download *******************************************************/
        
        /** Downloads the image of the canvas.
         * @param event {Event} the click event
         * @private
         */
        setDownloadURL: function (event) {
            //Put the image data into the link so it will be downloaded
            event.target.href = this._getImageData();
        },

        /** Return the canvas image data.
         * @param asData {boolean} true if we want the raw data array
         * @returns {string}
         * @private
         */
        _getImageData: function (asData) {
            var data;

            //Hide selection border and controls so we will get only the desired content
            this._toggleControls(false);
            //Get the current zoom
            var zoom = this.canvas.getZoom();
            //Set to actual size and re-render
            this._setZoom(1);

            //Get the size of detected edges
            var edges = this._detectEdges();
            
            if (asData) {
                //Get context data, which we can write directly to another canvas
                var context = this.canvas.getContext();
                data = context.getImageData(edges.left, edges.top, edges.width, edges.height);
            } else {
                //Get data URL, which is a PNG snapshot of the canvas
                edges.format = 'png';
                data = this.canvas.toDataURL(edges);
            }

            //Restore the appearance of the selection
            this._toggleControls(true);
            //Restore the zoom and re-render
            this._setZoom(zoom);

            return data;
        },

        /** Toggles the controls and border of active object(s) on or off.
         *
         * @param bool {boolean} true for on, false for off
         * @private
         */
        _toggleControls: function (bool) {
            var active = this.getActive();
            if (active) {
                //Show / hide the square handles used for resize and rotate
                active.hasControls = bool;
                //Show / hide the selection border
                active.hasBorders = bool;
            }
        },

        /** Simple edge detection based on transparency.
         */
        _detectEdges: function () {
            var context = this.canvas.getContext(),
                imageData = context.getImageData(0, 0, this.canvas.width, this.canvas.height),
                //get the RGBA values of each pixel, starting at top left and going row after row: [r,g,b,a,r,g,b,a...]
                data = imageData.data,
                //this is the width of the image
                width = imageData.width,
                //this is the height of the image
                height = imageData.height,
                minX,
                maxX,
                minY,
                maxY;

            //Loop through the data array
            for (var x = 0; x < width; x++) {
                for (var y = 0; y < height; y++) {
                    //the index of the current pixel
                    var index = (y * width + x) * 4,
                        //the alpha value of the current pixel
                        alpha = data[index + 3];

                    //If not fully transparent, it is content
                    if (alpha > 1) {
                        //find the boundaries of the non-transparent pixels
                        if (typeof minX === 'undefined' || x < minX) minX = x;
                        if (typeof minY === 'undefined' || y < minY) minY = y;
                        if (typeof maxX === 'undefined' || x > maxX) maxX = x;
                        if (typeof maxY === 'undefined' || y > maxY) maxY = y;
                    }
                }
            }

            //Return the detected content area
            return {
                left: minX || 0,
                top: minY || 0,
                width: maxX - minX || 1,
                height: maxY - minY || 1
            };
        },
        
        
        /***** preview ********************************************************/
        
        /** Sets up this.preview.
         * @private
         */
        _initializePreview: function () {
            //Create a fabric.StaticCanvas instance using the ID from the view
            var canvasID = view.getPreviewID();
            this.preview = new fabric.StaticCanvas(canvasID);
            //Make checkerboard pattern to indicate transparency
            var pattern = this._makeCheckerboardPatternInstance();
            //Assign the pattern to the preview canvas background
            this.preview.setBackgroundColor(pattern,
                this.preview.renderAll.bind(this.preview));
        },

        /** Returns a checkerboard pattern.
         * @returns {fabric.Pattern}
         * @private
         */
        _makeCheckerboardPatternInstance: function () {
            //Make a repeatable checkerboard pattern canvas
            var patternSource = new fabric.StaticCanvas('', {width: 20, height: 20}),
                square = {
                    width: 10,
                    height: 10,
                    left: 0,
                    top: 0,
                    fill: '#888',
                    strokeWidth: 0,
                    opacity: 0.8
                };
            patternSource.add(new fabric.Rect(square));
            square.left = 10;
            square.top = 10;
            patternSource.add(new fabric.Rect(square));
            square.fill = '#CCC';
            square.top = 0;
            patternSource.add(new fabric.Rect(square));
            square.top = 10;
            square.left = 0;
            patternSource.add(new fabric.Rect(square));

            //Make a fabric pattern instance
            var pattern = new fabric.Pattern({
                source: function () {
                    return this.sourceCanvas.getElement();
                },
                repeat: 'repeat'
            });
            pattern.sourceCanvas = patternSource;

            return pattern;
        },

        /** Updates the image shown in the preview.
         */
        updatePreviewImage: function () {
            //Get the image data
            var data = this._getImageData(true);
            //Get the image object
            var image = this._getPreviewImage();
            //Get the internal element from the image
            var element = image.getElement();

            //Set the correct size from data.width and data.height
            element.width = data.width;
            element.height = data.height;
            image.width = data.width;
            image.height = data.height;
            this.preview.setDimensions({width: data.width, height: data.height});

            //Put the image data in the context of the element
            var context = element.getContext('2d');
            context.putImageData(data, 0, 0);

            //Render the preview
            this.preview.renderAll();
        },

        /** Gets the fabric image object with a canvas as its element.
         * @returns {fabric.Image}
         */
        _getPreviewImage: function () {
            //Get image object already in preview as first item
            var image = this.preview.item(0);
            if (!image) {
                image = new fabric.Image();
                //Create a canvas element for the fabric image
                var element = document.createElement('canvas');
                image.setElement(element);
                //Put the image in the preview
                this.preview.add(image);
            }
            return image;
        }
    };

    global.fun = fun;
})(typeof exports !== 'undefined' ? exports : this);