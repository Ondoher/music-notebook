import React from 'react';
import { Service } from '@polylith/core';
import FormatAlignCenterIcon from '@mui/icons-material/FormatAlignCenter';
import FormatAlignJustifyIcon from '@mui/icons-material/FormatAlignJustify';
import FormatAlignLeftIcon from '@mui/icons-material/FormatAlignLeft';
import FormatAlignRightIcon from '@mui/icons-material/FormatAlignRight';
import { EDITOR_TOOLBAR_SECTIONS } from '../editor/services/editor-toolbar.js';
import ParagraphFormatDialog from './components/ParagraphFormatDialog.jsx';
import { registerParagraphFormats } from './quill/paragraph-formats.js';

const PARAGRAPH_MENU_ITEM_ID = 'paragraph_format.menu.paragraph';
const PAGE_BREAK_MENU_ITEM_ID = 'paragraph_format.menu.page_break';

/**
 * Registers paragraph-format commands and owns the paragraph-format dialog host.
 */
export default class ParagraphFormatController extends Service {
	constructor(registry) {
		super('paragraph-format-controller', registry);
		this.implement(['ready', 'getComponent', 'insertPageBreak']);
		this.dialogOpen = false;
	}

	ready() {
		registerParagraphFormats();
		this.mainMenu = this.registry.subscribe('main-menu');
		this.editorToolbar = this.registry.subscribe('editor-toolbar');
		this.editorSurface = this.registry.subscribe('editor-surface');
		this.actionRegistry = this.registry.subscribe('action-registry');
		this.documentModel = this.registry.subscribe('document-model');
		this.formatMenuItemsRegistered = false;
		this.insertMenuItemsRegistered = false;
		this.menuSelectedListener = this.mainMenu.listen(
			'item-selected',
			this.onMenuItemSelected.bind(this),
		);
		this.toolbarSelectedListener = this.editorToolbar.listen(
			'item-selected',
			this.onToolbarItemSelected.bind(this),
		);
		this.mainItemAddedListener = this.mainMenu.listen(
			'main-item-added',
			this.onMainMenuItemAdded.bind(this),
		);
		this.documentChangedListener = this.documentModel?.listen?.(
			'document-changed',
			this.onDocumentChanged.bind(this),
		);
		this.documentLoadedListener = this.documentModel?.listen?.(
			'document-loaded',
			this.onDocumentChanged.bind(this),
		);

		this.registerToolbarActions();
		this.registerToolbarItems();
		this.registerMenuItems();
	}

	registerToolbarActions() {
		this.actionRegistry.registerAction('paragraph.align.left', FormatAlignLeftIcon, 'default', 'paragraph_format.alignment.left');
		this.actionRegistry.registerAction('paragraph.align.center', FormatAlignCenterIcon, 'default', 'paragraph_format.alignment.center');
		this.actionRegistry.registerAction('paragraph.align.right', FormatAlignRightIcon, 'default', 'paragraph_format.alignment.right');
		this.actionRegistry.registerAction('paragraph.align.justify', FormatAlignJustifyIcon, 'default', 'paragraph_format.alignment.justify');
	}

	registerToolbarItems() {
		this.editorToolbar.addItem(EDITOR_TOOLBAR_SECTIONS.PARAGRAPH, 50, 'paragraph.style', 'paragraph_format.style', '', {
			commandId: 'paragraph.format.style',
			controlType: 'select',
			options: this.getStyleOptions(),
			ownerFeature: 'paragraph-format',
			value: this.getFormat().styleId,
		});
		this.editorToolbar.addItem(EDITOR_TOOLBAR_SECTIONS.PARAGRAPH, 100, 'paragraph.font-size', 'paragraph_format.font_size', '', {
			commandId: 'paragraph.format.font-size',
			controlType: 'font-size',
			ownerFeature: 'paragraph-format',
			value: this.getFormat().fontSize,
		});
		this.editorToolbar.addItem(EDITOR_TOOLBAR_SECTIONS.PARAGRAPH, 200, 'paragraph.align.left', 'paragraph_format.alignment.left', 'paragraph.align.left', {
			commandId: 'paragraph.format.align',
			commandPayload: 'left',
			ownerFeature: 'paragraph-format',
			pressed: this.getFormat().alignment === 'left',
		});
		this.editorToolbar.addItem(EDITOR_TOOLBAR_SECTIONS.PARAGRAPH, 300, 'paragraph.align.center', 'paragraph_format.alignment.center', 'paragraph.align.center', {
			commandId: 'paragraph.format.align',
			commandPayload: 'center',
			ownerFeature: 'paragraph-format',
			pressed: this.getFormat().alignment === 'center',
		});
		this.editorToolbar.addItem(EDITOR_TOOLBAR_SECTIONS.PARAGRAPH, 400, 'paragraph.align.right', 'paragraph_format.alignment.right', 'paragraph.align.right', {
			commandId: 'paragraph.format.align',
			commandPayload: 'right',
			ownerFeature: 'paragraph-format',
			pressed: this.getFormat().alignment === 'right',
		});
		this.editorToolbar.addItem(EDITOR_TOOLBAR_SECTIONS.PARAGRAPH, 500, 'paragraph.align.justify', 'paragraph_format.alignment.justify', 'paragraph.align.justify', {
			commandId: 'paragraph.format.align',
			commandPayload: 'justify',
			ownerFeature: 'paragraph-format',
			pressed: this.getFormat().alignment === 'justify',
		});
	}

	updateStyleToolbarOptions() {
		this.editorToolbar?.updateItem?.('paragraph.style', {
			options: this.getStyleOptions(),
			value: this.getFormat().styleId,
		});
	}

	registerMenuItems() {
		const menu = this.mainMenu.getMenu();

		if (!this.formatMenuItemsRegistered && menu.some((item) => item.id === 'format')) {
			this.formatMenuItemsRegistered = Boolean(
				this.mainMenu.addItem('format', 20, 200, PARAGRAPH_MENU_ITEM_ID),
			);
		}

		if (!this.insertMenuItemsRegistered && menu.some((item) => item.id === 'insert')) {
			this.insertMenuItemsRegistered = Boolean(
				this.mainMenu.addItem('insert', 20, 300, PAGE_BREAK_MENU_ITEM_ID),
			);
		}

		return this.formatMenuItemsRegistered && this.insertMenuItemsRegistered;
	}

	getComponent() {
		return <ParagraphFormatDialog paragraphFormat={this} />;
	}

	getFormat() {
		return this.editorSurface?.getParagraphFormat?.() || {
			alignment: 'left',
			bold: false,
			fontSize: 12,
			italic: false,
			overrides: {
				alignment: false,
				bold: false,
				fontSize: false,
				italic: false,
				keepWithNext: false,
				paddingAfter: false,
				paddingBefore: false,
				start: false,
				underline: false,
			},
			keepWithNext: false,
			paddingAfter: 0,
			paddingBefore: 0,
			start: 'continuous',
			styleId: 'normal',
			underline: false,
		};
	}

	getStyleOptions() {
		return this.getStyles().map((style) => ({
			fallback: style.name,
			label: '',
			value: style.id,
		}));
	}

	getEffectiveStyleFormat(styleId = 'normal') {
		const settings = this.documentModel?.getSettings?.() || {};
		const documentFormat = {
			alignment: 'left',
			bold: false,
			fontSize: this.normalizeFontSize(settings.typography?.fontSize, 12),
			italic: false,
			keepWithNext: false,
			paddingAfter: 0,
			paddingBefore: 0,
			start: 'continuous',
			styleId: this.normalizeStyleId(styleId),
			underline: false,
		};

		return {
			...documentFormat,
			...this.resolveStyleFormat(styleId),
			styleId: this.normalizeStyleId(styleId),
		};
	}

	getStyles() {
		const settings = this.documentModel?.getSettings?.() || {};
		const styles = Array.isArray(settings.styles) && settings.styles.length
			? settings.styles
			: [{ id: 'normal', name: 'Normal', parentStyleId: '', format: {} }];

		return styles;
	}

	resolveStyleFormat(styleId, visited = new Set()) {
		const styles = this.getStyles();
		const normalizedStyleId = this.normalizeStyleId(styleId);
		const style = styles.find((candidate) => candidate.id === normalizedStyleId);

		if (!style || visited.has(style.id)) {
			return {};
		}

		visited.add(style.id);

		return {
			...this.resolveStyleFormat(style.parentStyleId, visited),
			...(style.format || {}),
		};
	}

	normalizeStyleId(value) {
		const normalized = String(value || '')
			.trim()
			.toLowerCase()
			.replace(/[^a-z0-9_-]+/g, '-')
			.replace(/^-+|-+$/g, '');

		return this.getStyles().some((style) => style.id === normalized)
			? normalized
			: this.getStyles()[0]?.id || 'normal';
	}

	normalizeFontSize(value, fallback = 12) {
		const fontSize = Number(value);

		if (!Number.isFinite(fontSize)) {
			return fallback;
		}

		return Math.min(Math.max(Math.round(fontSize), 6), 144);
	}

	getDialogState() {
		return {
			open: this.dialogOpen,
			format: this.getFormat(),
		};
	}

	openDialog() {
		this.dialogOpen = true;
		const state = this.getDialogState();

		this.fire('dialog-opened', state);
		this.fire('dialog-changed', state);
		return state;
	}

	closeDialog() {
		this.dialogOpen = false;
		const state = this.getDialogState();

		this.fire('dialog-closed', state);
		this.fire('dialog-changed', state);
		return state;
	}

	applyFormat(format = {}) {
		const nextFormat = this.editorSurface?.formatParagraph?.(format);

		this.dialogOpen = false;
		this.fire('dialog-changed', this.getDialogState());
		return nextFormat;
	}

	resetFormat(styleId = this.getFormat().styleId) {
		const nextFormat = this.editorSurface?.formatParagraph?.({
			reset: true,
			styleId,
		});

		this.fire('dialog-changed', this.getDialogState());
		return nextFormat;
	}

	insertPageBreak() {
		return this.editorSurface?.insertPageBreak?.() || false;
	}

	onToolbarItemSelected(event) {
		const item = event?.item;

		if (item?.commandId === 'paragraph.format.font-size') {
			this.editorSurface?.formatParagraph?.({ fontSize: item.commandPayload });
			return;
		}

		if (item?.commandId === 'paragraph.format.style') {
			this.editorSurface?.formatParagraph?.({ styleId: item.commandPayload });
			return;
		}

		if (item?.commandId === 'paragraph.format.align') {
			this.editorSurface?.formatParagraph?.({ alignment: item.commandPayload });
		}
	}

	onMenuItemSelected(event) {
		if (event?.item?.id === PARAGRAPH_MENU_ITEM_ID) {
			this.openDialog();
		}

		if (event?.item?.id === PAGE_BREAK_MENU_ITEM_ID) {
			this.insertPageBreak();
		}
	}

	onMainMenuItemAdded(event) {
		if (event?.item?.id === 'format' || event?.item?.id === 'insert') {
			this.registerMenuItems();
		}
	}

	onDocumentChanged() {
		this.updateStyleToolbarOptions();
	}
}

new ParagraphFormatController();
