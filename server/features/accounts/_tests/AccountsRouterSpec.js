/* global describe it expect */

import { Registry, Service } from '@polylith/core';

import { AccountsRouter } from '../accounts-router.js';

class AccountsMock extends Service {
	constructor(registry) {
		super('accounts', registry);
		this.implement([
			'getSalt',
			'createAccount',
			'login',
			'session',
			'logout',
			'getAuthenticatedAccessToken',
			'sendUnauthorized',
			'setLastOpenDocument',
		]);
	}

	getSalt() {
		return this.serviceName;
	}

	createAccount() {
		return this.serviceName;
	}

	login() {
		return this.serviceName;
	}

	session() {
		return this.serviceName;
	}

	logout() {
		return this.serviceName;
	}

	getAuthenticatedAccessToken() {
		return Promise.resolve({account: {id: 'account-1'}});
	}

	sendUnauthorized() {
		return this.serviceName;
	}

	setLastOpenDocument() {
		return this.serviceName;
	}
}

describe('AccountsRouter', function() {
	it('binds account handlers to the accounts service', function() {
		const registry = new Registry();
		const accounts = new AccountsMock(registry);
		const accountsRouter = new AccountsRouter(registry);
		const routes = [];
		const router = {
			get(path, handler) {
				routes.push({path, handler});
			},
			post(path, handler) {
				routes.push({path, handler});
			},
			patch(path, ...handlers) {
				routes.push({path, handlers});
			},
		};

		accountsRouter.accounts = accounts;
		accountsRouter.routes(null, router, null);

		expect(routes.map((route) => route.path)).toEqual([
			'/api/accounts/salt',
			'/api/accounts/create',
			'/api/accounts/login',
			'/api/accounts/session',
			'/api/accounts/logout',
			'/api/accounts/last-open-document',
		]);
		expect(routes.slice(0, 5).map((route) => route.handler())).toEqual([
			'accounts',
			'accounts',
			'accounts',
			'accounts',
			'accounts',
		]);
		expect(routes[5].handlers.length).toBe(2);
		expect(routes[5].handlers[1]()).toBe('accounts');
	});
});
