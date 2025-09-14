const css = (selector, rules) => [
	selector, '{',
		Object.entries(rules).map(
			([key, value]) => [key, value].join(':')
		).join(';'),
	'}'
].join('');

const designCanvasSheet = new CSSStyleSheet();
designCanvasSheet.insertRule(css('infinite-paper', {
	'background-color': 'var(--design-canvas-background, #f6f6f6)',
	'position': 'absolute',
	'left': '0',
	'top': '0',
	'width': '100vw',
	'height': '100vh',
}));

class InfinitePaper extends HTMLElement {
	scalePrecision = 3;

	static get observedAttributes() { return ['scale'] }

	attributeChangedCallback(name, _oldValue, newValue) {
		if (name === 'scale') {
			this.windowFrames.forEach((element) => {
				const wantedWidth = element.getAttribute('width');
				const wantedHeight = element.getAttribute('height');

				const width = Math.round(wantedWidth * newValue);
				const height = Math.round(wantedHeight * newValue);

				element.style.width = `${width}px`;
				element.style.height = `${height}px`;

				element.setAttribute('scale', newValue);
			});
		}
	}

	connectedCallback() {
		// Disable scroll.
		document.body.style.overflow = 'hidden';
		// Add style.
		document.adoptedStyleSheets.push(designCanvasSheet);
		// Listen to events.
		for (const eventType of ['pointerdown', 'pointerleave', 'pointermove', 'pointerup', 'wheel'])
			this.addEventListener(eventType, this);
	}

	disconnectedCallback() {
		// Restore scroll.
		document.body.style.overflow = '';
		// Remove style.
		document.adoptedStyleSheets = document.adoptedStyleSheets.filter((sheet) => sheet !== designCanvasSheet);
		// Remove event listeners.
		for (const eventType of ['pointerdown', 'pointerleave', 'pointermove', 'pointerup', 'wheel'])
			this.removeEventListener(eventType, this);
	}

	handleEvent(event) {
		if (event.type === 'pointerdown') {
			const {clientX, clientY} = event;
			const x = Math.round(clientX);
			const y = Math.round(clientY);

			this.isDragging = true;
			this.pointerCoordinates = {x, y};
		}

		if (event.type === 'pointerleave' || event.type === 'pointerup') {
			this.isDragging = false;
		}

		if (event.type === 'pointermove') {
			const {
				isDragging,
				origin = {x: 0, y: 0},
				pointerCoordinates,
			} = this;
			const {clientX, clientY} = event;
			const x = Math.round(clientX);
			const y = Math.round(clientY);

			if (isDragging) {
				// Translate origin.
				this.origin = {
					x: origin.x - pointerCoordinates.x + x,
					y: origin.y - pointerCoordinates.y + y
				};
				// Apply to children nodes.
				this.windowFrames.forEach((element) => {
					element.style.left = `${this.origin.x}px`;
					element.style.top = `${this.origin.y}px`;
				});
				// Update pointer coordinates.
				this.pointerCoordinates = {x, y};
			}
		}

		if (event.type === 'wheel' && event.metaKey) {
			this.scale = this.scale - event.deltaY * Math.pow(10, - this.scalePrecision);
		}
	}

	get windowFrames() {
		return document.querySelectorAll('window-frame');
	}

	get scale() {
		return Number(this.getAttribute('scale')) || 1;
	}

	set scale(value) {
		if (value <= 0) return;
		this.setAttribute('scale', Number(value.toFixed(this.scalePrecision)));
	}
}

customElements.define('infinite-paper', InfinitePaper);

/**
 * WindowFrame
 */

const windowFrameSheet = new CSSStyleSheet();
windowFrameSheet.insertRule(css(':host', {
	'position': 'absolute',
	'box-shadow': 'var(--design-canvas-shadow, 1px 1px 7px 1px rgba(0, 0, 0, 0.17))'
}));
windowFrameSheet.insertRule(css(':host > iframe', {
	'transform-origin': '0px 0px',
	'border': 'none',
}));

class WindowFrame extends HTMLElement {
	scale = 1;
	iframe = document.createElement('iframe');

	constructor() {
		super();
		this.attachShadow({mode: 'open'});
		this.shadowRoot.adoptedStyleSheets.push(windowFrameSheet);
		this.shadowRoot.appendChild(this.iframe);
	}

	static get observedAttributes() {
		return [
			'scale',
			'top', 'left', // position
			'width', 'height', // dimension
			'src', // iframe URL
		];
	}

	attributeChangedCallback(name, _oldValue, newValue) {
		if (name === 'top' || name === 'left') {
			const num = Math.round(newValue);
			this.style[name] = `${num}px`;
		}
		if (name === 'width' || name === 'height') {
			const num = Math.round(newValue * this.scale);
			this.style[name] = `${num}px`;
			this.iframe[name] = num;
		}
		if (name === 'scale') {
			const num = Number(newValue);
			this.scale = num
			this.iframe.style.transform = `scale(${num})`;
		}
		if (name === 'src') {
			this.iframe.src = newValue;
		}
	}

	get paper() {
		const {parentNode} = this;

		if (parentNode) {
			if (parentNode.tagName === 'INFINITE-PAPER') {
				return parentNode;
			}
		}
	}

	get scale() {
		const {paper} = this;

		if (paper) {
			return Number(paper.getAttribute('scale')) || 1;
		} else {
			return 1;
		}
	}
}

customElements.define('window-frame', WindowFrame);
