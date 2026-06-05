/* global describe it expect beforeEach */

import { Registry, Service } from '@polylith/core';

import MainMenuService from '../../app/main-menu.js';
import DocumentController from '../controller.js';

class AccountModelMock extends Service {
	constructor(registry) {
		super('account-model', registry);
		this.implement(['getAccount', 'isAuthenticated', 'setLastOpenDocument']);
		this.authenticated = false;
		this.account = null;
		this.lastOpenDocumentIds = [];
	}

	getAccount() {
		return this.account;
	}

	isAuthenticated() {
		return this.authenticated;
	}

	setLastOpenDocument(documentId) {
		this.lastOpenDocumentIds.push(documentId);
		return Promise.resolve({
			success: true,
			data: {
				success: true,
			},
		});
	}
}

class AppDataMock extends Service {
	constructor(registry) {
		super('app-data', registry);
		this.implement(['get']);
	}

	get(_name, fallback) {
		return fallback;
	}
}

class LocalizeMock extends Service {
	constructor(registry) {
		super('localize', registry);
		this.implement(['getLocale']);
	}

	getLocale() {
		return 'en-US';
	}
}

class AccountUiMock extends Service {
	constructor(registry) {
		super('account-ui', registry);
		this.implement(['openCreateAccountDialog', 'openLoginDialog']);
		this.created = false;
		this.loggedIn = false;
	}

	openCreateAccountDialog() {
		this.created = true;
		return {};
	}

	openLoginDialog() {
		this.loggedIn = true;
		return {};
	}
}

class DocumentModelMock extends Service {
	constructor(registry) {
		super('document-model', registry);
		this.implement([
			'getId',
			'getTitle',
			'isDirty',
			'rename',
			'toJSON',
			'load',
			'loadDocumentList',
			'loadServerDocument',
			'saveNewDocument',
			'saveExistingDocument',
			'renameServerDocument',
		]);
		this.id = null;
		this.dirty = false;
		this.documents = [];
		this.loaded = null;
		this.loadDocumentIds = [];
		this.renameRequests = [];
		this.saveExistingRequests = [];
		this.saveNewRequests = [];
		this.title = 'Untitled notebook';
	}

	getId() {
		return this.id;
	}

	getTitle() {
		return this.title;
	}

	isDirty() {
		return this.dirty;
	}

	rename(title) {
		this.title = title;
		return this.title;
	}

	toJSON() {
		return {
			id: this.id,
			title: this.title,
			revision: 1,
			tabs: [],
			objects: [],
		};
	}

	load(snapshot) {
		this.loaded = snapshot;
		this.id = snapshot.id || null;
		this.title = snapshot.title || 'Untitled notebook';
		this.dirty = false;
		return snapshot;
	}

	loadDocumentList() {
		return Promise.resolve(this.documents);
	}

	loadServerDocument(documentId) {
		this.loadDocumentIds.push(documentId);

		if (documentId === 'doc-last') {
			const result = {
				success: true,
				data: {
					success: true,
					document: {
						id: 'doc-last',
						name: 'Last notebook',
						content: {
							title: 'Last notebook',
							revision: 3,
							tabs: [],
							objects: [],
						},
					},
				},
			};
			this.load({
				...result.data.document.content,
				id: result.data.document.id,
				title: result.data.document.name,
			});
			return Promise.resolve(result);
		}

		if (documentId === 'doc-open') {
			const result = {
				success: true,
				data: {
					success: true,
					document: {
						id: 'doc-open',
						name: 'Open notebook',
						content: {
							title: 'Open notebook',
							revision: 4,
							tabs: [],
							objects: [],
						},
					},
				},
			};
			this.load({
				...result.data.document.content,
				id: result.data.document.id,
				title: result.data.document.name,
			});
			return Promise.resolve(result);
		}

		if (documentId === 'doc-missing') {
			return Promise.resolve({
				success: false,
				status: 404,
				data: {
					success: false,
					reason: 'documents.not_found',
				},
			});
		}

		return Promise.resolve({success: false});
	}

	saveNewDocument(name, options = {}) {
		this.saveNewRequests.push({ name, options });
		const result = {
			success: true,
			data: {
				success: true,
				document: {
					id: 'doc-1',
					name,
					content: {
						...this.toJSON(),
						title: name,
					},
				},
			},
		};
		this.load({
			...result.data.document.content,
			id: result.data.document.id,
			title: result.data.document.name,
		});
		return Promise.resolve(result);
	}

	saveExistingDocument(options = {}) {
		this.saveExistingRequests.push(options);
		const name = options.name || this.title;
		const result = {
			success: true,
			data: {
				success: true,
				document: {
					id: options.id || this.id,
					name,
					content: {
						...this.toJSON(),
						title: name,
					},
				},
			},
		};
		this.load({
			...result.data.document.content,
			id: result.data.document.id,
			title: result.data.document.name,
		});
		return Promise.resolve(result);
	}

	renameServerDocument(name, options = {}) {
		this.renameRequests.push({ name, options });
		return Promise.resolve({
			success: true,
			data: {
				success: true,
				document: {
					id: options.id || this.id,
					name,
					size: 42,
					createdAt: 1000,
					modifiedAt: 2000,
					lockedAt: null,
				},
			},
		});
	}
}

describe('DocumentController', function() {
	let accountModel;
	let accountUi;
	let documentController;
	let documentModel;
	let mainMenu;
	let registry;

	beforeEach(function() {
		registry = new Registry();
		mainMenu = new MainMenuService(registry);
		mainMenu.start();
		accountModel = new AccountModelMock(registry);
		accountUi = new AccountUiMock(registry);
		documentModel = new DocumentModelMock(registry);
		new AppDataMock(registry);
		new LocalizeMock(registry);
		documentController = new DocumentController(registry);
		mainMenu.addMainItem(100, 'document', 'app.menu.document');
		documentController.ready();
	});

	function getDocumentItem(id) {
		return mainMenu.getItem('document', id);
	}

	it('registers document menu items with logged-out gating', function() {
		expect(getDocumentItem('document.menu.new').enabled).toBeFalse();
		expect(getDocumentItem('document.menu.open').enabled).toBeFalse();
		expect(getDocumentItem('document.menu.save').enabled).toBeTrue();
		expect(getDocumentItem('document.menu.save_as').enabled).toBeFalse();
		expect(getDocumentItem('document.menu.rename').enabled).toBeFalse();
		expect(getDocumentItem('document.menu.delete').enabled).toBeFalse();
	});

	it('enables account-gated document menu items after login state changes', function() {
		accountModel.authenticated = true;
		accountModel.fire('account-session-changed', {
			account: {
				id: 'account-1',
				username: 'Alice',
			},
		});

		expect(getDocumentItem('document.menu.new').enabled).toBeTrue();
		expect(getDocumentItem('document.menu.open').enabled).toBeTrue();
		expect(getDocumentItem('document.menu.save').enabled).toBeTrue();
		expect(getDocumentItem('document.menu.save_as').enabled).toBeTrue();
		expect(getDocumentItem('document.menu.rename').enabled).toBeTrue();
		expect(getDocumentItem('document.menu.delete').enabled).toBeTrue();
	});

	it('loads the account last open document after session restore', async function() {
		accountModel.authenticated = true;

		accountModel.fire('account-session-changed', {
			account: {
				id: 'account-1',
				username: 'Alice',
				lastOpenDocumentId: 'doc-last',
			},
		});
		await Promise.resolve();

		expect(documentModel.loaded).toEqual(jasmine.objectContaining({
			id: 'doc-last',
			title: 'Last notebook',
		}));
		expect(accountModel.lastOpenDocumentIds).toEqual([]);
	});

	it('does not load the account last open document over local document state', async function() {
		documentModel.dirty = true;

		await documentController.openLastOpenDocument({
			id: 'account-1',
			username: 'Alice',
			lastOpenDocumentId: 'doc-last',
		});

		expect(documentModel.loaded).toBeNull();
	});

	it('clears missing last open document ids', async function() {
		await documentController.openLastOpenDocument({
			id: 'account-1',
			username: 'Alice',
			lastOpenDocumentId: 'doc-missing',
		});

		expect(accountModel.lastOpenDocumentIds).toEqual([null]);
	});

	it('clears the current saved document after logout', function() {
		documentModel.id = 'doc-1';
		documentModel.title = 'Lesson 1';
		documentModel.dirty = false;

		accountModel.fire('account-session-cleared');

		expect(documentModel.getId()).toBeNull();
		expect(documentModel.getTitle()).toBe('Untitled notebook');
	});

	it('keeps unsaved document changes after logout', function() {
		documentModel.id = 'doc-1';
		documentModel.title = 'Lesson 1';
		documentModel.dirty = true;

		accountModel.fire('account-session-cleared');

		expect(documentModel.getId()).toBe('doc-1');
		expect(documentModel.getTitle()).toBe('Lesson 1');
	});

	it('prompts and cancels logout intents when the current document is unsaved', async function() {
		documentModel.dirty = true;
		const intent = {
			cancelled: false,
			cancel(reason) {
				this.cancelled = true;
				this.cancelReason = reason;
			},
		};

		const pending = documentController.onLogoutIntent(intent);

		expect(documentController.getDialogState()).toEqual(jasmine.objectContaining({
			open: true,
			title: 'document.logout.unsaved.title',
			content: 'document.logout.unsaved.message',
		}));
		expect(documentController.getDialogState().buttons.map((button) => button.id)).toEqual([
			'logout-save',
			'logout-discard',
			'logout-cancel',
		]);

		documentController.onDialogAction('logout-cancel');
		await pending;

		expect(intent.cancelled).toBeTrue();
		expect(intent.cancelReason).toBe('document.logout.unsaved_cancelled');
		expect(documentController.getDialogState().open).toBeFalse();
	});

	it('allows logout intents to continue and discard when the user chooses not to save', async function() {
		documentModel.dirty = true;
		documentModel.id = 'doc-1';
		documentModel.title = 'Lesson 1';
		const intent = {
			cancelled: false,
			cancel() {
				this.cancelled = true;
			},
		};

		const pending = documentController.onLogoutIntent(intent);

		documentController.onDialogAction('logout-discard');
		await pending;
		accountModel.fire('account-session-cleared');

		expect(intent.cancelled).toBeFalse();
		expect(documentController.getDialogState().open).toBeFalse();
		expect(documentModel.getId()).toBeNull();
		expect(documentModel.getTitle()).toBe('Untitled notebook');
	});

	it('saves an existing unsaved document before logout when the user chooses save', async function() {
		documentModel.dirty = true;
		documentModel.id = 'doc-1';
		documentModel.title = 'Lesson 1';
		const intent = {
			cancelled: false,
			cancel() {
				this.cancelled = true;
			},
		};

		const pending = documentController.onLogoutIntent(intent);

		await documentController.onDialogAction('logout-save');
		await pending;

		expect(documentModel.saveExistingRequests[0]).toEqual(jasmine.objectContaining({
			id: 'doc-1',
			name: 'Lesson 1',
		}));
		expect(intent.cancelled).toBeFalse();
		expect(documentController.getDialogState().open).toBeFalse();
	});

	it('shows an account-required message when logged-out users choose save', function() {
		mainMenu.selectItem('document', 'document.menu.save');

		expect(documentController.getDialogState()).toEqual({
			buttons: [
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
			open: true,
			title: 'document.save.login_required.title',
			content: 'document.save.login_required.message',
		});
	});

	it('routes account-required message actions through the account UI service', function() {
		mainMenu.selectItem('document', 'document.menu.save');

		documentController.onDialogAction('login');
		expect(accountUi.loggedIn).toBeTrue();
		expect(documentController.getDialogState().open).toBeFalse();

		mainMenu.selectItem('document', 'document.menu.save');

		documentController.onDialogAction('create-account');
		expect(accountUi.created).toBeTrue();
		expect(documentController.getDialogState().open).toBeFalse();
	});

	it('opens the save dialog when logged-in users save a new document', async function() {
		accountModel.authenticated = true;
		documentModel.documents = [{
			id: 'doc-existing',
			name: 'Existing notebook',
		}];

		await documentController.onMenuItemSelected({
			item: {
				id: 'document.menu.save',
			},
		});

		expect(documentController.getNameDialogState()).toEqual(jasmine.objectContaining({
			documents: documentModel.documents,
			mode: 'save-new',
			name: 'Untitled notebook',
			open: true,
		}));
	});

	it('detects name conflicts before saving from the name dialog', async function() {
		accountModel.authenticated = true;
		documentModel.documents = [{
			id: 'doc-existing',
			name: 'Existing notebook',
		}];
		await documentController.openSaveNewDialog();

		documentController.updateNameDialogName(' Existing notebook ');
		await documentController.submitNameDialog();

		expect(documentController.getNameDialogState()).toEqual(jasmine.objectContaining({
			conflictDocument: documentModel.documents[0],
			open: true,
		}));
		expect(documentModel.saveNewRequests.length).toBe(0);

		await documentController.submitNameDialog();

		expect(documentModel.saveNewRequests[0]).toEqual(jasmine.objectContaining({
			name: 'Existing notebook',
			options: jasmine.objectContaining({
				allowNameConflict: true,
			}),
		}));
		expect(documentModel.getId()).toBe('doc-1');
		expect(documentController.getNameDialogState().open).toBeFalse();
	});

	it('saves existing documents directly', async function() {
		accountModel.authenticated = true;
		documentModel.id = 'doc-1';
		documentModel.title = 'Lesson 1';

		await documentController.onMenuItemSelected({
			item: {
				id: 'document.menu.save',
			},
		});

		expect(documentModel.saveExistingRequests[0]).toEqual(jasmine.objectContaining({
			id: 'doc-1',
			name: 'Lesson 1',
		}));
		expect(documentController.getNameDialogState().open).toBeFalse();
	});

	it('opens the rename dialog for saved documents', async function() {
		accountModel.authenticated = true;
		documentModel.id = 'doc-1';
		documentModel.title = 'Lesson 1';
		documentModel.documents = [{
			id: 'doc-1',
			name: 'Lesson 1',
		}, {
			id: 'doc-2',
			name: 'Lesson 2',
		}];

		await documentController.onMenuItemSelected({
			item: {
				id: 'document.menu.rename',
			},
		});

		expect(documentController.getNameDialogState()).toEqual(jasmine.objectContaining({
			documents: documentModel.documents,
			mode: 'rename',
			name: 'Lesson 1',
			open: true,
		}));
		expect(documentController.getNameDialogState().conflictDocument).toBeNull();
	});

	it('opens rename without prompting to save unsaved content changes', async function() {
		accountModel.authenticated = true;
		documentModel.id = 'doc-1';
		documentModel.title = 'Lesson 1';
		documentModel.dirty = true;

		await documentController.onMenuItemSelected({
			item: {
				id: 'document.menu.rename',
			},
		});

		expect(documentController.getDialogState().open).toBeFalse();
		expect(documentController.getNameDialogState()).toEqual(jasmine.objectContaining({
			mode: 'rename',
			open: true,
		}));
	});

	it('renames saved documents without clearing unsaved content changes', async function() {
		accountModel.authenticated = true;
		documentModel.id = 'doc-1';
		documentModel.title = 'Lesson 1';
		documentModel.dirty = true;
		await documentController.openRenameDialog();

		documentController.updateNameDialogName('Renamed lesson');
		await documentController.submitNameDialog();

		expect(documentModel.renameRequests[0]).toEqual(jasmine.objectContaining({
			name: 'Renamed lesson',
			options: {
				allowNameConflict: false,
				id: 'doc-1',
			},
		}));
		expect(documentModel.getTitle()).toBe('Renamed lesson');
		expect(documentModel.isDirty()).toBeTrue();
		expect(documentController.getNameDialogState().open).toBeFalse();
	});

	it('confirms rename conflicts before submitting', async function() {
		accountModel.authenticated = true;
		documentModel.id = 'doc-1';
		documentModel.title = 'Lesson 1';
		documentModel.documents = [{
			id: 'doc-1',
			name: 'Lesson 1',
		}, {
			id: 'doc-2',
			name: 'Lesson 2',
		}];
		await documentController.openRenameDialog();

		documentController.updateNameDialogName('Lesson 2');
		await documentController.submitNameDialog();

		expect(documentModel.renameRequests.length).toBe(0);
		expect(documentController.getNameDialogState()).toEqual(jasmine.objectContaining({
			conflictConfirmed: true,
			conflictDocument: documentModel.documents[1],
			open: true,
		}));

		await documentController.submitNameDialog();

		expect(documentModel.renameRequests[0]).toEqual(jasmine.objectContaining({
			name: 'Lesson 2',
			options: jasmine.objectContaining({
				allowNameConflict: true,
			}),
		}));
	});

	it('shows a save-required message when renaming a new document', async function() {
		accountModel.authenticated = true;

		await documentController.onMenuItemSelected({
			item: {
				id: 'document.menu.rename',
			},
		});

		expect(documentController.getDialogState()).toEqual(jasmine.objectContaining({
			open: true,
			title: 'document.rename.save_required.title',
			content: 'document.rename.save_required.message',
		}));
		expect(documentController.getNameDialogState().open).toBeFalse();
	});

	it('opens the saved document dialog when logged-in users choose open', async function() {
		accountModel.authenticated = true;
		documentModel.documents = [{
			id: 'doc-open',
			name: 'Open notebook',
		}];

		await documentController.onMenuItemSelected({
			item: {
				id: 'document.menu.open',
			},
		});

		expect(documentController.getOpenDialogState()).toEqual(jasmine.objectContaining({
			documents: documentModel.documents,
			open: true,
			selectedDocumentId: 'doc-open',
		}));
	});

	it('loads the selected document from the open dialog', async function() {
		accountModel.authenticated = true;
		documentModel.documents = [{
			id: 'doc-open',
			name: 'Open notebook',
		}];
		await documentController.openOpenDialog();

		await documentController.submitOpenDialog();

		expect(documentModel.loaded).toEqual(jasmine.objectContaining({
			id: 'doc-open',
			title: 'Open notebook',
		}));
		expect(accountModel.lastOpenDocumentIds).toEqual(['doc-open']);
		expect(documentController.getOpenDialogState().open).toBeFalse();
	});

	it('creates a new document when the current document is clean', async function() {
		accountModel.authenticated = true;
		documentModel.id = 'doc-1';
		documentModel.title = 'Lesson 1';

		await documentController.onMenuItemSelected({
			item: {
				id: 'document.menu.new',
			},
		});

		expect(documentModel.getId()).toBeNull();
		expect(documentModel.getTitle()).toBe('Untitled notebook');
		expect(accountModel.lastOpenDocumentIds).toEqual([null]);
	});

	it('prompts before creating a new document when the current document is unsaved', async function() {
		accountModel.authenticated = true;
		documentModel.id = 'doc-1';
		documentModel.title = 'Lesson 1';
		documentModel.dirty = true;

		await documentController.onMenuItemSelected({
			item: {
				id: 'document.menu.new',
			},
		});

		expect(documentController.getDialogState()).toEqual(jasmine.objectContaining({
			open: true,
			title: 'document.unsaved.title',
			content: 'document.unsaved.message',
		}));

		await documentController.onDialogAction('document-unsaved-discard');

		expect(documentModel.getId()).toBeNull();
		expect(documentModel.getTitle()).toBe('Untitled notebook');
	});

	it('prompts before opening documents when the current document is unsaved', async function() {
		accountModel.authenticated = true;
		documentModel.id = 'doc-1';
		documentModel.title = 'Lesson 1';
		documentModel.dirty = true;
		documentModel.documents = [{
			id: 'doc-open',
			name: 'Open notebook',
		}];

		await documentController.onMenuItemSelected({
			item: {
				id: 'document.menu.open',
			},
		});

		expect(documentController.getDialogState().open).toBeTrue();
		expect(documentController.getOpenDialogState().open).toBeFalse();

		await documentController.onDialogAction('document-unsaved-discard');

		expect(documentController.getOpenDialogState()).toEqual(jasmine.objectContaining({
			open: true,
			selectedDocumentId: 'doc-open',
		}));
	});

	it('emits document commands when logged-in users choose an unwired document action', function() {
		const commands = [];

		accountModel.authenticated = true;
		documentController.registerMenuItems();
		documentController.listen('document-command-selected', (event) => commands.push(event));

		mainMenu.selectItem('document', 'document.menu.delete');

		expect(commands).toEqual([{
			commandId: 'document.menu.delete',
		}]);
		expect(documentController.getDialogState().open).toBeFalse();
	});
});
