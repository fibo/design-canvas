/** CSS helper */
const css = (selector, rules) => [
	selector, '{',
		Object.entries(rules).map(
			([key, value]) => [key, value].join(':')
		).join(';'),
	'}'
].join('');

//
// Minimal pub/sub.
//

const subscribersByKey = new Map();

const transformGroup = new Map()
	.set('default', {
		scale: 1,
		origin: { x: 0, y: 0 },
	});

const state = new Map()
	.set('transform', {
		scale: 1,
		origin: { x: 0, y: 0 },
	});

const publish = (key, callback) => {
	state.set(key, callback(state.get(key)));
	// Notify subscribers.
	for (const callback of subscribersByKey.get(key) ?? [])
		callback(state.get(key));
}

const subscribe = (key, callback) => {
	// Add the subscriber.
	const subscribers = subscribersByKey.get(key);
	if (subscribers)
		subscribers.add(callback);
	else
		subscribersByKey.set(key, new Set([callback]));
	// Send snapshot of current state.
	callback(state.get(key));
	// Return unsubscribe function.
	return () => {
		const subscribers = subscribersByKey.get(key);
		subscribers.delete(callback);
	}
}

//
// Design Canvas
//

const designCanvasSheet = new CSSStyleSheet();
designCanvasSheet.insertRule(css('design-canvas', {
	'background-color': 'var(--design-canvas-background, #f6f6f6)',
	'position': 'absolute',
	'left': '0',
	'top': '0',
	'width': '100vw',
	'height': '100vh',
}));

class DesignCanvas extends HTMLElement {
	#isDragging = false;
	#pointerCoordinates = { x: 0, y: 0 };
	#scalePrecision = 3;
	#cursorSheet = new CSSStyleSheet();

	connectedCallback() {
		// Disable scroll.
		document.body.style.overflow = 'hidden';
		// Add style.
		document.adoptedStyleSheets.push(designCanvasSheet, this.#cursorSheet);
		this.#setCursor('default');
		// Listen to events.
		for (const event of ['keydown', 'keyup'])
			window.addEventListener(event, this)
		for (const event of ['pointerdown', 'pointerleave', 'pointermove', 'pointerup', 'wheel'])
			this.addEventListener(event, this, { passive: true });
	}

	disconnectedCallback() {
		// Restore scroll.
		document.body.style.overflow = '';
		// Remove style.
		document.adoptedStyleSheets = document.adoptedStyleSheets.filter((sheet) => {
			if (sheet === this.#cursorSheet) return false;
			if (sheet === designCanvasSheet) return false;
			return true;
		});
		// Remove event listeners.
		for (const event of ['keydown', 'keyup'])
			window.removeEventListener(event, this);
		for (const event of ['pointerdown', 'pointerleave', 'pointermove', 'pointerup', 'wheel'])
			this.removeEventListener(event, this);
	}

	handleEvent(event) {
		if (event.type === 'keydown') {
			if (event.code === 'Digit0' && event.ctrlKey) {
				publish('transform', () => ({
					scale: 1,
					origin: { x: 0, y: 0 }
				}));
			}

			if (event.code === 'MetaLeft' || event.code === 'MetaRight') {
				this.#setCursor('zoom-in');
			}
		}

		if (event.type === 'keyup') {
			this.#setCursor('default');
			if (event.code === 'MetaLeft' || event.code === 'MetaRight') {
				this.#setCursor('default');
			}
		}

		if (event.type === 'pointerdown') {
			this.#pointerCoordinates = {
				x: Math.round(event.clientX),
				y: Math.round(event.clientY)
			};
			this.#isDragging = true;
			this.#setCursor('grabbing');
		}

		if (event.type === 'pointerleave' || event.type === 'pointerup') {
			this.#isDragging = false;
			this.#setCursor('default');
		}

		if (event.type === 'pointermove') {
			const x = Math.round(event.clientX);
			const y = Math.round(event.clientY);
			if (this.#isDragging) {
				publish('transform', ({ origin, scale }) => ({
					origin: {
						x: origin.x - this.#pointerCoordinates.x + x,
						y: origin.y - this.#pointerCoordinates.y + y
					},
					scale,
				}))
				// Update pointer coordinates.
				this.#pointerCoordinates = {x, y};
			}
		}

		if (event.type === 'wheel' && event.metaKey) {
			publish('transform', ({ origin, scale }) => ({
				scale: scale - event.deltaY * Math.pow(10, - this.#scalePrecision),
				origin,
			}));
		}
	}

	#setCursor(cursor) {
		this.#cursorSheet.replace(css('design-canvas', { cursor }));
	}
}

customElements.define('design-canvas', DesignCanvas);

//
// Window Frame
//

const windowFrameSheet = new CSSStyleSheet();
windowFrameSheet.insertRule(css(':host', {
	'position': 'absolute',
	'box-shadow': 'var(--design-canvas-shadow, 1px 1px 7px 1px rgba(0, 0, 0, 0.17))',
}));
windowFrameSheet.insertRule(css(':host > iframe', {
	'transform-origin': '0px 0px',
	'border': 'none',
}));

class WindowFrame extends HTMLElement {
	static get observedAttributes() {
		return [
			'size', 'position',
			'src', // iframe URL
		];
	}

	#subscriptions = [];
	#position = { x: 0, y: 0 };
	#iframe = document.createElement('iframe');
	#geometrySheet = new CSSStyleSheet();

	constructor() {
		super();
		this.attachShadow({mode: 'open'});
		this.shadowRoot.adoptedStyleSheets.push(windowFrameSheet, this.#geometrySheet);
		this.shadowRoot.appendChild(this.#iframe);
	}

	connectedCallback() {
		this.#subscriptions.push(
			subscribe('transform', (transform) => {
				this.#updateGeometry(transform);
			}),
		);
	}

	disconnectedCallback() {
		this.#subscriptions.forEach(unsubscribe => unsubscribe());
	}

	attributeChangedCallback(name, _oldValue, newValue) {
		if (name === 'position') {
			const [x, y] = newValue.split(',').map(str => Number(str));
			if (isNaN(x) || isNaN(y)) return;
			this.#position = { x, y };
			this.#updateGeometry(state.get('transform'));
		}

		if (name === 'size') {
			const [width, height] = newValue.split('x').map(str => Number(str));
			if (isNaN(width) || isNaN(height)) return;
			this.#iframe.width = width;
			this.#iframe.height = height;
			this.#updateGeometry(state.get('transform'));
		}

		if (name === 'src') {
			this.#iframe.src = newValue;
		}
	}

	#updateGeometry({ scale, origin }) {
		this.#geometrySheet.replace([
			css(':host', {
				left: `${Math.round(origin.x + this.#position.x * scale)}px`,
				top: `${Math.round(origin.y + this.#position.y * scale)}px`,
				width: `${this.#iframe.width * scale}px`,
				height: `${this.#iframe.height * scale}px`,
			}),
			css(':host > iframe', {
				transform: `scale(${scale})`,
			})
		].join('\n'));
	}
}

customElements.define('window-frame', WindowFrame);
