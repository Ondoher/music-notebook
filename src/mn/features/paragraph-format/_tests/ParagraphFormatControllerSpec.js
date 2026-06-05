/* global describe it expect beforeEach */

import { Registry, Service } from '@polylith/core';

import MainMenuService from '../../app/main-menu.js';
import ParagraphFormatController from '../controller.js';

class DocumentModelMock extends Service {
	constructor(registry) {
		super('document-model', registry);
		this.implement(['getSettings']);
	}

	getSettings() {
		return {
			styles: [{ id: 'normal', name: 'Normal', parentStyleId: '', format: {} }],
		};
	}
}

class EditorSurfaceMock extends Service {
	constructor(registry) {
		super('editor-surface', registry);
		this.implement(['getParagraphFormat', 'insertPageBreak', 'formatParagraph']);
		this.insertedPageBreaks = 0;
	}

	getParagraphFormat() {
		return {
			alignment: 'left',
			bold: false,
			fontSize: 12,
			italic: false,
			overrides: {},
			start: 'continuous',
			styleId: 'normal',
			underline: false,
		};
	}

	formatParagraph(format) {
		return format;
	}

	insertPageBreak() {
		this.insertedPageBreaks += 1;
		return true;
	}
}

class EditorToolbarMock extends Service {
	constructor(registry) {
		super('editor-toolbar', registry);
		this.implement(['addItem', 'updateItem']);
	}

	addItem() {
		return {};
	}

	updateItem() {
		return {};
	}
}

class ActionRegistryMock extends Service {
	constructor(registry) {
		super('action-registry', registry);
		this.implement(['registerAction']);
	}

	registerAction() {
		return {};
	}
}

describe('ParagraphFormatController', function() {
	let editorSurface;
	let mainMenu;
	let paragraphFormat;

	beforeEach(function() {
		const registry = new Registry();

		mainMenu = new MainMenuService(registry);
		mainMenu.start();
		editorSurface = new EditorSurfaceMock(registry);
		new DocumentModelMock(registry);
		new EditorToolbarMock(registry);
		new ActionRegistryMock(registry);
		paragraphFormat = new ParagraphFormatController(registry);

		mainMenu.addMainItem(100, 'format', 'app.menu.format');
		mainMenu.addMainItem(200, 'insert', 'app.menu.insert');
		paragraphFormat.ready();
	});

	it('registers paragraph commands in the format and insert menus', function() {
		expect(mainMenu.getItem('format', 'paragraph_format.menu.paragraph')).toBeTruthy();
		expect(mainMenu.getItem('insert', 'paragraph_format.menu.page_break')).toBeTruthy();
	});

	it('inserts a manual page break from the insert menu', function() {
		mainMenu.selectItem('insert', 'paragraph_format.menu.page_break');

		expect(editorSurface.insertedPageBreaks).toBe(1);
	});
});
