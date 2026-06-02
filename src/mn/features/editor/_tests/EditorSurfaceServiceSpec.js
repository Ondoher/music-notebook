import { Registry } from '@polylith/core';
import EditorSurfaceService from '../editor-surface.js';

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
	});
});
