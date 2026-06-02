import { Service } from '@polylith/core';

/**
 * Exposes active editor operations through a stable registry service.
 *
 * The editor feature owns the concrete editor implementation. Other features use
 * this service to issue editor commands without importing Quill or editor views.
 *
 * @extends {Service}
 */
export default class EditorSurfaceService extends Service {
	/**
	 * Creates the editor surface service.
	 *
	 * @param {Registry} registry - Polylith service registry.
	 */
	constructor(registry) {
		super('editor-surface', registry);
		this.implement([
			'start',
			'attachSurface',
			'detachSurface',
			'insertObject',
			'insertTable',
			'insertPageBreak',
			'updateObject',
			'removeObject',
			'getContentWidth',
			'getSelection',
			'getParagraphFormat',
			'format',
			'formatParagraph',
			'redo',
			'undo',
		]);
	}

	/**
	 * Initializes service state.
	 *
	 * @returns {void}
	 */
	start() {
		this.surface = null;
	}

	/**
	 * Attaches the currently active editor surface adapter.
	 *
	 * @param {EditorSurfaceAdapter | null | undefined} surface - Adapter exposed by the mounted editor view.
	 * @returns {EditorSurfaceAdapter | null} The attached surface, or null when no surface is active.
	 */
	attachSurface(surface) {
		this.surface = surface || null;
		this.fire('surface-attached', this.surface);
		return this.surface;
	}

	/**
	 * Detaches the active editor surface adapter.
	 *
	 * Passing a surface guards against detaching a newer active editor instance.
	 *
	 * @param {EditorSurfaceAdapter | null | undefined} [surface=this.surface] - Surface expected to be active.
	 * @returns {boolean} True when the active surface was detached.
	 */
	detachSurface(surface = this.surface) {
		if (surface && this.surface !== surface) {
			return false;
		}

		this.surface = null;
		this.fire('surface-detached');
		return true;
	}

	/**
	 * Inserts a document object into the active editor.
	 *
	 * @param {NotebookDocumentObject} object - Object to insert.
	 * @param {Record<string, unknown>} [options={}] - Optional insert hints for the active editor.
	 * @returns {unknown | null} Insert result from the active editor, or null when no editor is attached.
	 */
	insertObject(object, options = {}) {
		return this.surface?.insertObject?.(object, options) || null;
	}

	/**
	 * Inserts a table into the active editor.
	 *
	 * @param {number} [rows=2] - Number of table rows.
	 * @param {number} [columns=2] - Number of table columns.
	 * @returns {boolean} True when the active editor inserted a table.
	 */
	insertTable(rows = 2, columns = 2) {
		return this.surface?.insertTable?.(rows, columns) || false;
	}

	/**
	 * Inserts a manual page break at the active editor selection.
	 *
	 * @returns {boolean} True when the active editor inserted a page break.
	 */
	insertPageBreak() {
		return this.surface?.insertPageBreak?.() || false;
	}

	/**
	 * Updates an object already known to the active editor.
	 *
	 * @param {string} objectId - Object id to update.
	 * @param {Partial<NotebookDocumentObject>} [patch={}] - Object fields to update.
	 * @returns {NotebookDocumentObject | null} Updated object, or null when unavailable.
	 */
	updateObject(objectId, patch = {}) {
		return this.surface?.updateObject?.(objectId, patch) || null;
	}

	/**
	 * Removes an object from the active editor.
	 *
	 * @param {string} objectId - Object id to remove.
	 * @returns {boolean} True when the object was removed.
	 */
	removeObject(objectId) {
		return this.surface?.removeObject?.(objectId) || false;
	}

	/**
	 * Gets the editable content width from the active editor.
	 *
	 * @returns {number | null} Content width in pixels, or null when unavailable.
	 */
	getContentWidth() {
		return this.surface?.getContentWidth?.() || null;
	}

	/**
	 * Gets the active editor selection.
	 *
	 * @returns {unknown | null} Editor-specific selection snapshot, or null when unavailable.
	 */
	getSelection() {
		return this.surface?.getSelection?.() || null;
	}

	/**
	 * Gets paragraph formatting for the current selection.
	 *
	 * @returns {ParagraphFormatSettings | null} Current paragraph format, or null when unavailable.
	 */
	getParagraphFormat() {
		return this.surface?.getParagraphFormat?.() || null;
	}

	/**
	 * Applies an editor formatting command.
	 *
	 * @param {string} commandId - Formatting command id.
	 * @param {unknown} [value=undefined] - Optional command value.
	 * @returns {unknown | null} Command result from the active editor, or null when unavailable.
	 */
	format(commandId, value = undefined) {
		return this.surface?.format?.(commandId, value) || null;
	}

	/**
	 * Applies paragraph formatting to the current paragraph or selected paragraphs.
	 *
	 * @param {Partial<ParagraphFormatSettings>} [format={}] - Paragraph formatting patch.
	 * @returns {ParagraphFormatSettings | null} Updated paragraph format, or null when unavailable.
	 */
	formatParagraph(format = {}) {
		return this.surface?.formatParagraph?.(format) || null;
	}

	/**
	 * Undoes the most recent active editor change.
	 *
	 * @returns {boolean} True when an undo operation was handled.
	 */
	undo() {
		return this.surface?.undo?.() || false;
	}

	/**
	 * Redoes the most recent active editor change.
	 *
	 * @returns {boolean} True when a redo operation was handled.
	 */
	redo() {
		return this.surface?.redo?.() || false;
	}
}

new EditorSurfaceService();
