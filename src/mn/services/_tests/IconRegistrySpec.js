import { Registry } from '@polylith/core';
import IconRegistryService from '../icon-registry.js';

describe('IconRegistryService', function() {
	function DefaultIcon() {
		return null;
	}

	function PressedIcon() {
		return null;
	}

	function OtherIcon() {
		return null;
	}

	function createService() {
		const registry = new Registry();
		const service = new IconRegistryService(registry);

		service.start();
		return service;
	}

	it('registers and retrieves default and state-specific icons', function() {
		const service = createService();

		service.registerIcon('bold', DefaultIcon, 'default', 'editor.toolbar.bold');
		service.registerIcon('bold', PressedIcon, 'pressed', 'editor.toolbar.bold_pressed');

		expect(service.getIcon('bold')).toBe(DefaultIcon);
		expect(service.getIcon('bold', 'pressed')).toBe(PressedIcon);
		expect(service.getIcon('bold', 'disabled')).toBe(DefaultIcon);
		expect(service.getIconHoverTextStringId('bold')).toBe('editor.toolbar.bold');
		expect(service.getIconHoverTextStringId('bold', 'pressed')).toBe('editor.toolbar.bold_pressed');
		expect(service.getIconHoverTextStringId('bold', 'disabled')).toBe('editor.toolbar.bold');
		expect(service.getIconSet('bold')).toEqual({
			id: 'bold',
			states: {
				default: DefaultIcon,
				pressed: PressedIcon,
			},
			hoverTextStringIds: {
				default: 'editor.toolbar.bold',
				pressed: 'editor.toolbar.bold_pressed',
			},
		});
	});

	it('returns sorted icon snapshots and protects registry entry objects', function() {
		const service = createService();

		service.registerIcon('italic', OtherIcon);
		const entry = service.registerIcon('bold', DefaultIcon);

		entry.states.default = OtherIcon;
		entry.hoverTextStringIds.default = 'changed';

		expect(service.getIcon('bold')).toBe(DefaultIcon);
		expect(service.getIconHoverTextStringId('bold')).toBe('');
		expect(service.getIcons().map((icon) => icon.id)).toEqual(['bold', 'italic']);
	});

	it('emits events when icons are registered and removed', function() {
		const service = createService();
		const registered = [];
		const removed = [];

		service.listen('icon-registered', (event) => registered.push(event));
		service.listen('icon-removed', (event) => removed.push(event));

		service.registerIcon('bold', DefaultIcon);
		service.removeIcon('bold');

		expect(registered.length).toBe(1);
		expect(registered[0].id).toBe('bold');
		expect(registered[0].state).toBe('default');
		expect(registered[0].icon).toBe(DefaultIcon);
		expect(registered[0].hoverTextStringId).toBe('');
		expect(removed.length).toBe(1);
		expect(removed[0].id).toBe('bold');
		expect(removed[0].state).toBe('');
	});

	it('updates hover text independently of the registered icon component', function() {
		const service = createService();
		const updated = [];

		service.listen('icon-hover-text-updated', (event) => updated.push(event));
		service.registerIcon('bold', DefaultIcon);

		const entry = service.updateIconHoverText('bold', 'editor.toolbar.bold');

		expect(entry.hoverTextStringIds.default).toBe('editor.toolbar.bold');
		expect(service.getIcon('bold')).toBe(DefaultIcon);
		expect(service.getIconHoverTextStringId('bold')).toBe('editor.toolbar.bold');
		expect(updated.length).toBe(1);
		expect(updated[0].hoverTextStringId).toBe('editor.toolbar.bold');

		service.updateIconHoverText('bold', '');

		expect(service.getIconHoverTextStringId('bold')).toBe('');
	});

	it('removes a single state without removing the default icon', function() {
		const service = createService();

		service.registerIcon('bold', DefaultIcon);
		service.registerIcon('bold', PressedIcon, 'pressed');

		expect(service.removeIcon('bold', 'pressed')).toBeTrue();
		expect(service.getIcon('bold', 'pressed')).toBe(DefaultIcon);
		expect(service.getIconSet('bold')).toEqual({
			id: 'bold',
			states: { default: DefaultIcon },
			hoverTextStringIds: {},
		});
	});

	it('warns and returns null when registering an icon without an id', function() {
		const service = createService();

		spyOn(console, 'warn');

		expect(service.registerIcon('', DefaultIcon)).toBeNull();
		expect(console.warn).toHaveBeenCalledWith('Cannot register an icon without an id.');
	});
});
