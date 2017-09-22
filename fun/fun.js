(function (global) {
    var fabric = global.fabric,
        view = global.view;

    /** @const FULL_SIZE {object} the size of the canvas */
    var FULL_SIZE = {width: 1600, height: 1200};

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
            view.addButton(GET.TOOLS, 'Rect', this.createObject.bind(this, 'Rect', {
                width: 300,
                height: 300
            }));
            view.addButton(GET.TOOLS, 'Circle', this.createObject.bind(this, 'Circle', {
                radius: '150'
            }));

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
        },

        /** Sets event listeners for canvas events.
         * @private
         */
        _setCanvasEventListeners: function () {
            //Updates the inputs after a selection is made via dragging a selection box
            this.canvas.on('selection:created', view.updateInputs.bind(view, this));
            //Updates the inputs after selecting object(s)
            this.canvas.on('object:selected', view.updateInputs.bind(view, this));
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
            return this.canvas.getActiveObject();
        },

        /** Returns the active objects as an array.
         *
         * @returns {[fabric.Object]} array of current active objects
         */
        getActiveObjects: function () {
            return this.canvas.getActiveObjects();
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
            //Create the new object
            var fob = new fabric[type](options);
            //Load the object on the canvas
            this.addObjectToCanvas(fob);
        },

        /** Adds an object to the canvas.
         * @param fob {fabric.Object} the the fabric object to add
         */
        addObjectToCanvas: function (fob) {
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
        }
    };

    global.fun = fun;
})(typeof exports !== 'undefined' ? exports : this);