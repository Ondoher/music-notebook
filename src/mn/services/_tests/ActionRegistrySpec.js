import { Registry } from '@polylith/core';
import ActionRegistryService from '../action-registry.js';

describe('ActionRegistryService', function() {
	function DefaultActionComponent() {
		return null;
	}

	function PressedActionComponent() {
		return null;
	}

	function OtherActionComponent() {
		return null;
	}

	function createService() {
		const registry = new Registry();
		const service = new ActionRegistryService(registry);

		service.start();
		return service;
	}

	it('registers and retrieves default and state-specific action components', function() {
		const service = createService();

		service.registerAction('bold', DefaultActionComponent, 'default', 'editor.toolbar.bold');
		service.registerAction('bold', PressedActionComponent, 'pressed', 'editor.toolbar.bold_pressed');

		expect(service.getActionComponent('bold')).toBe(DefaultActionComponent);
		expect(service.getActionComponent('bold', 'pressed')).toBe(PressedActionComponent);
		expect(service.getActionComponent('bold', 'disabled')).toBe(DefaultActionComponent);
		expect(service.getActionHoverTextStringId('bold')).toBe('editor.toolbar.bold');
		expect(service.getActionHoverTextStringId('bold', 'pressed')).toBe('editor.toolbar.bold_pressed');
		expect(service.getActionHoverTextStringId('bold', 'disabled')).toBe('editor.toolbar.bold');
		expect(service.getActionSet('bold')).toEqual({
			id: 'bold',
			states: {
				default: DefaultActionComponent,
				pressed: PressedActionComponent,
			},
			hoverTextStringIds: {
				default: 'editor.toolbar.bold',
				pressed: 'editor.toolbar.bold_pressed',
			},
		});
	});

	it('returns sorted action snapshots and protects registry entry objects', function() {
		const service = createService();

		service.registerAction('italic', OtherActionComponent);
		const entry = service.registerAction('bold', DefaultActionComponent);

		entry.states.default = OtherActionComponent;
		entry.hoverTextStringIds.default = 'changed';

		expect(service.getActionComponent('bold')).toBe(DefaultActionComponent);
		expect(service.getActionHoverTextStringId('bold')).toBe('');
		expect(service.getActions().map((action) => action.id)).toEqual(['bold', 'italic']);
	});

	it('emits events when actions are registered and removed', function() {
		const service = createService();
		const registered = [];
		const removed = [];

		service.listen('action-registered', (event) => registered.push(event));
		service.listen('action-removed', (event) => removed.push(event));

		service.registerAction('bold', DefaultActionComponent);
		service.removeAction('bold');

		expect(registered.length).toBe(1);
		expect(registered[0].id).toBe('bold');
		expect(registered[0].state).toBe('default');
		expect(registered[0].component).toBe(DefaultActionComponent);
		expect(registered[0].hoverTextStringId).toBe('');
		expect(removed.length).toBe(1);
		expect(removed[0].id).toBe('bold');
		expect(removed[0].state).toBe('');
	});

	it('updates hover text independently of the registered action component', function() {
		const service = createService();
		const updated = [];

		service.listen('action-hover-text-updated', (event) => updated.push(event));
		service.registerAction('bold', DefaultActionComponent);

		const entry = service.updateActionHoverText('bold', 'editor.toolbar.bold');

		expect(entry.hoverTextStringIds.default).toBe('editor.toolbar.bold');
		expect(service.getActionComponent('bold')).toBe(DefaultActionComponent);
		expect(service.getActionHoverTextStringId('bold')).toBe('editor.toolbar.bold');
		expect(updated.length).toBe(1);
		expect(updated[0].hoverTextStringId).toBe('editor.toolbar.bold');

		service.updateActionHoverText('bold', '');

		expect(service.getActionHoverTextStringId('bold')).toBe('');
	});

	it('removes a single state without removing the default action component', function() {
		const service = createService();

		service.registerAction('bold', DefaultActionComponent);
		service.registerAction('bold', PressedActionComponent, 'pressed');

		expect(service.removeAction('bold', 'pressed')).toBeTrue();
		expect(service.getActionComponent('bold', 'pressed')).toBe(DefaultActionComponent);
		expect(service.getActionSet('bold')).toEqual({
			id: 'bold',
			states: { default: DefaultActionComponent },
			hoverTextStringIds: {},
		});
	});

	it('warns and returns null when registering an action without an id', function() {
		const service = createService();

		spyOn(console, 'warn');

		expect(service.registerAction('', DefaultActionComponent)).toBeNull();
		expect(console.warn).toHaveBeenCalledWith('Cannot register an action without an id.');
	});
});
