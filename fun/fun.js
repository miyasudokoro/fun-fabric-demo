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
        }
    };

    global.fun = fun;
})(typeof exports !== 'undefined' ? exports : this);