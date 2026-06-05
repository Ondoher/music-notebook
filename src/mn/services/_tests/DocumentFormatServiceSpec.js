import { Registry } from '@polylith/core';
import DocumentModelService from '../../models/document-model.js';
import DocumentFormatService from '../document-format.js';

describe('DocumentFormatService', function() {
	function createServices() {
		const registry = new Registry();
		const documentModel = new DocumentModelService(registry);
		const documentFormat = new DocumentFormatService(registry);

		documentModel.start();
		documentFormat.start();
		documentFormat.ready();
		return { documentModel, documentFormat };
	}

	it('applies normalized document-format settings to the document model', function() {
		const { documentModel, documentFormat } = createServices();
		const applied = [];

		documentFormat.listen('format-applied', (format) => applied.push(format));

		const format = documentFormat.applyFormat({
			size: 'legal',
			orientation: 'landscape',
			fontSize: 18,
			margins: {
				top: 36,
				right: 54,
				bottom: 72,
				left: 90,
			},
		});

		expect(format).toEqual({
			size: 'legal',
			orientation: 'landscape',
			fontSize: 18,
			margins: {
				top: 36,
				right: 54,
				bottom: 72,
				left: 90,
			},
		});
		expect(documentModel.getSettings().page).toEqual({
			size: 'legal',
			orientation: 'landscape',
			margins: {
				top: 36,
				right: 54,
				bottom: 72,
				left: 90,
			},
		});
		expect(documentModel.getSettings().typography.fontSize).toBe(18);
		expect(applied[0]).toEqual(format);
	});

	it('normalizes invalid document-format values', function() {
		const { documentFormat } = createServices();

		expect(documentFormat.normalizeFormat({
			size: 'tabloid',
			orientation: 'sideways',
			fontSize: 999,
			margins: {
				top: -1,
				right: 999,
				bottom: 'bad',
				left: 36,
			},
		})).toEqual({
			size: 'letter',
			orientation: 'portrait',
			fontSize: 144,
			margins: {
				top: 0,
				right: 288,
				bottom: 72,
				left: 36,
			},
		});
	});

	it('calculates content width from page size and document margins', function() {
		const { documentFormat } = createServices();

		expect(documentFormat.getContentWidth({
			size: 'letter',
			orientation: 'portrait',
			margins: {
				top: 72,
				right: 72,
				bottom: 72,
				left: 72,
			},
		})).toBe(624);
		expect(documentFormat.getContentWidth({
			size: 'legal',
			orientation: 'landscape',
			margins: {
				top: 36,
				right: 54,
				bottom: 36,
				left: 90,
			},
		})).toBe(1152);
	});

	it('undoes and redoes document-format settings changes', function() {
		const { documentModel, documentFormat } = createServices();

		expect(documentFormat.canUndo()).toBeFalse();
		expect(documentFormat.canRedo()).toBeFalse();

		documentFormat.applyFormat({
			size: 'legal',
			orientation: 'landscape',
			fontSize: 18,
			margins: {
				top: 36,
				right: 54,
				bottom: 72,
				left: 90,
			},
		});

		expect(documentFormat.canUndo()).toBeTrue();
		expect(documentFormat.undo()).toEqual({
			size: 'letter',
			orientation: 'portrait',
			fontSize: 12,
			margins: {
				top: 72,
				right: 72,
				bottom: 72,
				left: 72,
			},
		});
		expect(documentModel.getSettings().page.size).toBe('letter');
		expect(documentModel.getSettings().typography.fontSize).toBe(12);
		expect(documentFormat.canRedo()).toBeTrue();

		expect(documentFormat.redo()).toEqual({
			size: 'legal',
			orientation: 'landscape',
			fontSize: 18,
			margins: {
				top: 36,
				right: 54,
				bottom: 72,
				left: 90,
			},
		});
		expect(documentModel.getSettings().page.size).toBe('legal');
		expect(documentModel.getSettings().typography.fontSize).toBe(18);
	});
});
