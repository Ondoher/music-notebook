/* global describe it expect */

import { Registry } from '@polylith/core';
import EditorInteractionsService from '../editor-interactions.js';

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

		service.registerHandler({
			events: ['contextmenu'],
			handle() {
				calls.push('low');
				return true;
			},
			id: 'low',
			priority: 10,
		});
		service.registerHandler({
			events: ['contextmenu'],
			handle(_event, context) {
				calls.push(`high:${context.eventName}`);
				return { handled: true };
			},
			id: 'high',
			priority: 20,
		});

		expect(service.dispatch('contextmenu', {}, {})).toEqual({
			handled: true,
			handlerId: 'high',
			result: { handled: true },
		});
		expect(calls).toEqual(['high:contextmenu']);
	});

	it('returns an unregister function for handlers', function() {
		const service = createService();
		const unregister = service.registerHandler({
			events: ['keydown'],
			handle: () => true,
			id: 'temporary',
		});

		expect(service.getHandlers('keydown').length).toBe(1);
		expect(unregister()).toBeTrue();
		expect(service.getHandlers('keydown').length).toBe(0);
	});
});
