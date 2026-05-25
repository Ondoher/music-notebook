import React from 'react';
import { Service } from '@polylith/core';
import EditorPage from '../components/EditorPage.jsx';

export default class EditorView extends Service {
	constructor(registry) {
		super('editor-view', registry);
		this.implement(['ready', 'getComponent', 'getState']);
	}

	ready() {
		this.views = this.registry.subscribe('views');
		this.controller = this.registry.subscribe('editor-controller');
		this.controller.listen('updated', (state) => this.fire('updated', state));
		this.views.add('editor', this.serviceName);
	}

	getComponent() {
		return React.createElement(EditorPage, {
			pageView: this,
		});
	}

	getState() {
		return this.controller.getState();
	}
}

new EditorView();
