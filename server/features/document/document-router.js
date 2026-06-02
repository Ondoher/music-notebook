/// <reference path="./document-router.d.ts" />

import { Service } from '@polylith/core';

/** Adds document persistence routes. */
export class DocumentRouter extends Service {
	constructor(registry) {
		super('document-router', registry);

		this.implement(['ready', 'routes']);
	}

	/** Subscribes to route registration dependencies. */
	ready() {
		/** @type {RoutersService} */
		this.routerService = this.registry.subscribe('routers');

		/** @type {DocumentService} */
		this.document = this.registry.subscribe('document');

		/** @type {AccountsService} */
		this.accounts = this.registry.subscribe('accounts');
		this.routerService.add(this.serviceName);
	}

	/**
	 * Authenticates document API requests with a bearer token.
	 *
	 * @param {import("express").Request} request - Supplies the request.
	 * @param {import("express").Response} response - Receives auth failures.
	 * @param {import("express").NextFunction} next - Continues to the route handler.
	 * @returns {Promise<import("express").Response | void>} Returns unauthorized responses when needed.
	 */
	async authenticate(request, response, next) {
		const authenticated = await this.accounts.getAuthenticatedAccessToken(request);

		if (!authenticated) {
			return response.status(401).json({
				success: false,
				reason: 'unauthorized',
			});
		}

		request.account = authenticated.account;
		request.accountSession = authenticated.session;
		next();
	}

	/**
	 * Adds document API routes to the app router.
	 *
	 * @param {typeof import("express")} _express - Carries the Express module.
	 * @param {import("express").Router} router - Receives document routes.
	 * @param {*} _app - Carries the Polylith app.
	 */
	routes(_express, router, _app) {
		router.use('/api/documents', this.authenticate.bind(this));
		router.get('/api/documents', this.document.listDocuments.bind(this.document));
		router.get('/api/documents/:id', this.document.getDocument.bind(this.document));
		router.post('/api/documents', this.document.saveDocument.bind(this.document));
		router.put('/api/documents/:id', this.document.saveDocument.bind(this.document));
		router.post('/api/documents/:id/save-as', this.document.saveDocumentAs.bind(this.document));
		router.patch('/api/documents/:id/name', this.document.renameDocument.bind(this.document));
		router.post('/api/documents/:id/duplicate', this.document.duplicateDocument.bind(this.document));
		router.delete('/api/documents/:id', this.document.deleteDocument.bind(this.document));
	}
}

new DocumentRouter();
