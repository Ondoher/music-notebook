/* global describe it expect beforeEach */

import { Registry, Service } from '@polylith/core';
import AccountModelService from '../account-model.js';

class IoMock extends Service {
	constructor(registry) {
		super('io', registry);
		this.implement([
			'get',
			'post',
			'setBearerToken',
			'clearBearerToken',
			'setAuthRefreshHandler',
			'send',
		]);
		this.requests = [];
		this.bearerToken = '';
		this.responses = [];
		this.authRefreshHandler = null;
	}

	get(url, options) {
		this.requests.push({url, options});
		return Promise.resolve(this.responses.shift() || {success: false});
	}

	post(url, body, options) {
		this.requests.push({url, body, options});
		return Promise.resolve(this.responses.shift() || {success: false});
	}

	send(options) {
		this.requests.push(options);
		return Promise.resolve(this.responses.shift() || {success: false});
	}

	setBearerToken(token) {
		this.bearerToken = token;
	}

	clearBearerToken() {
		this.bearerToken = '';
	}

	setAuthRefreshHandler(handler) {
		this.authRefreshHandler = handler;
	}
}

describe('AccountModelService', function() {
	let accountModel;
	let io;
	let registry;

	beforeEach(async function() {
		registry = new Registry();
		io = new IoMock(registry);
		accountModel = new AccountModelService(registry);
		accountModel.ready();
		await Promise.resolve();
		io.requests = [];
		io.responses = [];
	});

	it('gets salt through the unauthenticated account API', async function() {
		io.responses.push({
			success: true,
			data: {
				success: true,
				salt: 'salt-1',
			},
		});

		let salt = await accountModel.getSalt('Alice');

		expect(salt).toBe('salt-1');
		expect(io.requests[0]).toEqual({
			url: 'api/accounts/salt',
			body: {username: 'Alice'},
			options: {auth: false},
		});
	});

	it('hashes passwords with the current client hash version and salt', async function() {
		let hash = await accountModel.hashPassword('secret', 'salt-1');

		expect(hash).toMatch(/^[a-f0-9]{64}$/);
		expect(hash).toBe(await accountModel.hashString('1:salt-1:secret'));
	});

	it('creates accounts by fetching salt and sending a password hash', async function() {
		io.responses.push(
			{
				success: true,
				data: {
					success: true,
					salt: 'salt-1',
				},
			},
			{
				success: true,
				data: {
					success: true,
					token: 'token-2',
					account: {
						id: 'account-1',
						username: 'Alice',
						email: null,
					},
				},
			},
		);

		let result = await accountModel.createAccount({
			username: 'Alice',
			password: 'secret',
		});

		expect(result.success).toBeTrue();
		expect(io.requests[1].url).toBe('api/accounts/create');
		expect(io.requests[1].options).toEqual({auth: false});
		expect(io.requests[1].body).toEqual(jasmine.objectContaining({
			username: 'Alice',
			email: null,
		}));
		expect(io.requests[1].body.passwordHash).toMatch(/^[a-f0-9]{64}$/);
		expect(io.requests[1].body.password).toBeUndefined();
		expect(accountModel.getAccount()).toEqual({
			id: 'account-1',
			username: 'Alice',
			email: null,
		});
		expect(accountModel.getToken()).toBe('token-2');
	});

	it('logs in and applies returned bearer tokens', async function() {
		io.responses.push(
			{
				success: true,
				data: {
					success: true,
					salt: 'salt-1',
				},
			},
			{
				success: true,
				data: {
					success: true,
					token: 'token-1',
					account: {
						id: 'account-1',
						username: 'Alice',
						email: null,
					},
				},
			},
		);

		let result = await accountModel.login({
			username: 'Alice',
			password: 'secret',
		});

		expect(result.success).toBeTrue();
		expect(io.requests[1].url).toBe('api/accounts/login');
		expect(io.requests[1].body.passwordHash).toMatch(/^[a-f0-9]{64}$/);
		expect(accountModel.isAuthenticated()).toBeTrue();
		expect(accountModel.getToken()).toBe('token-1');
		expect(io.bearerToken).toBe('token-1');

		accountModel.clearSession();

		expect(accountModel.getAccount()).toBeNull();
		expect(accountModel.isAuthenticated()).toBeFalse();
		expect(io.bearerToken).toBe('');
	});

	it('restores server sessions by exchanging the session cookie for a bearer token', async function() {
		io.responses.push({
			success: true,
			data: {
				success: true,
				token: 'token-1',
				account: {
					id: 'account-1',
					username: 'Alice',
					email: null,
				},
			},
		});

		accountModel = new AccountModelService(registry);
		accountModel.ready();
		await Promise.resolve();

		expect(io.bearerToken).toBe('token-1');
		expect(io.requests[0]).toEqual({
			url: 'api/accounts/session',
			options: {
				auth: false,
				skipAuthRefresh: true,
			},
		});
		expect(accountModel.getAccount()).toEqual({
			id: 'account-1',
			username: 'Alice',
			email: null,
		});
	});

	it('refreshes bearer tokens from the server session cookie', async function() {
		io.responses.push({
			success: true,
			data: {
				success: true,
				token: 'token-2',
				account: {
					id: 'account-1',
					username: 'Alice',
					email: null,
				},
			},
		});

		let refreshed = await accountModel.refreshAccessToken();

		expect(refreshed).toBeTrue();
		expect(io.requests[0]).toEqual({
			url: 'api/accounts/session',
			options: {
				auth: false,
				skipAuthRefresh: true,
			},
		});
		expect(accountModel.getToken()).toBe('token-2');
		expect(io.bearerToken).toBe('token-2');
	});

	it('logs out through the session API and clears local state', async function() {
		io.responses.push({
			success: true,
			data: {
				success: true,
				salt: 'salt-1',
			},
		}, {
			success: true,
			data: {
				success: true,
				token: 'token-1',
				account: {
					id: 'account-1',
					username: 'Alice',
					email: null,
				},
			},
		}, {
			success: true,
			data: {
				success: true,
			},
		});

		await accountModel.login({
			username: 'Alice',
			password: 'secret',
		});
		let result = await accountModel.logout();

		expect(result.success).toBeTrue();
		expect(io.requests[2]).toEqual({
			url: 'api/accounts/logout',
			body: {},
			options: undefined,
		});
		expect(accountModel.getAccount()).toBeNull();
		expect(accountModel.getToken()).toBe('');
	});

	it('stores the last open document id on the account', async function() {
		accountModel.applySession({
			token: 'token-1',
			account: {
				id: 'account-1',
				username: 'Alice',
				email: null,
				lastOpenDocumentId: null,
			},
		});
		let accountChangedEvents = [];
		let sessionChangedEvents = [];

		accountModel.listen('account-changed', (event) => accountChangedEvents.push(event));
		accountModel.listen('account-session-changed', (event) => sessionChangedEvents.push(event));
		io.responses.push({
			success: true,
			data: {
				success: true,
				account: {
					id: 'account-1',
					username: 'Alice',
					email: null,
					lastOpenDocumentId: 'doc-1',
				},
			},
		});

		let result = await accountModel.setLastOpenDocument('doc-1');

		expect(result.success).toBeTrue();
		expect(io.requests[0]).toEqual({
			method: 'PATCH',
			url: 'api/accounts/last-open-document',
			body: {
				documentId: 'doc-1',
			},
		});
		expect(accountModel.getAccount().lastOpenDocumentId).toBe('doc-1');
		expect(accountChangedEvents.length).toBe(1);
		expect(accountChangedEvents[0].account.lastOpenDocumentId).toBe('doc-1');
		expect(sessionChangedEvents.length).toBe(0);
	});
});
