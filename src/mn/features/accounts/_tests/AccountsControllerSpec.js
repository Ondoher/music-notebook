/* global describe it expect beforeEach */

import { Registry, Service } from '@polylith/core';

import AccountsController from '../controller.js';

class AccountModelMock extends Service {
	constructor(registry) {
		super('account-model', registry);
		this.implement(['createAccount', 'login', 'logout', 'getAccount']);
		this.created = [];
		this.cleared = false;
		this.logins = [];
		this.account = {
			id: 'account-1',
			username: 'Alice',
			email: null,
		};
		this.createResult = {
			success: true,
			data: {
				success: true,
				account: this.account,
			},
		};
	}

	logout() {
		this.cleared = true;
		return Promise.resolve({
			success: true,
			data: {
				success: true,
			},
		});
	}

	createAccount(credentials) {
		this.created.push(credentials);
		return Promise.resolve(this.createResult);
	}

	login(credentials) {
		this.logins.push(credentials);
		return Promise.resolve({
			success: true,
			data: {
				success: true,
				account: this.account,
			},
		});
	}

	getAccount() {
		return this.account;
	}
}

describe('AccountsController', function() {
	let accounts;
	let accountModel;
	let registry;

	beforeEach(function() {
		registry = new Registry();
		accountModel = new AccountModelMock(registry);
		accounts = new AccountsController(registry);
		accounts.ready();
	});

	it('opens the correct dialog modes from account status actions', function() {
		accounts.openCreateAccountDialog();

		expect(accounts.getDialogState()).toEqual(jasmine.objectContaining({
			mode: 'create',
			open: true,
		}));

		accounts.openLoginDialog();

		expect(accounts.getDialogState()).toEqual(jasmine.objectContaining({
			mode: 'login',
			open: true,
		}));

	});

	it('submits account creation and opens a success report dialog', async function() {
		accounts.openCreateAccountDialog();

		await accounts.createAccount({
			email: null,
			password: 'secret1',
			username: 'Alice',
		});

		expect(accountModel.created[0]).toEqual({
			email: null,
			password: 'secret1',
			username: 'Alice',
		});
		expect(accounts.getDialogState()).toEqual(jasmine.objectContaining({
			mode: 'create-result',
			open: true,
			resultSuccess: true,
		}));
	});

	it('keeps account creation failures in the create dialog', async function() {
		accountModel.createResult = {
			success: false,
			data: {
				success: false,
				reason: 'accounts.username_unavailable',
			},
		};
		accounts.openCreateAccountDialog();

		await accounts.createAccount({
			email: null,
			password: 'secret1',
			username: 'Alice',
		});

		expect(accounts.getDialogState()).toEqual(jasmine.objectContaining({
			errorReason: 'accounts.username_unavailable',
			mode: 'create',
			open: true,
		}));
	});

	it('logs out by clearing the account model session and closing the dialog', async function() {
		let result = await accounts.logout();

		expect(result).toEqual({
			success: true,
			data: {
				success: true,
			},
		});
		expect(accountModel.cleared).toBeTrue();
		expect(accounts.getDialogState().open).toBeFalse();
	});

	it('allows listeners to cancel logout intents asynchronously', async function() {
		accounts.listen('logout-intent', async function(intent) {
			await Promise.resolve();
			intent.cancel('test.cancelled');
		});

		let result = await accounts.logout();

		expect(result).toEqual({
			success: false,
			cancelled: true,
			reason: 'test.cancelled',
		});
		expect(accountModel.cleared).toBeFalse();
		expect(accounts.getDialogState().open).toBeFalse();
	});

	it('includes the current account on logout intents', function() {
		let intent = accounts.createLogoutIntent();

		expect(intent).toEqual(jasmine.objectContaining({
			account: accountModel.account,
			cancelled: false,
			type: 'logout',
		}));
	});

	it('exposes the current account from the account model', function() {
		expect(accounts.getAccount()).toEqual({
			id: 'account-1',
			username: 'Alice',
			email: null,
		});
	});
});
