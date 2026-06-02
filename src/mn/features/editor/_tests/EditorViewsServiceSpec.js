/* global describe it expect */

import React from 'react';
import { Registry } from '@polylith/core';
import EditorViewsService from '../editor-views.js';

describe('EditorViewsService', function() {
	function createService() {
		const registry = new Registry();
		const service = new EditorViewsService(registry);

		service.start();
		return service;
	}

	it('registers a named view and renders requested view props through it', function() {
		const service = createService();
		const updates = [];

		service.listen('updated', (views) => updates.push(views));
		service.registerView('sample.view', {
			getComponent(props) {
				return <span data-view-name={props.viewName}>{props.label}:{props.editorContext.marker}</span>;
			},
		});
		expect(service.requestView('sample.view', { label: 'Open' })).toBeTrue();

		const request = service.getRequestedViews()[0];
		const component = service.getComponent(request, { marker: 'ctx' });

		expect(request).toEqual({
			name: 'sample.view',
			props: { label: 'Open' },
		});
		expect(component.props['data-view-name']).toBe('sample.view');
		expect(component.props.children).toEqual(['Open', ':', 'ctx']);
		expect(updates.length).toBe(2);
	});

	it('closes requested views by name', function() {
		const service = createService();

		service.registerView('sample.view', {
			getComponent() {
				return <span />;
			},
		});
		service.requestView('sample.view', {});

		expect(service.getRequestedViews().length).toBe(1);
		expect(service.closeView('sample.view')).toBeTrue();
		expect(service.getRequestedViews().length).toBe(0);
	});
});
