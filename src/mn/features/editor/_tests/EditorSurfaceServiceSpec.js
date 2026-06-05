import { Registry } from '@polylith/core';
import EditorSurfaceService from '../services/editor-surface.js';

describe('EditorSurfaceService', function() {
	function createService() {
		const registry = new Registry();
		const service = new EditorSurfaceService(registry);

		service.start();
		return service;
	}

	it('delegates editor operations to the attached surface', function() {
		const service = createService();
		const calls = [];
		const editorRoot = document.createElement('div');
		const leaf = { id: 'leaf-1' };
		const line = { id: 'line-1' };
		const module = { id: 'module-1' };
		const quill = { id: 'quill-1' };
		const blot = { id: 'blot-1' };
		const node = document.createElement('span');
		const surface = {
			insertObject(object) {
				calls.push(['insertObject', object]);
				return object.id;
			},
			insertPageBreak() {
				calls.push(['insertPageBreak']);
				return true;
			},
			format(commandId, value) {
				calls.push(['format', commandId, value]);
				return true;
			},
			getContentWidth() {
				return 640;
			},
			getSelection() {
				return { index: 1, length: 0 };
			},
			getQuill() {
				return quill;
			},
			getQuillModule(name) {
				calls.push(['getQuillModule', name]);
				return module;
			},
			getEditorRoot() {
				return editorRoot;
			},
			findBlot(target, bubble) {
				calls.push(['findBlot', target, bubble]);
				return blot;
			},
			getIndex(targetBlot) {
				calls.push(['getIndex', targetBlot]);
				return 0;
			},
			getLine(index) {
				calls.push(['getLine', index]);
				return line;
			},
			getLeaf(index) {
				calls.push(['getLeaf', index]);
				return leaf;
			},
			setSelection(index, length, source) {
				calls.push(['setSelection', index, length, source]);
				return true;
			},
			focus(options) {
				calls.push(['focus', options]);
				return true;
			},
			update(source) {
				calls.push(['update', source]);
				return true;
			},
			getParagraphFormat() {
				return {
					alignment: 'center',
					bold: true,
					fontSize: 18,
					italic: false,
					start: 'full-line',
					underline: true,
				};
			},
			formatParagraph(format) {
				calls.push(['formatParagraph', format]);
				return format;
			},
			redo() {
				calls.push(['redo']);
				return true;
			},
			undo() {
				calls.push(['undo']);
				return true;
			},
		};

		service.attachSurface(surface);

		expect(service.insertObject({ id: 'object-1' })).toBe('object-1');
		expect(service.insertPageBreak()).toBeTrue();
		expect(service.format('editor.format.bold', true)).toBeTrue();
		expect(service.undo()).toBeTrue();
		expect(service.redo()).toBeTrue();
		expect(service.getContentWidth()).toBe(640);
		expect(service.getSelection()).toEqual({ index: 1, length: 0 });
		expect(service.getQuill()).toBe(quill);
		expect(service.getQuillModule('table-up')).toBe(module);
		expect(service.getEditorRoot()).toBe(editorRoot);
		expect(service.findBlot(node, false)).toBe(blot);
		expect(service.getIndex(blot)).toBe(0);
		expect(service.getLine(2)).toBe(line);
		expect(service.getLeaf(3)).toBe(leaf);
		expect(service.setSelection(4, 5, 'user')).toBeTrue();
		expect(service.focus({ preventScroll: true })).toBeTrue();
		expect(service.update('silent')).toBeTrue();
		expect(service.getParagraphFormat()).toEqual({
			alignment: 'center',
			bold: true,
			fontSize: 18,
			italic: false,
			start: 'full-line',
			underline: true,
		});
		expect(service.formatParagraph({
			alignment: 'right',
			bold: false,
			fontSize: 14,
			italic: true,
			start: 'next-page',
			underline: false,
		})).toEqual({
			alignment: 'right',
			bold: false,
			fontSize: 14,
			italic: true,
			start: 'next-page',
			underline: false,
		});
		expect(calls).toEqual([
			['insertObject', { id: 'object-1' }],
			['insertPageBreak'],
			['format', 'editor.format.bold', true],
			['undo'],
			['redo'],
			['getQuillModule', 'table-up'],
			['findBlot', node, false],
			['getIndex', blot],
			['getLine', 2],
			['getLeaf', 3],
			['setSelection', 4, 5, 'user'],
			['focus', { preventScroll: true }],
			['update', 'silent'],
			['formatParagraph', {
				alignment: 'right',
				bold: false,
				fontSize: 14,
				italic: true,
				start: 'next-page',
				underline: false,
			}],
		]);
	});

	it('detaches only the active surface', function() {
		const service = createService();
		const surface = {};

		service.attachSurface(surface);

		expect(service.detachSurface({})).toBeFalse();
		expect(service.detachSurface(surface)).toBeTrue();
		expect(service.insertObject({ id: 'object-1' })).toBeNull();
		expect(service.insertPageBreak()).toBeFalse();
		expect(service.getContentWidth()).toBeNull();
		expect(service.getQuill()).toBeNull();
		expect(service.getQuillModule('table-up')).toBeNull();
		expect(service.getEditorRoot()).toBeNull();
		expect(service.findBlot(document.createElement('span'))).toBeNull();
		expect(service.getIndex({})).toBeNull();
		expect(service.getLine(0)).toBeNull();
		expect(service.getLeaf(0)).toBeNull();
		expect(service.setSelection(0)).toBeFalse();
		expect(service.focus()).toBeFalse();
		expect(service.update()).toBeFalse();
	});
});
