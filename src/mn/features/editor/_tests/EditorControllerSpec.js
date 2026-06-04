import { Registry, Service } from '@polylith/core';

import AppPagesService from '../../../services/app-pages.js';
import IconRegistryService from '../../../services/icon-registry.js';
import ViewsService from '../../../services/views.js';
import EditorController from '../controller.js';
import EditorSurfaceService from '../services/editor-surface.js';
import EditorToolbarService from '../services/editor-toolbar.js';

class LocalizeMock extends Service {
	constructor(registry) {
		super('localize', registry);
		this.implement(['translate']);
	}

	translate(phrase) {
		return phrase;
	}
}

describe('EditorController', function() {
	function createController() {
		const registry = new Registry();
		const pages = new AppPagesService(registry);
		const views = new ViewsService(registry);
		const localize = new LocalizeMock(registry);
		const editorToolbar = new EditorToolbarService(registry);
		const editorSurface = new EditorSurfaceService(registry);
		const iconRegistry = new IconRegistryService(registry);
		const controller = new EditorController(registry);

		pages.start();
		views.start();
		editorToolbar.start();
		editorSurface.start();
		iconRegistry.start();
		controller.ready();

		return {
			controller,
			editorToolbar,
			iconRegistry,
			localize,
			pages,
			registry,
			views,
		};
	}

	it('registers and toggles the see-white-space toolbar item as an editor view mode', function() {
		const { controller, editorToolbar, iconRegistry } = createController();
		const updates = [];

		controller.listen('updated', (state) => updates.push(state));

		expect(iconRegistry.getIcon('editor.see-white-space')).toBeTruthy();
		expect(editorToolbar.getToolbar()[0].items.map((item) => item.id)).toContain('editor.see-white-space');
		expect(controller.getState().seeWhiteSpace).toBeFalse();

		editorToolbar.selectItem('editor.see-white-space');

		expect(controller.getState().seeWhiteSpace).toBeTrue();
		expect(editorToolbar.getToolbar()[0].items.find((item) => item.id === 'editor.see-white-space').pressed).toBeTrue();
		expect(updates[0].seeWhiteSpace).toBeTrue();

		editorToolbar.selectItem('editor.see-white-space');

		expect(controller.getState().seeWhiteSpace).toBeFalse();
		expect(editorToolbar.getToolbar()[0].items.find((item) => item.id === 'editor.see-white-space').pressed).toBeFalse();
	});
});
