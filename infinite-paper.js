const html = (strings, ...expressions) => {
	let template = document.createElement('template');
	template.innerHTML = strings.reduce(
		(result, string, index) => result + string + (expressions[index] ?? ''), ''
	);
	return template
}

/**
 * InfinitePaper
 */

const infinitePaperTemplate = html`
	<style>
		:host {
			background-color: var(--infinite-paper-background-color, #f5f5f5);
			position: absolute;
			left: 0;
			top: 0;
			width: 100vw;
			height: 100vh;
		}
		::slotted(window-frame) {
			position: absolute;
		}
	</style>
	<slot></slot>
`;

class InfinitePaper extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({mode: 'open'}).appendChild(
			infinitePaperTemplate.content.cloneNode(true)
		);
	}

	static get scalePrecision() {
		return 3;
	}

	static get observedAttributes() { return ['scale'] }

	attributeChangedCallback(name, _oldValue, newValue) {
		switch (name) {
			case 'scale': {
				this.windowFrames.forEach((element) => {
					const wantedWidth = element.getAttribute('width');
					const wantedHeight = element.getAttribute('height');

					const width = Math.round(wantedWidth * newValue);
					const height = Math.round(wantedHeight * newValue);

					element.style.width = `${width}px`;
					element.style.height = `${height}px`;

					const iframe = element.shadowRoot.querySelector('iframe');
					iframe.style.transform = `scale(${newValue})`;
				});
				break;
			}
		}
	}

	connectedCallback() {
		// Disable scroll.
		document.body.style.overflow = 'hidden';
		for (const eventType of ['pointerdown', 'pointerleave', 'pointermove', 'pointerup', 'wheel'])
			this.addEventListener(eventType, this);
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
			this.scale = this.scale - event.deltaY * Math.pow(10, -InfinitePaper.scalePrecision);
		}
	}

	get windowFrames() {
		return this.querySelectorAll(':scope > window-frame');
	}

	get scale() {
		return Number(this.getAttribute('scale')) || 1;
	}

	set scale(value) {
		if (value <= 0) return;
		this.setAttribute('scale', Number(value.toFixed(InfinitePaper.scalePrecision)));
	}
}

customElements.define('infinite-paper', InfinitePaper);

/**
 * WindowFrame
 */

const windowFrameTemplate = html`
<style>
	:host {
		box-shadow: 1px 1px 7px 1px var(
			--window-frame-box-shadow-color, rgba(0, 0, 0, 0.17)
		);
	}
	:host > iframe {
		transform-origin: 0px 0px;
	}
</style>

<iframe frameborder='0'></iframe>
`

class WindowFrame extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({mode: 'open'}).appendChild(
			windowFrameTemplate.content.cloneNode(true)
		);
	}

	static get observedAttributes() {
		return [
			// position
			'top',
			'left',
			// dimension
			'width',
			'height',
			// iframe URL
			'src',
		];
	}

	attributeChangedCallback(name, _oldValue, newValue) {
		switch (name) {
			case 'top':
			case 'left': {
				const num = Math.round(newValue);

				if (typeof num === 'number') {
					this.style[name] = `${num}px`;
				}

				break;
			}

			case 'width':
			case 'height': {
				const {iframe, scale} = this;

				const num = Math.round(newValue * scale);

				if (typeof num === 'number' && num >= 0) {
					this.style[name] = `${num}px`;
					iframe.style.transform = `scale(${scale})`;
					iframe[name] = newValue;
				}

				break;
			}

			case 'src': {
				this.iframe.src = newValue;
				break;
			}
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

	get iframe() {
		return this.shadowRoot.querySelector('iframe');
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
