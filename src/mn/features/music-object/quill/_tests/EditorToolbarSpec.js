import React from 'react';
import { act } from 'react';
import { Registry } from '@polylith/core';
import Quill from 'quill';
import { createTestHarness } from '../../../../testing/TestHarness.js';
import ActionRegistryService from '../../../../services/action-registry.js';
import ObjectTypeRegistryService from '../../../../services/object-type-registry.js';
import MainMenuService from '../../../app/main-menu.js';
import DocumentModelService from '../../../../models/document-model.js';
import EditorPage from '../../../editor/components/EditorPage.jsx';
import EditorInteractionsService from '../../../editor/services/editor-interactions.js';
import EditorSurfaceService from '../../../editor/services/editor-surface.js';
import EditorToolbarService, { EDITOR_TOOLBAR_SECTIONS } from '../../../editor/services/editor-toolbar.js';
import EditorViewsService from '../../../editor/services/editor-views.js';
import { registerParagraphFormats } from '../../../paragraph-format/quill/paragraph-formats.js';
import TableController from '../../../table/controller.js';
import { getKeyboardEmbedHeight } from '../../../../shared/music-object-layout.js';
import {
	DEFAULT_KEYBOARD_PAYLOAD,
	KEYBOARD_EMBED_BLOT,
	registerKeyboardEmbed,
} from '../keyboard-embed.js';

describe('EditorToolbar', function() {
	let harness;

	beforeEach(function() {
		registerKeyboardEmbed();
		registerParagraphFormats();
	});

	it('loads editor content from the active document tab', function() {
		const {
			documentModel,
			editorInteractions,
			editorSurface,
			editorToolbar,
			actionRegistry,
			localize,
			mainMenu,
			objectTypes,
		} = makeToolbarServices();
		const firstTabId = documentModel.getActiveTabId();
		const secondTab = documentModel.addTab({
			title: 'Second',
			editorContent: {
				ops: [{ insert: 'Second tab\n' }],
			},
		});

		documentModel.updateTab(firstTabId, {
			editorContent: {
				ops: [{ insert: 'First tab\n' }],
			},
		});
		documentModel.setActiveTab(firstTabId);

		harness = createTestHarness()
			.withContext({ localize });

		const result = harness.render(EditorPage, {
			pageView: makePageView(),
			documentModel,
			editorInteractions,
			editorSurface,
			editorToolbar,
			actionRegistry,
			objectTypes,
		});
		const editor = result.container.querySelector('.ql-editor');

		expect(editor.textContent).toContain('First tab');

		act(() => {
			documentModel.setActiveTab(secondTab.id);
		});

		expect(editor.textContent).toContain('Second tab');
	});

	afterEach(function() {
		harness?.unmount();
		harness = null;
	});

	[
		{
			buttonSelector: '[data-toolbar-item-id="music-object.insert.keyboard"]',
			displayMode: 'keyboard',
			label: 'Insert keyboard object',
		},
		{
			buttonSelector: '[data-toolbar-item-id="music-object.insert.staff"]',
			displayMode: 'staff',
			label: 'Insert staff object',
		},
	].forEach(({ buttonSelector, displayMode, label }) => {
		it(`inserts a ${displayMode} music object from the Quill toolbar`, function() {
			const {
				documentModel,
				editorSurface,
				editorToolbar,
				actionRegistry,
				localize,
				objectTypes,
			} = makeToolbarServices();

			harness = createTestHarness()
				.withContext({ localize });

			const result = harness.render(EditorPage, {
				pageView: makePageView(),
				documentModel,
				editorSurface,
				editorToolbar,
				actionRegistry,
				objectTypes,
			});
			const button = result.container.querySelector(buttonSelector);

			act(() => {
				button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
			});

			const embed = result.container.querySelector('.music-keyboard-embed');
			const payload = JSON.parse(embed.dataset.keyboardPayload);
			const dialog = getLatestDialog();
			const contentTypeSelect = dialog.querySelector('.music-keyboard-edit-mode [role="combobox"]');
			const displaySelect = dialog.querySelector('.music-display-options-field [role="combobox"]');

			expect(button).toBeTruthy();
			expect(button.getAttribute('aria-label')).toBe(label);
			expect(button.querySelector('svg')).toBeTruthy();
			expect(payload.displayMode).toBe(displayMode);
			expect(payload.chordId).toBeUndefined();
			expect(payload.displayKey).toBe('C');
			expect(payload.initialEditMode).toBeUndefined();
			expect(payload.label).toBe('C major key');
			expect(payload.notes).toEqual([]);
			expect(payload.openEditor).toBeUndefined();
			expect(contentTypeSelect.textContent).toBe('None');
			expect(dialog.querySelector('.mn-chord-builder')).toBeFalsy();
			expect(displaySelect.textContent).toBe(displayMode === 'keyboard' ? 'Keyboard' : 'Staff');
			expect(getInsertedMusicPayload(result.container).displayMode).toBe(displayMode);

			closeOpenDialog();
		});
	});

	it('inserts the first music object without forcing a leading blank line', function() {
		const {
			documentModel,
			editorInteractions,
			editorSurface,
			editorToolbar,
			actionRegistry,
			localize,
			mainMenu,
			objectTypes,
		} = makeToolbarServices();

		harness = createTestHarness()
			.withContext({ localize });

		const result = harness.render(EditorPage, {
			pageView: makePageView(),
			documentModel,
			editorInteractions,
			editorSurface,
			editorToolbar,
			actionRegistry,
			objectTypes,
		});
		const button = result.container.querySelector('[data-toolbar-item-id="music-object.insert.keyboard"]');

		act(() => {
			button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});

		const content = documentModel.getEditorContent();
		const embedOperationIndex = content.ops.findIndex((operation) => operation.insert?.[KEYBOARD_EMBED_BLOT]);

		expect(embedOperationIndex).toBe(0);
		expect(content.ops[0].attributes).toBeUndefined();

		closeOpenDialog();
	});

	it('inserts a music object inline at the current cursor position', function() {
		const {
			documentModel,
			editorSurface,
			editorToolbar,
			actionRegistry,
			localize,
			mainMenu,
			objectTypes,
		} = makeToolbarServices();
		const insertedObject = documentModel.createObject('music-object', {
			...DEFAULT_KEYBOARD_PAYLOAD,
			id: 'text-line-insert',
			label: 'Inserted',
		});
		const firstTabId = documentModel.getActiveTabId();

		documentModel.updateTab(firstTabId, {
			editorContent: {
				ops: [{ insert: 'Chord Degrees\nNext line\n' }],
			},
		});

		harness = createTestHarness()
			.withContext({ localize });

		const result = harness.render(EditorPage, {
			pageView: makePageView(),
			documentModel,
			editorSurface,
			editorToolbar,
			actionRegistry,
			objectTypes,
		});
		const quill = Quill.find(result.container.querySelector('.ql-container'));

		act(() => {
			quill.setSelection(3, 0, 'user');
			editorSurface.insertObject(insertedObject);
		});

		expect(quill.getContents().ops).toEqual([
			{ insert: 'Cho' },
			{
				insert: {
					[KEYBOARD_EMBED_BLOT]: jasmine.objectContaining({
						id: insertedObject.id,
						label: 'Inserted',
					}),
				},
			},
			{ insert: '\nrd Degrees\nNext line\n' },
		]);
	});

	it('inserts a new music object before the selected music object paragraph', function() {
		const {
			documentModel,
			editorSurface,
			editorToolbar,
			actionRegistry,
			localize,
			objectTypes,
		} = makeToolbarServices();
		const firstObject = documentModel.createObject('music-object', {
			...DEFAULT_KEYBOARD_PAYLOAD,
			id: 'gap-insert-left',
			label: 'Left',
		});
		const secondObject = documentModel.createObject('music-object', {
			...DEFAULT_KEYBOARD_PAYLOAD,
			id: 'gap-insert-right',
			label: 'Right',
		});
		const insertedObject = documentModel.createObject('music-object', {
			...DEFAULT_KEYBOARD_PAYLOAD,
			id: 'gap-insert-new',
			label: 'Inserted',
		});
		const firstTabId = documentModel.getActiveTabId();

		documentModel.updateTab(firstTabId, {
			editorContent: {
				ops: [
					{ insert: { [KEYBOARD_EMBED_BLOT]: firstObject.data } },
					{ insert: '\n' },
					{ insert: { [KEYBOARD_EMBED_BLOT]: secondObject.data } },
					{ insert: '\n' },
				],
			},
		});

		harness = createTestHarness()
			.withContext({ localize });

		const result = harness.render(EditorPage, {
			pageView: makePageView(),
			documentModel,
			editorSurface,
			editorToolbar,
			actionRegistry,
			objectTypes,
		});
		const quill = Quill.find(result.container.querySelector('.ql-container'));
		const embeds = result.container.querySelectorAll('.music-keyboard-embed');
		const secondIndex = quill.getIndex(Quill.find(embeds[1]));

		act(() => {
			quill.setSelection(secondIndex, 0, 'user');
			editorSurface.insertObject(insertedObject);
		});

		const musicOps = quill.getContents().ops
			.filter((operation) => operation.insert?.[KEYBOARD_EMBED_BLOT])
			.map((operation) => operation.insert[KEYBOARD_EMBED_BLOT].id);

		expect(musicOps).toEqual([firstObject.data.id, insertedObject.id, secondObject.data.id]);
	});

	it('spikes music objects inside table cells', function() {
		const {
			documentModel,
			editorInteractions,
			editorSurface,
			editorToolbar,
			actionRegistry,
			localize,
			mainMenu,
			objectTypes,
		} = makeToolbarServices();
		const staffObject = documentModel.createObject('music-object', {
			...DEFAULT_KEYBOARD_PAYLOAD,
			displayMode: 'staff',
			id: 'table-staff',
			label: 'Table staff',
		});
		const keyboardObject = documentModel.createObject('music-object', {
			...DEFAULT_KEYBOARD_PAYLOAD,
			id: 'table-keyboard',
			label: 'Table keyboard',
			width: 900,
		});

		harness = createTestHarness()
			.withContext({ localize });

		const result = harness.render(EditorPage, {
			pageView: makePageView(),
			documentModel,
			editorInteractions,
			editorSurface,
			editorToolbar,
			actionRegistry,
			objectTypes,
		});
		const quill = Quill.find(result.container.querySelector('.ql-container'));

		act(() => {
			quill.focus();
			quill.setSelection(0, 0, 'user');
			mainMenu.selectItem('insert', 'table.menu.insert');
		});

		const cellInners = result.container.querySelectorAll('.ql-table-cell-inner');

		expect(result.container.querySelector('.ql-table')).toBeTruthy();
		expect(cellInners.length).toBe(2);

		act(() => {
			quill.setSelection(quill.getIndex(Quill.find(cellInners[0])), 0, 'user');
			editorSurface.insertObject(staffObject);
		});

		act(() => {
			quill.setSelection(quill.getIndex(Quill.find(cellInners[1])), 0, 'user');
			editorSurface.insertObject(keyboardObject);
		});

		const embeds = result.container.querySelectorAll('.music-keyboard-embed');
		const musicOps = quill.getContents().ops
			.filter((operation) => operation.insert?.[KEYBOARD_EMBED_BLOT])
			.map((operation) => operation.insert[KEYBOARD_EMBED_BLOT]);

		expect(embeds.length).toBe(2);
		expect(embeds[0].closest('.ql-table-cell')).toBeTruthy();
		expect(embeds[1].closest('.ql-table-cell')).toBeTruthy();
		expect(embeds[1].classList.contains('music-keyboard-embed--fit-table-cell')).toBe(true);
		expect(embeds[0].querySelector('.music-embed-resize-handle')).toBeFalsy();
		expect(embeds[1].querySelector('.music-embed-resize-handle')).toBeFalsy();
		expect(embeds[0].closest('.ql-table-cell-inner').classList.contains('music-keyboard-embed-cell--fit-width')).toBe(false);
		expect(embeds[1].closest('.ql-table-cell-inner').classList.contains('music-keyboard-embed-cell--fit-width')).toBe(true);
		const fittedKeyboardWidth = Number.parseInt(embeds[1].style.getPropertyValue('--music-embed-width'), 10);

		expect(fittedKeyboardWidth).toBeGreaterThan(0);
		expect(fittedKeyboardWidth).toBeLessThan(900);
		expect(embeds[1].style.getPropertyValue('--music-embed-height')).toBe(`${getKeyboardEmbedHeight(musicOps[1], fittedKeyboardWidth)}px`);
		expect(musicOps.map((payload) => payload.id)).toEqual([staffObject.id, keyboardObject.id]);
		expect(musicOps.map((payload) => payload.displayMode)).toEqual(['staff', 'keyboard']);
		expect(musicOps[1].width).toBe(900);
		expect(musicOps[1].scale).toBeUndefined();
		expect(quill.getContents().ops.some((operation) => operation.attributes?.['table-up-cell-inner'])).toBe(true);

		const keyboardEmbedIndex = quill.getIndex(Quill.find(embeds[1]));

		act(() => {
			quill.setSelection(keyboardEmbedIndex + 1, 0, 'user');
			quill.root.dispatchEvent(new KeyboardEvent('keydown', {
				bubbles: true,
				cancelable: true,
				code: 'Backspace',
				key: 'Backspace',
				keyCode: 8,
				which: 8,
			}));
		});

		expect(quill.getContents().ops
			.filter((operation) => operation.insert?.[KEYBOARD_EMBED_BLOT])
			.map((operation) => operation.insert[KEYBOARD_EMBED_BLOT].id)).toEqual([staffObject.id]);
	});

	it('marks the music object when the Quill selection includes the embed', function() {
		const {
			documentModel,
			editorSurface,
			editorToolbar,
			actionRegistry,
			localize,
			objectTypes,
		} = makeToolbarServices();

		harness = createTestHarness()
			.withContext({ localize });

		const result = harness.render(EditorPage, {
			pageView: makePageView(),
			documentModel,
			editorSurface,
			editorToolbar,
			actionRegistry,
			objectTypes,
		});
		const button = result.container.querySelector('[data-toolbar-item-id="music-object.insert.keyboard"]');

		act(() => {
			button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});

		closeOpenDialog();

		const quill = Quill.find(result.container.querySelector('.ql-container'));
		const embed = result.container.querySelector('.music-keyboard-embed');
		const content = result.container.querySelector('.music-keyboard-embed-content');

		act(() => {
			quill.setSelection(0, 1, 'user');
		});

		expect(embed.classList.contains('music-keyboard-embed--selected')).toBe(true);
		expect(content.classList.contains('music-keyboard-embed-content--selected')).toBe(true);

		act(() => {
			quill.setSelection(0, 0, 'user');
		});

		expect(embed.classList.contains('music-keyboard-embed--selected')).toBe(false);
		expect(content.classList.contains('music-keyboard-embed-content--selected')).toBe(false);

		act(() => {
			quill.setSelection(0, 0, 'user');
		});

		expect(embed.classList.contains('music-keyboard-embed--selected')).toBe(false);
		expect(content.classList.contains('music-keyboard-embed-content--selected')).toBe(false);
	});

});

function TestIcon() {
	return <svg viewBox="0 0 18 18"><path d="M1 1h16v16H1z" /></svg>;
}

function makeToolbarServices() {
	const registry = new Registry();
	const documentModel = new DocumentModelService(registry);
	const editorSurface = new EditorSurfaceService(registry);
	const editorInteractions = new EditorInteractionsService(registry);
	const editorToolbar = new EditorToolbarService(registry);
	const editorViews = new EditorViewsService(registry);
	const actionRegistry = new ActionRegistryService(registry);
	const mainMenu = new MainMenuService(registry);
	const objectTypes = new ObjectTypeRegistryService(registry);
	const tableController = new TableController(registry);
	const localize = {
		translate(phrase) {
			const phrases = {
				'editor.insert_keyboard_object': 'Insert keyboard object',
				'editor.insert_staff_object': 'Insert staff object',
				'music.display.keyboard': 'Keyboard',
				'music.display.staff': 'Staff',
				'music.edit_mode.none': 'None',
			};

			return phrases[phrase] || phrase;
		},
	};

	documentModel.start();
	editorSurface.start();
	editorInteractions.start();
	editorToolbar.start();
	editorViews.start();
	actionRegistry.start();
	mainMenu.start();
	objectTypes.start();
	mainMenu.addMainItem(200, 'insert', 'app.menu.insert');
	tableController.ready();
	actionRegistry.registerAction('music-object.insert.keyboard', TestIcon, 'default', 'editor.insert_keyboard_object');
	actionRegistry.registerAction('music-object.insert.staff', TestIcon, 'default', 'editor.insert_staff_object');
	objectTypes.registerType('music-object', {
		blotName: KEYBOARD_EMBED_BLOT,
		createDefaultObject: (options = {}) => ({
			type: 'music-object',
			data: {
				...DEFAULT_KEYBOARD_PAYLOAD,
				chordId: '',
				displayMode: options.displayMode === 'staff' ? 'staff' : 'keyboard',
				displayKey: 'C',
				initialEditMode: 'none',
				label: 'C major key',
				notes: [],
				openEditor: true,
				rootNote: '',
			},
		}),
		toEmbedValue: (object) => ({
			...(object.data || {}),
			id: object.id,
		}),
	});
	editorToolbar.addItem(EDITOR_TOOLBAR_SECTIONS.INSERT, 100, 'music-object.insert.keyboard', 'editor.insert_keyboard_object', 'music-object.insert.keyboard', {
		commandId: 'music-object.insert',
		commandPayload: { displayMode: 'keyboard' },
	});
	editorToolbar.addItem(EDITOR_TOOLBAR_SECTIONS.INSERT, 200, 'music-object.insert.staff', 'editor.insert_staff_object', 'music-object.insert.staff', {
		commandId: 'music-object.insert',
		commandPayload: { displayMode: 'staff' },
	});
	editorToolbar.listen('item-selected', (event) => {
		const definition = objectTypes.getType('music-object');
		const partialObject = definition.createDefaultObject(event.item.commandPayload || {});
		const object = documentModel.createObject('music-object', partialObject.data, partialObject);

		editorSurface.insertObject(object);
	});

	return {
		documentModel,
		editorInteractions,
		editorSurface,
		editorToolbar,
		actionRegistry,
		localize,
		mainMenu,
		objectTypes,
		tableController,
	};
}

function getLatestDialog() {
	const dialogs = Array.from(document.body.querySelectorAll('[role="dialog"]'));
	return dialogs[dialogs.length - 1];
}

function closeOpenDialog() {
	const dialog = getLatestDialog();
	const doneButton = dialog?.querySelector('#done');

	if (!doneButton) {
		return;
	}

	act(() => {
		doneButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
	});
}

function makePageView() {
	return {
		getState() {
			return {
				document: {
					ops: [{ insert: 'Start\n' }],
				},
				insertKeyboardObjectLabel: 'Insert keyboard object',
				insertStaffObjectLabel: 'Insert staff object',
				placeholder: 'Write...',
				status: 'POC',
				title: 'Notebook',
			};
		},
		listen() {},
		unlisten() {},
	};
}

function getInsertedMusicPayload(container) {
	const embed = container.querySelector('.music-keyboard-embed');

	return JSON.parse(embed.dataset.keyboardPayload);
}
