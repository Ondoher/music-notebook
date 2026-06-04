import { Registry } from '@polylith/core';
import EditorToolbarService from '../services/editor-toolbar.js';

describe('EditorToolbarService', function() {
	function createService() {
		const registry = new Registry();
		const service = new EditorToolbarService(registry);

		service.start();
		return service;
	}

	it('sorts toolbar items by section and priority', function() {
		const service = createService();

		service.addItem(20, 200, 'bullet', 'editor.toolbar.list_bullet', 'editor.list.bullet');
		service.addItem(10, 200, 'italic', 'editor.toolbar.italic', 'editor.italic');
		service.addItem(10, 100, 'bold', 'editor.toolbar.bold', 'editor.bold');

		expect(service.getToolbar().map((section) => ({
			sectionNumber: section.sectionNumber,
			ids: section.items.map((item) => item.id),
		}))).toEqual([
			{ sectionNumber: 10, ids: ['bold', 'italic'] },
			{ sectionNumber: 20, ids: ['bullet'] },
		]);
	});

	it('updates, hides, removes, and selects toolbar items', function() {
		const service = createService();
		const selected = [];

		service.addItem(10, 100, 'bold', 'editor.toolbar.bold', 'editor.bold', { pressed: false });
		service.listen('item-selected', (event) => selected.push(event));

		service.updateItem('bold', { pressed: true });

		expect(service.getToolbar()[0].items[0].pressed).toBeTrue();
		expect(service.selectItem('bold').id).toBe('bold');
		expect(selected[0].item.id).toBe('bold');

		service.selectItem('bold', 18);

		expect(selected[1].item.commandPayload).toBe(18);

		service.updateItem('bold', { visible: false });

		expect(service.getToolbar()).toEqual([]);
		expect(service.removeItem('bold')).toBeTrue();
	});

	it('keeps disabled items focusable by reporting disabled selection separately', function() {
		const service = createService();
		const disabledSelections = [];

		service.addItem(10, 100, 'bold', 'editor.toolbar.bold', 'editor.bold', { enabled: false });
		service.listen('disabled-item-selected', (event) => disabledSelections.push(event));

		const item = service.selectItem('bold');

		expect(item.id).toBe('bold');
		expect(disabledSelections.length).toBe(1);
		expect(disabledSelections[0].item.enabled).toBeFalse();
	});
});
