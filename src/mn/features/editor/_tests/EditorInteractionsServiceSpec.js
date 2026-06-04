/* global describe it expect */

import { Registry, Service } from '@polylith/core';
import EditorInteractionsService from '../services/editor-interactions.js';

class EditorInteractionTestHandler extends Service {
	constructor(registry, serviceName, calls = [], result = false) {
		super(serviceName, registry);
		this.implement(['handleEditorEvent']);
		this.calls = calls;
		this.result = result;
		this.serviceName = serviceName;
	}

	handleEditorEvent(eventName, _event, context) {
		this.calls.push(`${this.serviceName}:${eventName}:${context.eventName}`);
		return this.result;
	}
}

describe('EditorInteractionsService', function() {
	function createService() {
		const registry = new Registry();
		const service = new EditorInteractionsService(registry);

		service.start();
		return service;
	}

	it('dispatches matching handlers by priority until one handles the event', function() {
		const service = createService();
		const calls = [];
		const registry = service.registry;

		new EditorInteractionTestHandler(registry, 'low-handler', calls, true);
		new EditorInteractionTestHandler(registry, 'high-handler', calls, { handled: true });

		service.registerHandler({
			events: ['contextmenu'],
			id: 'low',
			priority: 10,
			serviceName: 'low-handler',
		});
		service.registerHandler({
			events: ['contextmenu'],
			id: 'high',
			priority: 20,
			serviceName: 'high-handler',
		});

		expect(service.dispatch('contextmenu', {}, {})).toEqual({
			handled: true,
			handlerId: 'high',
			result: { handled: true },
			serviceName: 'high-handler',
		});
		expect(calls).toEqual(['high-handler:contextmenu:contextmenu']);
	});

	it('returns an unregister function for handlers', function() {
		const service = createService();
		const unregister = service.registerHandler({
			events: ['keydown'],
			id: 'temporary',
			serviceName: 'temporary-handler',
		});

		expect(service.getHandlers('keydown').length).toBe(1);
		expect(unregister()).toBeTrue();
		expect(service.getHandlers('keydown').length).toBe(0);
	});
});
