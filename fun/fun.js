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
            //Make the interactive canvas
            this._initializeCanvas();
        },

        /** Sets up this.canvas and starts listeners.
         * @private
         */
        _initializeCanvas: function () {
            //Create a fabric.Canvas instance using the ID from the view
            var canvasID = view.getCanvasID();
            this.canvas = new fabric.Canvas(canvasID);
        }
    };

    global.fun = fun;
})(typeof exports !== 'undefined' ? exports : this);