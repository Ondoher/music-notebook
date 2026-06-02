/* global describe it expect */

import { Registry, Service } from '@polylith/core';

import { DocumentRouter } from '../document-router.js';

class AccountsMock extends Service {
	constructor(registry) {
		super('accounts', registry);
		this.implement(['getAuthenticatedAccessToken']);
		this.authenticated = null;
	}

	getAuthenticatedAccessToken() {
		return Promise.resolve(this.authenticated);
	}
}

class DocumentMock extends Service {
	constructor(registry) {
		super('document', registry);
		this.implement([
			'listDocuments',
			'getDocument',
			'saveDocument',
			'saveDocumentAs',
			'renameDocument',
			'duplicateDocument',
			'deleteDocument',
		]);
	}

	listDocuments() { return 'listDocuments'; }
	getDocument() { return 'getDocument'; }
	saveDocument() { return 'saveDocument'; }
	saveDocumentAs() { return 'saveDocumentAs'; }
	renameDocument() { return 'renameDocument'; }
	duplicateDocument() { return 'duplicateDocument'; }
	deleteDocument() { return 'deleteDocument'; }
}

class ResponseMock {
	constructor() {
		this.statusCode = 200;
		this.body = null;
	}

	status(statusCode) {
		this.statusCode = statusCode;
		return this;
	}

	json(body) {
		this.body = body;
		return this;
	}
}

describe('DocumentRouter', function() {
	it('binds authenticated document routes to the document service', function() {
		const registry = new Registry();
		const document = new DocumentMock(registry);
		const documentRouter = new DocumentRouter(registry);
		const routes = [];
		const router = {
			delete(path, handler) {
				routes.push({method: 'delete', path, handler});
			},
			get(path, handler) {
				routes.push({method: 'get', path, handler});
			},
			patch(path, handler) {
				routes.push({method: 'patch', path, handler});
			},
			post(path, handler) {
				routes.push({method: 'post', path, handler});
			},
			put(path, handler) {
				routes.push({method: 'put', path, handler});
			},
			use(path, handler) {
				routes.push({method: 'use', path, handler});
			},
		};

		documentRouter.document = document;
		documentRouter.routes(null, router, null);

		expect(routes.map((route) => `${route.method} ${route.path}`)).toEqual([
			'use /api/documents',
			'get /api/documents',
			'get /api/documents/:id',
			'post /api/documents',
			'put /api/documents/:id',
			'post /api/documents/:id/save-as',
			'patch /api/documents/:id/name',
			'post /api/documents/:id/duplicate',
			'delete /api/documents/:id',
		]);
		expect(routes.slice(1).map((route) => route.handler())).toEqual([
			'listDocuments',
			'getDocument',
			'saveDocument',
			'saveDocument',
			'saveDocumentAs',
			'renameDocument',
			'duplicateDocument',
			'deleteDocument',
		]);
	});

	it('returns unauthorized when document requests have no bearer-token account', async function() {
		const registry = new Registry();
		const accounts = new AccountsMock(registry);
		const documentRouter = new DocumentRouter(registry);
		const response = new ResponseMock();
		let nextCalled = false;

		documentRouter.accounts = accounts;

		await documentRouter.authenticate({}, response, () => {
			nextCalled = true;
		});

		expect(nextCalled).toBeFalse();
		expect(response.statusCode).toBe(401);
		expect(response.body).toEqual({
			success: false,
			reason: 'unauthorized',
		});
	});

	it('adds the authenticated account to the request before continuing', async function() {
		const registry = new Registry();
		const accounts = new AccountsMock(registry);
		const documentRouter = new DocumentRouter(registry);
		const request = {};
		const response = new ResponseMock();
		let nextCalled = false;

		accounts.authenticated = {
			account: {
				id: 'account-1',
				username: 'Alice',
			},
			session: {
				accountId: 'account-1',
			},
		};
		documentRouter.accounts = accounts;

		await documentRouter.authenticate(request, response, () => {
			nextCalled = true;
		});

		expect(nextCalled).toBeTrue();
		expect(request.account).toBe(accounts.authenticated.account);
		expect(request.accountSession).toBe(accounts.authenticated.session);
	});
});
