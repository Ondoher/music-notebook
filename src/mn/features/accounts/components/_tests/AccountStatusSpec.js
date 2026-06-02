import React from 'react';
import { act } from 'react';

import AccountStatus from '../AccountStatus.jsx';
import { createTestHarness } from '../../../../testing/TestHarness.js';

function makeLocalizeMock() {
	return {
		getLocale() {
			return 'en-US';
		},
		listen() {},
		translate(phrase) {
			return {
				'accounts.menu.login': 'Login',
				'accounts.menu.logout': 'Logout',
				'accounts.menu.signup': 'Sign up',
				'accounts.status.user_menu': 'Account menu',
			}[phrase] || '';
		},
		unlisten() {},
	};
}

class AccountsMock {
	constructor(account = null) {
		this.account = account;
		this.createOpened = false;
		this.listeners = {};
		this.loginOpened = false;
		this.loggedOut = false;
	}

	getAccount() {
		return this.account;
	}

	listen(eventName, listener) {
		this.listeners[eventName] = listener;
		return listener;
	}

	unlisten(eventName, listener) {
		if (this.listeners[eventName] === listener) {
			delete this.listeners[eventName];
		}
	}

	openCreateAccountDialog() {
		this.createOpened = true;
	}

	openLoginDialog() {
		this.loginOpened = true;
	}

	logout() {
		this.loggedOut = true;
	}

	emitAccountChanged(account) {
		this.account = account;
		this.listeners['account-changed']?.(account);
	}
}

function getButtonByText(text) {
	return Array.from(document.body.querySelectorAll('button'))
		.find((button) => button.textContent.trim() === text);
}

function getMenuItemByText(text) {
	return Array.from(document.body.querySelectorAll('[role="menuitem"]'))
		.find((item) => item.textContent.trim() === text);
}

describe('AccountStatus', function() {
	let harness;

	beforeEach(function() {
		const localize = makeLocalizeMock();

		harness = createTestHarness()
			.withService('localize', localize)
			.withContext({ localize });
	});

	afterEach(function() {
		harness?.unmount();
		harness = null;
	});

	it('shows login and sign up actions when logged out', function() {
		const accounts = new AccountsMock();

		harness.render(AccountStatus, {accounts});

		expect(getButtonByText('Login')).toBeTruthy();
		expect(getButtonByText('Sign up')).toBeTruthy();

		act(() => {
			getButtonByText('Login').dispatchEvent(new MouseEvent('click', {bubbles: true}));
		});
		act(() => {
			getButtonByText('Sign up').dispatchEvent(new MouseEvent('click', {bubbles: true}));
		});

		expect(accounts.loginOpened).toBeTrue();
		expect(accounts.createOpened).toBeTrue();
	});

	it('shows the username and logs out from the account menu', function() {
		const accounts = new AccountsMock({
			id: 'account-1',
			username: 'Alice',
			email: null,
		});

		harness.render(AccountStatus, {accounts});

		expect(getButtonByText('Alice')).toBeTruthy();

		act(() => {
			getButtonByText('Alice').dispatchEvent(new MouseEvent('click', {bubbles: true}));
		});
		act(() => {
			getMenuItemByText('Logout').dispatchEvent(new MouseEvent('click', {bubbles: true}));
		});

		expect(accounts.loggedOut).toBeTrue();
	});

	it('updates when account state changes', function() {
		const accounts = new AccountsMock();

		harness.render(AccountStatus, {accounts});

		expect(getButtonByText('Login')).toBeTruthy();

		act(() => {
			accounts.emitAccountChanged({
				id: 'account-1',
				username: 'Alice',
				email: null,
			});
		});

		expect(getButtonByText('Alice')).toBeTruthy();
	});
});
