import { Registry } from '@polylith/core';
import MainMenuService from '../main-menu.js';

describe('MainMenuService', function() {
	function createService() {
		const registry = new Registry();
		const service = new MainMenuService(registry);

		service.start();
		return service;
	}

	it('emits an item-selected event when an existing item is selected', function() {
		const service = createService();
		const selected = [];

		service.addMainItem(100, 'document', 'app.menu.document');
		const item = service.addItem('document', 1, 100, 'app.menu.document.new');
		service.listen('item-selected', (event) => selected.push(event));

		const result = service.selectItem('document', item.id);

		expect(result).toEqual(item);
		expect(selected.length).toBe(1);
		expect(selected[0].item).toEqual(item);
		expect(selected[0].menu).toEqual(service.getMenu());
	});

	it('warns and returns null when selecting a missing item', function() {
		const service = createService();

		service.addMainItem(100, 'document', 'app.menu.document');
		spyOn(console, 'warn');

		const result = service.selectItem('document', 'missing');

		expect(result).toBeNull();
		expect(console.warn).toHaveBeenCalledWith(
			'Cannot select main menu item "missing" because it does not exist in main menu "document".',
		);
	});

	it('does not emit selection events for disabled items', function() {
		const service = createService();
		const selected = [];

		service.addMainItem(100, 'document', 'app.menu.document');
		const item = service.addItem('document', 1, 100, 'app.menu.document.open', {
			enabled: false,
		});
		service.listen('item-selected', (event) => selected.push(event));

		const result = service.selectItem('document', item.id);

		expect(result.enabled).toBeFalse();
		expect(selected.length).toBe(0);
	});
});
