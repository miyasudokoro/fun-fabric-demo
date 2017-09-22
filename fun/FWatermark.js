(function (global) {
    var fabric = global.fabric || (global.fabric = {});

    if (fabric.FWatermark) {
        fabric.warn('fabric.FWatermark is already defined.');
        return;
    }

    fabric.FWatermark = fabric.util.createClass(fabric.Image, /** @lends fabric.FWatermark.prototype */ {

        type: 'fWatermark', //note: the type must be defined using camelCase to match the class name

        /**
         * FWatermark class
         * @constructs fabric.FWatermark
         * @param options {object} options for initialization
         */
        initialize: function (options) {
            options = options || {};

            //Set the internal static canvas
            this.staticCanvas = new fabric.StaticCanvas(null, options);

            //Make text object of watermark and put it in the internal canvas
            var text = new fabric.Text(options.text || '', {
                opacity: 0.5,
                stroke: 'black',
                strokeWidth: 1.5,
                fill: 'white',
                fontFamily: 'monospace'
            });
            this.staticCanvas.add(text);

            //Initialize fabric.Image functionality, with canvas element as image
            this.callSuper('initialize', this.staticCanvas.getElement(), options);
        },

        /** Returns the text object.
         * @returns {fabric.Text}
         */
        getTextObject: function () {
            //Return the first object in the static canvas: the text object
            return this.staticCanvas.item(0);
        },

        /** Sets the value of the text.
         * @param content {string} the text value
         * @param canvas {fabric.Canvas} the canvas containing this
         */
        setText: function (content, canvas) {
            canvas = canvas || this.canvas;
            //Set the content
            var fob = this.getTextObject();
            fob.set('text', content);
            this.text = content;
            //Update the display
            this._updateElement(canvas);
        },

        /** Sets the position of this on the canvas
         * @param edges {object} the top, left, width, and height values
         * @param canvas {fabric.Canvas} the canvas containing this
         */
        setPosition: function (edges, canvas) {
            canvas = canvas || this.canvas;
            if (this === canvas.overlayImage) {
                //Because overlayImage does not zoom, apply opposite of zoom to amounts
                var zoom = canvas.getZoom();
                edges.width /= zoom;
                edges.height /= zoom;
                edges.top /= zoom;
                edges.left /= zoom;
            }

            //Set the dimensions of the canvas inside this image
            this.staticCanvas.setDimensions(edges);
            //Set the dimensions and location of this image
            this._setObject(edges);
            //Update the display
            this._updateElement(canvas);
        },

        /** Updates the internal static canvas element and this display.
         * @param canvas {fabric.Canvas} the canvas containing this
         */
        _updateElement: function (canvas) {
            canvas = canvas || this.canvas;

            var fob = this.getTextObject(),
                content = fob.text,
                //Approx. monospace text size with one letter of padding on each side
                length = (content.length / 2) + 2,
                //Font size to fit inside width and height
                fontSize = Math.min(this.height - 10, (this.width - 10) / length);

            if (content && fontSize > 1) {
                //Set the text object visible
                fob.visible = true;

                //Set font size so that the text fills the width, with padding
                fob.set('fontSize', fontSize);

                //Center the text object on its canvas
                fob.viewportCenter();
            } else {
                //Set the text object non-visible
                fob.visible = false;
            }
            //Re-render the static canvas
            this.staticCanvas.renderAll();
            //Re-render the main canvas
            canvas && canvas.renderAll();
        },

        /**
         * Returns object representation of an instance
         * @param {Array} [propertiesToInclude] Any properties that you might want to additionally include in the output
         * @return {Object} Object representation of an instance
         */
        toObject: function (propertiesToInclude) {
            propertiesToInclude = Array.isArray(propertiesToInclude)
                ? propertiesToInclude
                : [];
            propertiesToInclude.push('text');
            return this.callSuper('toObject', propertiesToInclude);
        }

    });

    /**
     * Indicates that instances of this type are async
     * @static
     * @type Boolean
     * @default
     */
    fabric.FWatermark.async = true;

    /**
     * Creates an instance of fabric.FWatermark from its object representation
     * @static
     * @param {Object} object Object to create an instance from
     * @param {Function} callback Callback to invoke when an image instance is created
     */
    fabric.FWatermark.fromObject = function (object, callback) {
        return fabric.Object._fromObject('FWatermark', object, callback);
    };

})(typeof exports !== 'undefined' ? exports : this);