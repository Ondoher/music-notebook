import { Service } from '@polylith/core';

const DEFAULT_FORMAT = Object.freeze({
	size: 'letter',
	orientation: 'portrait',
	fontSize: 12,
	margins: Object.freeze({
		top: 72,
		right: 72,
		bottom: 72,
		left: 72,
	}),
});
const SUPPORTED_PAGE_SIZES = Object.freeze(['letter', 'legal', 'a4', 'a5']);

export default class DocumentFormatService extends Service {
	constructor(registry) {
		super('document-format', registry);
		this.implement([
			'start',
			'ready',
			'normalizeMargin',
			'normalizeFormat',
			'getFormat',
			'applyFormat',
			'canRedo',
			'canUndo',
			'redo',
			'undo',
		]);
	}

	start() {
		this.documentModel = null;
		this.redoStack = [];
		this.undoStack = [];
	}

	ready() {
		this.documentModel = this.registry.subscribe('document-model');
		this.documentLoadedListener = this.documentModel?.listen?.('document-loaded', () => {
			this.redoStack = [];
			this.undoStack = [];
		});
	}

	clone(value) {
		if (value === undefined || value === null) {
			return value;
		}

		if (typeof structuredClone === 'function') {
			return structuredClone(value);
		}

		return JSON.parse(JSON.stringify(value));
	}

	normalizeMargin(value, fallback) {
		const number = Number(value);

		if (!Number.isFinite(number)) {
			return fallback;
		}

		return Math.max(0, Math.min(288, number));
	}

	normalizeFontSize(value, fallback = DEFAULT_FORMAT.fontSize) {
		const number = Number(value);

		if (!Number.isFinite(number)) {
			return fallback;
		}

		return Math.min(Math.max(Math.round(number), 6), 144);
	}

	normalizeFormat(format = {}) {
		const current = {
			...DEFAULT_FORMAT,
			...(format || {}),
			margins: {
				...DEFAULT_FORMAT.margins,
				...(format?.margins || {}),
			},
		};

		return {
			size: SUPPORTED_PAGE_SIZES.includes(current.size) ? current.size : 'letter',
			orientation: current.orientation === 'landscape' ? 'landscape' : 'portrait',
			fontSize: this.normalizeFontSize(current.fontSize, DEFAULT_FORMAT.fontSize),
			margins: {
				top: this.normalizeMargin(current.margins.top, DEFAULT_FORMAT.margins.top),
				right: this.normalizeMargin(current.margins.right, DEFAULT_FORMAT.margins.right),
				bottom: this.normalizeMargin(current.margins.bottom, DEFAULT_FORMAT.margins.bottom),
				left: this.normalizeMargin(current.margins.left, DEFAULT_FORMAT.margins.left),
			},
		};
	}

	getFormat() {
		const settings = this.documentModel?.getSettings?.() || {};

		return this.normalizeFormat({
			...(settings.page || DEFAULT_FORMAT),
			fontSize: settings.typography?.fontSize,
		});
	}

	applyFormat(format = {}) {
		const previousFormat = this.getFormat();
		const nextFormat = this.normalizeFormat(format);

		this.applyNormalizedFormat(nextFormat);

		if (!areFormatsEqual(previousFormat, nextFormat)) {
			this.undoStack.push({
				next: this.clone(nextFormat),
				previous: this.clone(previousFormat),
			});
			this.redoStack = [];
		}

		this.fire('format-applied', nextFormat);
		return nextFormat;
	}

	applyNormalizedFormat(format) {
		const nextFormat = this.normalizeFormat(format);
		const { fontSize, ...page } = nextFormat;

		this.documentModel?.updateSettings?.({
			page,
			typography: {
				fontSize,
			},
		});

		return nextFormat;
	}

	canUndo() {
		return this.undoStack.length > 0;
	}

	canRedo() {
		return this.redoStack.length > 0;
	}

	undo() {
		const entry = this.undoStack.pop();

		if (!entry) {
			return null;
		}

		const format = this.applyNormalizedFormat(entry.previous);

		this.redoStack.push(entry);
		this.fire('format-undone', format);
		return format;
	}

	redo() {
		const entry = this.redoStack.pop();

		if (!entry) {
			return null;
		}

		const format = this.applyNormalizedFormat(entry.next);

		this.undoStack.push(entry);
		this.fire('format-redone', format);
		return format;
	}
}

new DocumentFormatService();

function areFormatsEqual(left, right) {
	return JSON.stringify(left) === JSON.stringify(right);
}
