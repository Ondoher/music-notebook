import React from 'react';
import { act } from 'react';

import AccountDialog from '../AccountDialog.jsx';
import { createTestHarness } from '../../../../testing/TestHarness.js';

function makeLocalizeMock() {
	return {
		getLocale() {
			return 'en-US';
		},
		listen() {},
		translate(phrase) {
			return {
				'accounts.confirm_password': 'Confirm password',
				'accounts.create.dialog.description': 'Create a Music Notebook account so you can save your work.',
				'accounts.create.dialog.title': 'Create Account',
				'accounts.create.result.success.description': 'Your account is ready.',
				'accounts.create.result.success.title': 'Account Created',
				'accounts.create.submit': 'Create account',
				'accounts.email': 'Email',
				'accounts.error.password_mismatch': 'Passwords do not match.',
				'accounts.login.dialog.description': 'Log in to save and manage your notebooks.',
				'accounts.login.dialog.title': 'Login',
				'accounts.login.submit': 'Login',
				'accounts.password': 'Password',
				'accounts.password.rule.length': 'At least 8 characters',
				'accounts.password.rule.number': 'Includes a number',
				'accounts.username': 'Username',
				'common.cancel': 'Cancel',
				'common.close': 'Close',
				'password.toggle_visibility': 'Toggle password visibility',
			}[phrase] || '';
		},
		unlisten() {},
	};
}

class AccountsMock {
	constructor(mode = 'create') {
		this.created = [];
		this.loggedOut = false;
		this.listeners = {};
		this.logins = [];
		this.state = {
			errorReason: '',
			mode,
			open: true,
			pending: false,
			resultReason: '',
			resultSuccess: false,
		};
	}

	getDialogState() {
		return this.state;
	}

	listen(eventName, listener) {
		this.listeners[eventName] = listener;
		return listener;
	}

	unlisten(eventName) {
		delete this.listeners[eventName];
	}

	closeDialog() {
		this.state = {
			...this.state,
			open: false,
		};
		this.listeners['dialog-changed']?.(this.state);
	}

	createAccount(credentials) {
		this.created.push(credentials);
		return Promise.resolve({success: true, data: {success: true}});
	}

	login(credentials) {
		this.logins.push(credentials);
		return Promise.resolve({success: true, data: {success: true}});
	}

	logout() {
		this.loggedOut = true;
		this.closeDialog();
		return {success: true, data: {success: true}};
	}
}

function getDialogRoot() {
	return document.body.querySelector('.accounts-dialog');
}

function getInputByName(name) {
	return Array.from(document.body.querySelectorAll('.accounts-dialog input'))
		.find((input) => input.name === name);
}

function getButtonByText(text) {
	return Array.from(document.body.querySelectorAll('.accounts-dialog button'))
		.find((button) => button.textContent.trim() === text);
}

describe('AccountDialog', function() {
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

	it('renders create-account fields and submits account credentials', async function() {
		const accounts = new AccountsMock('create');

		harness.render(AccountDialog, {accounts});

		expect(getDialogRoot().textContent).toContain('Create Account');

		await act(async () => {
			setInputValue(getInputByName('username'), 'Alice');
			getInputByName('username').dispatchEvent(new Event('input', {bubbles: true}));
			setInputValue(getInputByName('email'), 'alice@example.com');
			getInputByName('email').dispatchEvent(new Event('input', {bubbles: true}));
			setInputValue(getInputByName('password'), 'secret1x');
			getInputByName('password').dispatchEvent(new Event('input', {bubbles: true}));
			setInputValue(getInputByName('confirmPassword'), 'secret1x');
			getInputByName('confirmPassword').dispatchEvent(new Event('input', {bubbles: true}));
		});

		await act(async () => {
			getButtonByText('Create account').dispatchEvent(new MouseEvent('click', {bubbles: true}));
		});

		expect(accounts.created[0]).toEqual({
			email: 'alice@example.com',
			password: 'secret1x',
			username: 'Alice',
		});
	});

	it('renders login fields and submits login credentials', async function() {
		const accounts = new AccountsMock('login');

		harness.render(AccountDialog, {accounts});

		expect(getDialogRoot().textContent).toContain('Login');
		expect(getInputByName('email')).toBeUndefined();

		await act(async () => {
			setInputValue(getInputByName('username'), 'Alice');
			getInputByName('username').dispatchEvent(new Event('input', {bubbles: true}));
			setInputValue(getInputByName('password'), 'secret');
			getInputByName('password').dispatchEvent(new Event('input', {bubbles: true}));
		});

		await act(async () => {
			getButtonByText('Login').dispatchEvent(new MouseEvent('click', {bubbles: true}));
		});

		expect(accounts.logins[0]).toEqual({
			password: 'secret',
			username: 'Alice',
		});
	});

	it('renders the account creation success result', async function() {
		const accounts = new AccountsMock('create-result');
		accounts.state.resultSuccess = true;

		harness.render(AccountDialog, {accounts});

		expect(getDialogRoot().textContent).toContain('Account Created');
		expect(getDialogRoot().textContent).toContain('Your account is ready.');

		await act(async () => {
			getButtonByText('Close').dispatchEvent(new MouseEvent('click', {bubbles: true}));
		});

		expect(accounts.getDialogState().open).toBeFalse();
	});

	it('shows validation errors before submitting invalid create-account data', async function() {
		const accounts = new AccountsMock('create');

		harness.render(AccountDialog, {accounts});

		await act(async () => {
			setInputValue(getInputByName('username'), 'Alice');
			getInputByName('username').dispatchEvent(new Event('input', {bubbles: true}));
			setInputValue(getInputByName('password'), 'secret1x');
			getInputByName('password').dispatchEvent(new Event('input', {bubbles: true}));
			setInputValue(getInputByName('confirmPassword'), 'different1');
			getInputByName('confirmPassword').dispatchEvent(new Event('input', {bubbles: true}));
		});

		await act(async () => {
			getButtonByText('Create account').dispatchEvent(new MouseEvent('click', {bubbles: true}));
		});

		expect(accounts.created.length).toBe(0);
		expect(getDialogRoot().textContent).toContain('Passwords do not match.');
	});

});

function setInputValue(input, value) {
	const valueSetter = Object.getOwnPropertyDescriptor(input, 'value')?.set;
	const prototypeValueSetter = Object.getOwnPropertyDescriptor(
		Object.getPrototypeOf(input),
		'value',
	)?.set;

	if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
		prototypeValueSetter.call(input, value);
		return;
	}

	valueSetter?.call(input, value);
}
