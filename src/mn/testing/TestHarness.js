import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Registry } from '@polylith/core';

import MusicNotebookContext from '../common/MusicNotebookContext.js';
import { createDefaultLocalize } from '../common/default-localize.js';

if (typeof globalThis !== 'undefined') {
	globalThis.IS_REACT_ACT_ENVIRONMENT = true;
}

function makeContainer() {
	const container = document.createElement('div');
	document.body.appendChild(container);
	return container;
}

export default class TestHarness {
	constructor() {
		this.app = {};
		this.props = {};
		this.context = {
			localize: createDefaultLocalize(),
		};
		this.registry = new Registry();
		this.container = null;
		this.root = null;
	}

	withApp(app = {}) {
		this.app = { ...this.app, ...app };
		return this;
	}

	withProps(props = {}) {
		this.props = { ...this.props, ...props };
		return this;
	}

	withContext(context = {}) {
		this.context = { ...this.context, ...context };
		return this;
	}

	withRegistry(registryOrServices = {}) {
		if (typeof registryOrServices?.subscribe === 'function') {
			this.registry = registryOrServices;
			return this;
		}

		Object.entries(registryOrServices).forEach(([name, service]) => {
			this.registry.register(name, service);
		});
		return this;
	}

	withService(name, service) {
		this.registry.register(name, service);
		return this;
	}

	makeContextValue() {
		return {
			app: this.app,
			registry: this.registry,
			...this.context,
		};
	}

	render(Component, props = {}) {
		const mergedProps = { ...this.props, ...props };
		const contextValue = this.makeContextValue();

		if (!this.container) {
			this.container = makeContainer();
		}

		if (!this.root) {
			this.root = createRoot(this.container);
		}

		act(() => {
			this.root.render(
				<MusicNotebookContext.Provider value={contextValue}>
					<Component {...mergedProps} />
				</MusicNotebookContext.Provider>,
			);
		});

		return {
			container: this.container,
			context: contextValue,
			props: mergedProps,
			unmount: this.unmount.bind(this),
		};
	}

	unmount() {
		if (!this.root || !this.container) {
			return;
		}

		act(() => {
			this.root.unmount();
		});

		this.root = null;
		this.container.remove();
		this.container = null;
	}
}

export function createTestHarness() {
	return new TestHarness();
}
