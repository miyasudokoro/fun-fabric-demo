(function (global) {

    /** @const GET {object} jQuery selectors */
    var GET = {
        TOOLS: '#tools',
        DRAW: '#draw',
        CONTROLS: '#controls',
        INPUTS: '#controls input, #controls select',
        ACTIONS: '#actions',
        CANVAS_CONTAINER: '#funCanvasContainer',
        CANVAS: '.canvas-container'
    };

    /** @const CANVAS_ID {string} the id for the canvas element (no #). */
    var CANVAS_ID = 'funCanvas';
    /** @const PREVIEW_ID {string} the id for the preview canvas element (no #). */
    var PREVIEW_ID = 'preview';

    var view = {
        /** Pointer to constants. */
        GET: GET,

        /** Color conversion. */
        _color: new fabric.Color(),

        /** Returns the ID in the html for the canvas element.
         */
        getCanvasID: function () {
            return CANVAS_ID;
        },

        getPreviewID: function () {
            return PREVIEW_ID;
        },

        /** Adds a button in the view.
         * @param location {string} the jQuery selector
         * @param label {string} label on the button
         * @param handler {function} click handler
         * @param size {number} integer bootstrap column width
         */
        addButton: function (location, label, handler, size) {
            size = size || 1;
            var container = $(location),
                button = this._makeButton(label, handler, size);
            container.append(button);
        },

        /** Adds text in the view.
         */
        addText: function (location, label) {
            var container = $(location);
            container.append(document.createTextNode(label));
        },

        /** Adds an input in the view.
         * @param location {string} the selector
         * @param type {string} the HTML5 type of input (e.g. text, number, color)
         * @param label {string} the label displayed for the input
         * @param property {string} the property that will be changed
         * @param initial {string|number} the initial value of the input on creation
         * @param handler {function} the input handler
         * @param attrs {object} optional additional attributes
         */
        addRowInput: function (location, type, label, property, initial, handler, attrs) {
            var input = this._makeInput(type, property, initial, handler, attrs);

            this._makeInputContainer(location, label, input);
        },

        /** Adds an input to change a canvas setting.
         * @param location {string} the selector
         * @param type {string} the HTML5 type of input (e.g. text, number, color)
         * @param label {string} the label displayed for the input
         * @param property {string} the property that will be changed
         * @param initial {string|number} the initial value of the input on creation
         * @param handler {function} the input handler
         * @param attrs {object} optional additional attributes
         */
        addInlineInput: function (location, type, label, property, initial, handler, attrs) {
            var input = this._makeInput(type, property, initial, handler, attrs),
                id = property + 'Container',
                container = this._makeInputContainer(location, label, input, 4);
            container.attr('id', id);
        },

        /** Adds radio buttons to change a canvas setting.
         * @param location (string} the selector
         * @param name {string} the name of the radio buttons
         * @param values {Array} the array of values for the buttons
         * @param initial {string} the initial checked radio button
         * @param handler {function} the input handler
         * @param attrs {object} optional additional attributes
         */
        addRadios: function (location, name, values, initial, handler, attrs) {
            var container = $(location),
                div = $('<div>');

            attrs = attrs || {};
            attrs.name = name;

            this._addLabel(container, name, 2);

            div.addClass('radioList form-group');
            this._setColumns(div, 10);

            for (var i = 0; i < values.length; i++) {
                var radio,
                    span = $('<span>');
                if (typeof values[i] === 'string' || typeof values[i] === 'number') {
                    attrs.checked = (values[i] === initial);
                    radio = this._makeInput('radio', values[i], values[i], handler, attrs);
                    span.append(document.createTextNode(values[i]));
                } else if (typeof values[i] === 'object') {
                    attrs.checked = (values[i].value === initial);
                    radio = this._makeInput('radio', values[i].property, values[i].value,
                        handler, attrs);
                    span.append(document.createTextNode(values[i].label));
                }
                div.append(span);
                div.append(radio);
            }

            container.append(div);
        },

        /** Adds a link in the view.
         * @param location {string} the selector
         * @param label {string} the label of the link
         * @param handler {function} the click handler
         * @param attrs {object} attrs to add to link
         * @param size {number} column size
         */
        addLink: function (location, label, handler, attrs, size) {
            size = size || 1;
            var container = $('<div>'),
                link = this._makeLink(label, handler, attrs);

            this._setColumns(container, size);
            container.append(link);

            $(location).append(container);
        },

        /** Gets the width of the container for the canvas.
         */
        getCanvasContainerWidth: function () {
            var container = $(GET.CANVAS_CONTAINER),
                width = container[0].offsetWidth
                    - parseInt(container.css('paddingLeft'))
                    - parseInt(container.css('paddingRight')),
                zoom = this.getValueFor('zoom');
            if (zoom > 100) {
                //translate back to 8/12 columns instead of 12/12 columns
                width *= 2 / 3;
            }
            return width;
        },

        /** Adjusts the canvas container based on zoom size.
         */
        adjustCanvasContainer: function () {
            var zoom = this.getValueFor('zoom'),
                container = $(GET.CANVAS_CONTAINER);
            if (zoom > 1) {
                this._setColumns(container, 12, 8);
            } else {
                this._setColumns(container, 8, 12);
            }
        },

        /** Watches for responsive resizing.
         * @param handler {function} the resize handler
         */
        watchForResize: function (handler) {
            var wrapped = this.wrapHandler(handler);
            // create an observer
            var observer = new MutationObserver(wrapped),
                container = $(GET.CANVAS_CONTAINER);

            // observe the canvas container width
            observer.observe(container[0], {
                attributes: true
            });

            // also listen to window resize
            var resizeTO;
            $(window).resize(function () {
                clearTimeout(resizeTO);
                resizeTO = setTimeout(wrapped, 300);
            });
        },

        /** Gets the current value in the input for the given property.
         * @param property {string} the property to get the value for
         * @returns {string|number} the value for the property
         */
        getValueFor: function (property) {
            var input = $('#' + property);
            return this._getInputValue(input);
        },

        /** Gets the value from an event, or returns a non-event value.
         * @param eventOrValue {Event|*} an event or a value
         */
        getEventValue: function (eventOrValue) {
            if (eventOrValue && eventOrValue.target) {
                var target = $(eventOrValue.target);
                return this._getInputValue(target);
            }
            return eventOrValue;
        },

        /** Collects the values of the object inputs.
         * @param options {object} the options object to fill with values
         * @returns {object} options
         */
        collectInputValues: function (options) {
            options = options || {};
            var inputs = $(GET.INPUTS);
            for (var i = 0; i < inputs.length; i++) {
                var input = $(inputs[i]),
                    property = input.attr('id'),
                    value = this._getInputValue(input);

                if (typeof value !== 'undefined' && value !== null) {
                    options[property] = value;
                }
            }
            return options;
        },

        _getInputValue: function (target) {
            var type = target.attr('type'),
                value = type === 'checkbox' ? target.prop('checked') : target.val();

            //Make sure it is a number, for number inputs
            if (type === 'number' || type === 'range') {
                value = parseFloat(value);
                if (isNaN(value)) {
                    return;
                }
            }
            return value;
        },

        /** Updates all inputs based on current selection of objects.
         */
        updateInputs: function (fun) {
            var inputs = $(GET.INPUTS + ', ' + GET.DRAW + ' input');
            for (var i = 0; i < inputs.length; i++) {
                var input = $(inputs[i]),
                    type = input.attr('type'),
                    getter = input.attr('data-get'),
                    current;
                if (!getter) {
                    current = fun.get(inputs[i].id);
                } else {
                    current = fun[getter](inputs[i].id);
                }

                if (typeof current !== 'undefined' && current !== null) {
                    if (type === 'checkbox' || type === 'radio') {
                        input.prop('checked', !!current);
                    } else if (type === 'color') {
                        try {
                            this._color._tryParsingColor(current);
                            input.val('#' + (this._color.toHex().toLowerCase()));
                        } catch (e) {
                        }
                    } else {
                        input.val(current);
                    }
                }
            }
        },

        /** Sets the property on the element.
         * @param id {string} the element id
         * @param property {string} the property to set
         * @param value {*|Event} the value to set, or event.target.value
         */
        setElementProperty: function (id, property, value) {
            $('#' + id).prop(property, this.getEventValue(value));
        },

        /** Sets attributes on an element.
         * @param element {object} the element
         * @param attrs {object} the attributes to set
         * @private
         */
        _setElementAttrs: function (element, attrs) {
            if (attrs) {
                for (var prop in attrs) {
                    var value = attrs[prop];
                    if (prop === 'id') {
                        value = value.replace('#', '');
                    }
                    element.attr(prop, value);
                }
            }
        },

        /** Makes a link with a click handler.
         * @param label {string} the label of the link
         * @param handler {function} the click handler
         * @param attrs {object} attributes to set
         * @returns {HTMLAnchorElement}
         * @private
         */
        _makeLink: function (label, handler, attrs) {
            var link = $('<a>');
            link.text(label);
            link.addClass('btn btn-default');
            link.bind('click', this.wrapHandler(handler));
            this._setElementAttrs(link, attrs);

            return link;
        },

        /** Sets number of columns.
         * @param element {HTMLElement} element
         * @param size {number} integer size 1-12 to set
         * @param removeSize {number} integer size 1-12 to remove
         */
        _setColumns: function (element, size, removeSize) {
            size && element.addClass('col-md-' + size + ' col-sm-' + size);
            removeSize && element.removeClass('col-md-' + removeSize + ' col-sm-' + removeSize)
        },

        /** Makes the container for the input and puts the input in it.
         * @param location {string} the area of the view it belongs to
         * @param label {string} the label for the input
         * @param input {HTMLInputElement} the input
         * @param size {number} column width of container (default: full row)
         * @returns {HTMLDivElement} the container
         * @private
         */
        _makeInputContainer: function (location, label, input, size) {
            var section = $(location),
                container = $('<div>');

            if (typeof size === 'number') {
                container.addClass('form-group');
                this._setColumns(container, size);
            } else {
                container.addClass('row form-group');
            }

            this._addLabel(container, label, 5);

            var div = $('<div>');
            this._setColumns(div, 7);
            div.append(input);
            container.append(div);

            section.append(container);

            return container;
        },

        /** Makes the label for the input.
         * @param container {HTMLElement} the container
         * @param text {string} the text in the label
         * @param columns {number} integer number of columns
         */
        _addLabel: function (container, text, columns) {
            var span = $('<label>');
            span.addClass('control-label');
            this._setColumns(span, columns || 1);
            span.append(document.createTextNode(text));
            container.append(span);
        },

        /** Makes an input.
         * @param type {string} type of input
         * @param property {string} the property the input sets
         * @param initial {string|number} the initial value of the input
         * @param handler {function} the change handler
         * @param attrs {object} optional additional attributes
         * @returns {HTMLInputElement}
         * @private
         */
        _makeInput: function (type, property, initial, handler, attrs) {
            var input;
            if (type === 'select') {
                input = $('<select>');
                for (var i = 0; i < attrs.options.length; i++) {
                    input.append('<option>' + attrs.options[i] + '</option>');
                }
                delete attrs.options;
            } else {
                input = $('<input type="' + type + '">');
            }
            attrs = attrs || {};
            attrs.id = property;

            this._setElementAttrs(input, attrs);

            var eventType;
            switch (type) {
                case 'file':
                case 'checkbox':
                case 'radio':
                case 'select':
                case 'range':
                    eventType = 'change';
                    break;
                default:
                    eventType = 'input';
                    break;
            }

            input.bind(eventType, this.wrapHandler(handler));
            input.val(initial);
            input.prop('defaultValue', initial);
            input.addClass('form-control');

            return input;
        },

        /** Makes a button.
         * @param label {string} the label displayed on the button
         * @param handler {function} the click handler
         * @param size {number} the bootstrap column width (integer)
         * @returns {HTMLButtonElement}
         * @private
         */
        _makeButton: function (label, handler, size) {
            var button = $('<button>'),
                container = $('<div>');
            size = size || 1;

            this._setColumns(container, size);
            button.text(label);
            button.addClass('btn btn-default btn-block');
            button.bind('click', this.wrapHandler(handler));
            container.append(button);

            return container;
        },

        /** Creates a handler with try-catch wrapper.
         *
         * @param handler {function} the event handler to be wrapped
         * @returns {function}
         */
        wrapHandler: function (handler) {
            return function (event) {
                try {
                    handler(event);
                } catch (e) {
                    console.error(e);
                }
            }
        }
    };

    global.view = view;
})(typeof exports !== 'undefined' ? exports : this);