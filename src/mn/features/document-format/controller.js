import React from 'react';
import { Service } from '@polylith/core';
import DocumentFormatDialog from './components/DocumentFormatDialog.jsx';

/**
 * Registers document-format commands and owns the document-format dialog host.
 */
export default class DocumentFormatController extends Service {
	constructor(registry) {
		super('document-format-controller', registry);
		this.implement(['ready', 'getComponent']);
		this.dialogOpen = false;
	}

	ready() {
		this.mainMenu = this.registry.subscribe('main-menu');
		this.documentFormat = this.registry.subscribe('document-format');
		this.menuItemsRegistered = false;
		this.menuSelectedListener = this.mainMenu.listen(
			'item-selected',
			this.onMenuItemSelected.bind(this),
		);
		this.mainItemAddedListener = this.mainMenu.listen(
			'main-item-added',
			this.onMainMenuItemAdded.bind(this),
		);

		this.registerMenuItems();
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

	registerMenuItems() {
		if (this.menuItemsRegistered) {
			return true;
		}

		if (!this.mainMenu.getMenu().some((item) => item.id === 'format')) {
			return false;
		}

		this.menuItemsRegistered = Boolean(
			this.mainMenu.addItem('format', 20, 100, 'document_format.menu.document_setup'),
		);
		return this.menuItemsRegistered;
	}

	getComponent() {
		return <DocumentFormatDialog documentFormat={this} />;
	}

	getFormat() {
		return this.documentFormat.getFormat();
	}

	getDialogState() {
		return {
			open: this.dialogOpen,
			format: this.clone(this.getFormat()),
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
		const nextFormat = this.documentFormat.applyFormat(format);

		this.dialogOpen = false;
		this.fire('dialog-changed', this.getDialogState());
		return nextFormat;
	}

	onMenuItemSelected(event) {
		if (event?.item?.id !== 'document_format.menu.document_setup') {
			return;
		}

		this.openDialog();
	}

	onMainMenuItemAdded(event) {
		if (event?.item?.id === 'format') {
			this.registerMenuItems();
		}
	}
}

new DocumentFormatController();
