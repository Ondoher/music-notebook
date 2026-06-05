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
			'insertPageBreak',
			'updateObject',
			'removeObject',
			'getContentWidth',
			'getSelection',
			'getQuill',
			'getQuillModule',
			'getEditorRoot',
			'findBlot',
			'getIndex',
			'getLine',
			'getLeaf',
			'setSelection',
			'focus',
			'update',
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
	 * Gets the active Quill instance when the current editor uses Quill.
	 *
	 * @returns {unknown | null} Active Quill instance, or null when unavailable.
	 */
	getQuill() {
		return this.surface?.getQuill?.() || null;
	}

	/**
	 * Gets a live module from the active editor by module name.
	 *
	 * @param {string} name - Quill module name.
	 * @returns {unknown | null} Live module instance, or null when unavailable.
	 */
	getQuillModule(name) {
		return this.surface?.getQuillModule?.(name) || null;
	}

	/**
	 * Gets the active editor root element.
	 *
	 * @returns {HTMLElement | null} Editor root, or null when unavailable.
	 */
	getEditorRoot() {
		return this.surface?.getEditorRoot?.() || null;
	}

	/**
	 * Resolves an editor blot from a DOM node.
	 *
	 * @param {Node} node - DOM node to resolve.
	 * @param {boolean} [bubble=true] - Whether to search ancestor nodes.
	 * @returns {unknown | null} Matching blot, or null when unavailable.
	 */
	findBlot(node, bubble = true) {
		return this.surface?.findBlot?.(node, bubble) || null;
	}

	/**
	 * Gets the document index for an editor blot.
	 *
	 * @param {unknown} blot - Editor blot.
	 * @returns {number | null} Document index, or null when unavailable.
	 */
	getIndex(blot) {
		return this.surface?.getIndex?.(blot) ?? null;
	}

	/**
	 * Gets the editor line at a document index.
	 *
	 * @param {number} index - Document index.
	 * @returns {unknown | null} Line result, or null when unavailable.
	 */
	getLine(index) {
		return this.surface?.getLine?.(index) || null;
	}

	/**
	 * Gets the editor leaf at a document index.
	 *
	 * @param {number} index - Document index.
	 * @returns {unknown | null} Leaf result, or null when unavailable.
	 */
	getLeaf(index) {
		return this.surface?.getLeaf?.(index) || null;
	}

	/**
	 * Sets the active editor selection.
	 *
	 * @param {number} index - Selection index.
	 * @param {number} [length=0] - Selection length.
	 * @param {string} [source='api'] - Editor change source.
	 * @returns {boolean} True when a surface handled the selection change.
	 */
	setSelection(index, length = 0, source = 'api') {
		return this.surface?.setSelection?.(index, length, source) === true;
	}

	/**
	 * Focuses the active editor.
	 *
	 * @param {Record<string, unknown>} [options=undefined] - Optional editor focus options.
	 * @returns {boolean} True when a surface handled focus.
	 */
	focus(options = undefined) {
		return this.surface?.focus?.(options) === true;
	}

	/**
	 * Requests an active editor update.
	 *
	 * @param {string} [source='api'] - Editor update source.
	 * @returns {boolean} True when a surface handled the update.
	 */
	update(source = 'api') {
		return this.surface?.update?.(source) === true;
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
