/// <reference path="./controller.d.ts" />

import React from 'react';
import { Service } from '@polylith/core';

import DocumentNameDialog from './components/DocumentNameDialog.jsx';
import DocumentOpenDialog from './components/DocumentOpenDialog.jsx';
import DocumentMessageDialog from './components/DocumentMessageDialog.jsx';

const MENU_ITEMS = [
	{ id: 'document.menu.new', section: 10, priority: 100, requiresLogin: true },
	{ id: 'document.menu.open', section: 10, priority: 200, requiresLogin: true },
	{ id: 'document.menu.save', section: 10, priority: 300, requiresLogin: false },
	{ id: 'document.menu.save_as', section: 10, priority: 400, requiresLogin: true },
	{ id: 'document.menu.rename', section: 20, priority: 100, requiresLogin: true },
	{ id: 'document.menu.delete', section: 20, priority: 200, requiresLogin: true },
];

const NAME_DIALOG_MODES = {
	'save-new': {
		title: 'document.save.dialog.title',
		description: 'document.save.dialog.description',
		submitLabel: 'document.save.submit',
		cancelLabel: 'document.save.do_not_save',
	},
	'save-as': {
		title: 'document.save_as.dialog.title',
		description: 'document.save_as.dialog.description',
		submitLabel: 'document.save.submit',
		cancelLabel: 'document.save.do_not_save',
	},
	rename: {
		title: 'document.rename.dialog.title',
		description: 'document.rename.dialog.description',
		submitLabel: 'document.rename.submit',
		cancelLabel: 'document.rename.do_not_rename',
		conflictMessage: 'document.rename.conflict',
	},
};

/** Registers document commands and owns document command messaging. */
export default class DocumentController extends Service {
	constructor(registry) {
		super('document-controller', registry);
		this.implement([
			'ready',
			'getComponent',
			'getDialogState',
			'getNameDialogState',
			'getOpenDialogState',
			'getNameDialogModeConfig',
			'closeDialog',
			'closeNameDialog',
			'closeOpenDialog',
			'updateNameDialogName',
			'submitNameDialog',
			'selectOpenDialogDocument',
			'submitOpenDialog',
			'loadDocument',
			'openLastOpenDocument',
			'openRenameDialog',
			'clearDocumentAfterLogout',
			'onLogoutIntent',
			'onDialogAction',
			'registerMenuItems',
			'renameCurrentDocument',
		]);
		this.dialogOpen = false;
		this.dialogButtons = null;
		this.dialogTitle = '';
		this.dialogContent = '';
		this.lastOpenDocumentChecked = false;
		this.discardDocumentAfterLogout = false;
		this.logoutSavePending = false;
		this.menuItemsRegistered = false;
		this.nameDialog = this.createEmptyNameDialogState();
		this.openDialog = this.createEmptyOpenDialogState();
		this.pendingDocumentAction = null;
	}

	/** Subscribes to document feature dependencies. */
	ready() {
		this.mainMenu = this.registry.subscribe('main-menu');
		this.accountModel = this.registry.subscribe('account-model');
		this.accountUi = this.registry.subscribe('account-ui');
		this.accountsController = this.registry.subscribe('accounts-controller');
		/** @type {DocumentModelService} */
		this.documentModel = this.registry.subscribe('document-model');
		/** @type {IoService} */
		this.io = this.registry.subscribe('io');
		this.menuSelectedListener = this.mainMenu.listen(
			'item-selected',
			this.onMenuItemSelected.bind(this),
		);
		this.mainItemAddedListener = this.mainMenu.listen(
			'main-item-added',
			this.onMainMenuItemAdded.bind(this),
		);
		this.accountChangedListener = this.accountModel.listen?.(
			'account-session-changed',
			this.onAccountChanged.bind(this),
		);
		this.accountClearedListener = this.accountModel.listen?.(
			'account-session-cleared',
			this.onAccountSessionCleared.bind(this),
		);
		this.logoutIntentListener = this.accountsController?.listen?.(
			'logout-intent',
			this.onLogoutIntent.bind(this),
		);

		this.registerMenuItems();
	}

	/** Gets the feature-owned component rendered by the app shell. */
	getComponent() {
		return (
			<React.Fragment>
				<DocumentMessageDialog documentController={this} />
				<DocumentNameDialog documentController={this} />
				<DocumentOpenDialog documentController={this} />
			</React.Fragment>
		);
	}

	createEmptyNameDialogState() {
		return {
			conflictConfirmed: false,
			conflictDocument: null,
			documents: [],
			errorReason: '',
			mode: '',
			name: '',
			open: false,
			pending: false,
		};
	}

	createEmptyOpenDialogState() {
		return {
			documents: [],
			errorReason: '',
			open: false,
			pending: false,
			selectedDocumentId: '',
		};
	}

	/**
	 * Reports whether a user is currently authenticated.
	 *
	 * @returns {boolean} Returns true when authenticated.
	 */
	isLoggedIn() {
		return this.accountModel?.isAuthenticated?.() === true;
	}

	/**
	 * Registers document menu items.
	 *
	 * @returns {boolean} Returns true when the document menu exists.
	 */
	registerMenuItems() {
		if (!this.mainMenu.getMenu().some((item) => item.id === 'document')) {
			return false;
		}

		const loggedIn = this.isLoggedIn();

		MENU_ITEMS.forEach((item) => {
			this.mainMenu.addItem('document', item.section, item.priority, item.id, {
				enabled: !item.requiresLogin || loggedIn,
			});
		});
		this.menuItemsRegistered = true;
		return true;
	}

	/**
	 * Gets the current message dialog state.
	 *
	 * @returns {DocumentControllerDialogState} Returns the dialog state.
	 */
	getDialogState() {
		return {
			open: this.dialogOpen,
			title: this.dialogTitle,
			content: this.dialogContent,
			buttons: this.dialogButtons,
		};
	}

	/** Gets the current document name dialog state. */
	getNameDialogState() {
		return {
			conflictConfirmed: this.nameDialog.conflictConfirmed,
			conflictDocument: this.nameDialog.conflictDocument,
			documents: [...this.nameDialog.documents],
			errorReason: this.nameDialog.errorReason,
			mode: this.nameDialog.mode,
			name: this.nameDialog.name,
			open: this.nameDialog.open,
			pending: this.nameDialog.pending,
		};
	}

	/** Gets the current document open dialog state. */
	getOpenDialogState() {
		return {
			documents: [...this.openDialog.documents],
			errorReason: this.openDialog.errorReason,
			open: this.openDialog.open,
			pending: this.openDialog.pending,
			selectedDocumentId: this.openDialog.selectedDocumentId,
		};
	}

	/** Gets localized text config for one document name dialog mode. */
	getNameDialogModeConfig(mode) {
		return NAME_DIALOG_MODES[mode] || NAME_DIALOG_MODES['save-new'];
	}

	fireNameDialogChanged() {
		const state = this.getNameDialogState();

		this.fire('name-dialog-changed', state);
		return state;
	}

	fireOpenDialogChanged() {
		const state = this.getOpenDialogState();

		this.fire('open-dialog-changed', state);
		return state;
	}

	/**
	 * Opens a document feature message.
	 *
	 * @param {string} title - Supplies the title phrase key.
	 * @param {string} content - Supplies the content phrase key.
	 * @param {BaseDialogButton[] | null} [buttons] - Supplies optional dialog actions.
	 * @returns {DocumentControllerDialogState} Returns the dialog state.
	 */
	openMessage(title, content, buttons = null) {
		this.dialogOpen = true;
		this.dialogTitle = title;
		this.dialogContent = content;
		this.dialogButtons = buttons;
		const state = this.getDialogState();

		this.fire('dialog-changed', state);
		return state;
	}

	/**
	 * Closes the current message dialog.
	 *
	 * @returns {DocumentControllerDialogState} Returns the dialog state.
	 */
	closeDialog() {
		if (this.logoutIntentResolver) {
			return this.finishLogoutIntent(true);
		}

		this.dialogOpen = false;
		this.dialogButtons = null;
		const state = this.getDialogState();

		this.fire('dialog-changed', state);
		return state;
	}

	finishLogoutIntent(cancelled, options = {}) {
		const intent = this.logoutIntent;
		const resolver = this.logoutIntentResolver;

		this.logoutIntent = null;
		this.logoutIntentResolver = null;
		this.logoutSavePending = false;

		if (cancelled) {
			intent?.cancel?.('document.logout.unsaved_cancelled');
		} else if (options.discardDocument === true) {
			this.discardDocumentAfterLogout = true;
		}

		this.dialogOpen = false;
		this.dialogButtons = null;
		const state = this.getDialogState();

		this.fire('dialog-changed', state);
		resolver?.();
		return state;
	}

	/** Closes the current document name dialog. */
	closeNameDialog() {
		this.nameDialog = this.createEmptyNameDialogState();
		const state = this.fireNameDialogChanged();

		if (this.logoutSavePending) {
			this.finishLogoutIntent(true);
		}

		if (this.pendingDocumentAction) {
			this.pendingDocumentAction = null;
		}

		return state;
	}

	/** Closes the current document open dialog. */
	closeOpenDialog() {
		this.openDialog = this.createEmptyOpenDialogState();
		return this.fireOpenDialogChanged();
	}

	normalizeDocumentName(name) {
		return String(name || '').trim().replace(/\s+/g, ' ');
	}

	compareDocumentName(name) {
		return this.normalizeDocumentName(name).toLocaleLowerCase();
	}

	findNameConflict(name) {
		const comparable = this.compareDocumentName(name);

		if (!comparable) {
			return null;
		}

		return this.nameDialog.documents.find((document) => (
			this.compareDocumentName(document.name) === comparable
			&& (
				this.nameDialog.mode !== 'rename'
				|| document.id !== this.documentModel.getId()
			)
		)) || null;
	}

	updateNameDialogName(name) {
		const normalizedName = this.normalizeDocumentName(name);

		this.nameDialog = {
			...this.nameDialog,
			conflictConfirmed: false,
			conflictDocument: this.findNameConflict(normalizedName),
			errorReason: '',
			name,
		};
		return this.fireNameDialogChanged();
	}

	async loadDocumentList() {
		const result = await this.io.get('api/documents');

		if (result.success && result.data?.success && Array.isArray(result.data.documents)) {
			return result.data.documents;
		}

		return [];
	}

	async openNameDialog(mode) {
		const documents = await this.loadDocumentList();
		const name = this.documentModel.getTitle();

		this.nameDialog = {
			...this.createEmptyNameDialogState(),
			documents,
			mode,
			name,
			open: true,
		};
		this.nameDialog.conflictDocument = this.findNameConflict(name);
		return this.fireNameDialogChanged();
	}

	openSaveNewDialog() {
		return this.openNameDialog('save-new');
	}

	openSaveAsDialog() {
		return this.openNameDialog('save-as');
	}

	openRenameDialog() {
		if (!this.documentModel.getId()) {
			return this.openMessage(
				'document.rename.save_required.title',
				'document.rename.save_required.message',
			);
		}

		return this.openNameDialog('rename');
	}

	async openOpenDialog() {
		const documents = await this.loadDocumentList();

		this.openDialog = {
			...this.createEmptyOpenDialogState(),
			documents,
			open: true,
			selectedDocumentId: documents[0]?.id || '',
		};
		return this.fireOpenDialogChanged();
	}

	selectOpenDialogDocument(documentId) {
		this.openDialog = {
			...this.openDialog,
			errorReason: '',
			selectedDocumentId: String(documentId || ''),
		};
		return this.fireOpenDialogChanged();
	}

	createNewDocument() {
		this.documentModel.load({});
		this.accountModel.setLastOpenDocument?.(null);
		this.lastOpenDocumentChecked = true;
		return this.documentModel.toJSON();
	}

	openUnsavedDocumentMessage(action) {
		this.pendingDocumentAction = action;
		return this.openMessage(
			'document.unsaved.title',
			'document.unsaved.message',
			[
				{
					id: 'document-unsaved-save',
					labelKey: 'common.save',
					priority: 'primary',
				},
				{
					id: 'document-unsaved-discard',
					labelKey: 'document.unsaved.do_not_save',
					priority: 'secondary',
				},
				{
					id: 'document-unsaved-cancel',
					labelKey: 'common.cancel',
					priority: 'secondary',
				},
			],
		);
	}

	requestDocumentAction(action) {
		if (this.documentModel.isDirty?.() === true) {
			return this.openUnsavedDocumentMessage(action);
		}

		return this.continueDocumentAction(action);
	}

	async continueDocumentAction(action = this.pendingDocumentAction) {
		this.pendingDocumentAction = null;

		if (!action) {
			return null;
		}

		if (action.type === 'new') {
			this.closeDialog();
			return this.createNewDocument();
		}

		if (action.type === 'open-menu') {
			this.closeDialog();
			return this.openOpenDialog();
		}

		if (action.type === 'open-document') {
			this.closeDialog();
			return this.loadDocument(action.documentId);
		}

		return null;
	}

	/** Opens the save-login-required message. */
	openSaveLoginRequiredMessage() {
		this.openMessage(
			'document.save.login_required.title',
			'document.save.login_required.message',
			[
				{
					id: 'create-account',
					labelKey: 'accounts.create.submit',
					priority: 'secondary',
				},
				{
					id: 'login',
					labelKey: 'accounts.login.submit',
					priority: 'primary',
				},
			],
		);
	}

	getCurrentContentForSave(name = this.documentModel.getTitle()) {
		return {
			...this.documentModel.toJSON(),
			title: name,
		};
	}

	applyServerDocument(document) {
		this.documentModel.load({
			...document.content,
			id: document.id,
			title: document.name,
		});
	}

	async loadDocument(documentId, options = {}) {
		const id = String(documentId || '').trim();

		if (!id) {
			return {success: false};
		}

		const result = await this.io.get(`api/documents/${encodeURIComponent(id)}`);

		if (result.success && result.data?.success && result.data.document) {
			this.applyServerDocument(result.data.document);

			if (options.updateLastOpen !== false) {
				await this.accountModel.setLastOpenDocument?.(result.data.document.id);
			}
		}

		return result;
	}

	canOpenLastDocument() {
		return !this.lastOpenDocumentChecked
			&& !this.documentModel.getId()
			&& this.documentModel.isDirty?.() !== true;
	}

	async openLastOpenDocument(account = this.accountModel.getAccount?.()) {
		const documentId = account?.lastOpenDocumentId || '';

		if (!documentId || !this.canOpenLastDocument()) {
			return null;
		}

		this.lastOpenDocumentChecked = true;
		const result = await this.loadDocument(documentId, {
			updateLastOpen: false,
		});

		if (result.status === 404) {
			await this.accountModel.setLastOpenDocument?.(null);
		}

		return result;
	}

	clearDocumentAfterLogout() {
		if (this.documentModel.isDirty?.() === true && this.discardDocumentAfterLogout !== true) {
			return false;
		}

		this.discardDocumentAfterLogout = false;
		this.documentModel.load({});
		this.lastOpenDocumentChecked = false;
		return true;
	}

	onLogoutIntent(intent) {
		if (this.documentModel.isDirty?.() !== true) {
			return undefined;
		}

		this.logoutIntent = intent;
		const promise = new Promise((resolve) => {
			this.logoutIntentResolver = resolve;
		});

		this.openMessage(
			'document.logout.unsaved.title',
			'document.logout.unsaved.message',
			[
				{
					id: 'logout-save',
					labelKey: 'common.save',
					priority: 'primary',
				},
				{
					id: 'logout-discard',
					labelKey: 'document.logout.do_not_save',
					priority: 'secondary',
				},
				{
					id: 'logout-cancel',
					labelKey: 'common.cancel',
					priority: 'secondary',
				},
			],
		);

		return promise;
	}

	async saveBeforeLogout() {
		if (!this.logoutIntentResolver) {
			return null;
		}

		this.dialogOpen = false;
		this.dialogButtons = null;
		this.fire('dialog-changed', this.getDialogState());

		if (!this.documentModel.getId()) {
			this.logoutSavePending = true;
			await this.openSaveNewDialog();
			return null;
		}

		const result = await this.saveExistingDocument();

		if (result.success && result.data?.success) {
			return this.finishLogoutIntent(false);
		}

		return this.finishLogoutIntent(true);
	}

	async saveBeforeDocumentAction() {
		const action = this.pendingDocumentAction;

		this.dialogOpen = false;
		this.dialogButtons = null;
		this.fire('dialog-changed', this.getDialogState());

		if (!this.documentModel.getId()) {
			await this.openSaveNewDialog();
			return null;
		}

		const result = await this.saveExistingDocument();

		if (result.success && result.data?.success) {
			return this.continueDocumentAction(action);
		}

		this.pendingDocumentAction = null;
		this.openMessage('document.save.failed.title', 'document.save.failed');
		return result;
	}

	async saveNewDocument(name) {
		const result = await this.io.post('api/documents', {
			allowNameConflict: this.nameDialog.conflictConfirmed === true,
			name,
			content: this.getCurrentContentForSave(name),
		});

		if (result.success && result.data?.success && result.data.document) {
			const document = result.data.document;
			this.applyServerDocument(document);
			await this.accountModel.setLastOpenDocument?.(document.id);
			return result;
		}

		return result;
	}

	async saveExistingDocument() {
		const id = this.documentModel.getId();
		const name = this.documentModel.getTitle();
		const result = await this.io.send({
			method: 'PUT',
			url: `api/documents/${encodeURIComponent(id)}`,
			body: {
				name,
				content: this.getCurrentContentForSave(name),
			},
		});

		if (result.success && result.data?.success && result.data.document) {
			const document = result.data.document;
			this.applyServerDocument(document);
			await this.accountModel.setLastOpenDocument?.(document.id);
		}

		return result;
	}

	async saveCurrentDocument() {
		if (!this.documentModel.getId()) {
			return this.openSaveNewDialog();
		}

		return this.saveExistingDocument();
	}

	async renameCurrentDocument(name) {
		const id = this.documentModel.getId();

		if (!id) {
			this.openMessage(
				'document.rename.save_required.title',
				'document.rename.save_required.message',
			);
			return {success: false, reason: 'document.rename.save_required'};
		}

		const result = await this.io.send({
			method: 'PATCH',
			url: `api/documents/${encodeURIComponent(id)}/name`,
			body: {
				allowNameConflict: this.nameDialog.conflictConfirmed === true,
				name,
			},
		});

		if (result.success && result.data?.success && result.data.document) {
			this.documentModel.rename(result.data.document.name);
		}

		return result;
	}

	async submitNameDialog() {
		const name = this.normalizeDocumentName(this.nameDialog.name);

		if (!name) {
			this.nameDialog.errorReason = 'document.name.required';
			return this.fireNameDialogChanged();
		}

		const conflictDocument = this.findNameConflict(name);

		if (conflictDocument && !this.nameDialog.conflictConfirmed) {
			this.nameDialog = {
				...this.nameDialog,
				conflictDocument,
				conflictConfirmed: true,
				errorReason: '',
			};
			return this.fireNameDialogChanged();
		}

		this.nameDialog = {
			...this.nameDialog,
			conflictDocument,
			errorReason: '',
			name,
			pending: true,
		};
		this.fireNameDialogChanged();

		const result = this.nameDialog.mode === 'rename'
			? await this.renameCurrentDocument(name)
			: await this.saveNewDocument(name);

		if (result.success && result.data?.success) {
			this.nameDialog = this.createEmptyNameDialogState();
			const state = this.fireNameDialogChanged();

			if (this.logoutSavePending) {
				this.finishLogoutIntent(false);
			}

			if (this.pendingDocumentAction) {
				await this.continueDocumentAction();
			}

			return state;
		}

		if (result.status === 409 && result.data?.reason === 'documents.name_conflict') {
			this.nameDialog = {
				...this.nameDialog,
				conflictConfirmed: true,
				conflictDocument: result.data.document || conflictDocument,
				errorReason: '',
				pending: false,
			};
			return this.fireNameDialogChanged();
		}

		this.nameDialog = {
			...this.nameDialog,
			errorReason: result.data?.reason || result.reason || 'document.save.failed',
			pending: false,
		};
		return this.fireNameDialogChanged();
	}

	async submitOpenDialog() {
		const documentId = this.openDialog.selectedDocumentId;

		if (!documentId) {
			this.openDialog = {
				...this.openDialog,
				errorReason: 'document.open.required',
			};
			return this.fireOpenDialogChanged();
		}

		const action = {
			type: 'open-document',
			documentId,
		};

		if (this.documentModel.isDirty?.() === true) {
			this.openDialog = {
				...this.openDialog,
				open: false,
			};
			this.fireOpenDialogChanged();
			return this.openUnsavedDocumentMessage(action);
		}

		this.openDialog = {
			...this.openDialog,
			pending: true,
		};
		this.fireOpenDialogChanged();

		const result = await this.loadDocument(documentId);

		if (result.success && result.data?.success) {
			this.openDialog = this.createEmptyOpenDialogState();
			return this.fireOpenDialogChanged();
		}

		this.openDialog = {
			...this.openDialog,
			errorReason: result.data?.reason || result.reason || 'document.open.failed',
			open: true,
			pending: false,
		};
		return this.fireOpenDialogChanged();
	}

	/**
	 * Handles actions selected from the document message dialog.
	 *
	 * @param {string} buttonId - Supplies the selected dialog action.
	 * @returns {DocumentControllerDialogState | null} Returns a dialog state when handled.
	 */
	onDialogAction(buttonId) {
		if (buttonId === 'document-unsaved-save') {
			return this.saveBeforeDocumentAction();
		}

		if (buttonId === 'document-unsaved-discard') {
			const action = this.pendingDocumentAction;
			return this.continueDocumentAction(action);
		}

		if (buttonId === 'document-unsaved-cancel') {
			this.pendingDocumentAction = null;
			return this.closeDialog();
		}

		if (buttonId === 'logout-save') {
			return this.saveBeforeLogout();
		}

		if (buttonId === 'logout-cancel') {
			return this.finishLogoutIntent(true);
		}

		if (buttonId === 'logout-discard') {
			return this.finishLogoutIntent(false, {
				discardDocument: true,
			});
		}

		if (buttonId === 'login') {
			this.closeDialog();
			this.accountUi.openLoginDialog();
			return this.getDialogState();
		}

		if (buttonId === 'create-account') {
			this.closeDialog();
			this.accountUi.openCreateAccountDialog();
			return this.getDialogState();
		}

		return null;
	}

	/**
	 * Handles selected document menu commands.
	 *
	 * @param {MainMenuItemSelectedEvent} event - Supplies the selected item.
	 */
	async onMenuItemSelected(event) {
		const itemId = event?.item?.id || '';

		if (!MENU_ITEMS.some((item) => item.id === itemId)) {
			return;
		}

		if (itemId === 'document.menu.save' && !this.isLoggedIn()) {
			this.openSaveLoginRequiredMessage();
			return;
		}

		if (itemId === 'document.menu.save') {
			await this.saveCurrentDocument();
			return;
		}

		if (itemId === 'document.menu.save_as') {
			await this.openSaveAsDialog();
			return;
		}

		if (itemId === 'document.menu.new') {
			await this.requestDocumentAction({type: 'new'});
			return;
		}

		if (itemId === 'document.menu.open') {
			await this.requestDocumentAction({type: 'open-menu'});
			return;
		}

		if (itemId === 'document.menu.rename') {
			await this.openRenameDialog();
			return;
		}

		this.fire('document-command-selected', {
			commandId: itemId,
		});
	}

	/**
	 * Registers document items after the document menu appears.
	 *
	 * @param {MainMenuMainItemEvent} event - Supplies the main-menu event.
	 */
	onMainMenuItemAdded(event) {
		if (event?.item?.id === 'document') {
			this.registerMenuItems();
		}
	}

	/** Refreshes menu enabled states after account state changes. */
	onAccountChanged(event) {
		this.registerMenuItems();
		this.openLastOpenDocument(event?.account || this.accountModel.getAccount?.());
	}

	onAccountSessionCleared() {
		this.registerMenuItems();
		this.clearDocumentAfterLogout();
	}
}

new DocumentController();
