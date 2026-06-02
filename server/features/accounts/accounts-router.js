import { Service } from "@polylith/core";

export class AccountsRouter extends Service {
	constructor(registry) {
		super('accounts-router', registry);

		this.implement(['ready', 'authenticate', 'routes']);
	}

	/**
	 * Authenticates account metadata routes with a bearer token.
	 *
	 * @param {import("express").Request} request - Supplies the request.
	 * @param {import("express").Response} response - Receives auth failures.
	 * @param {import("express").NextFunction} next - Continues to the route handler.
	 * @returns {Promise<import("express").Response | void>} Returns unauthorized responses when needed.
	 */
	async authenticate(request, response, next) {
		let authenticated = await this.accounts.getAuthenticatedAccessToken(request);

		if (!authenticated) {
			return this.accounts.sendUnauthorized(response);
		}

		next();
	}

	/** Subscribes to route registration dependencies. */
	ready() {
		/** @type {RoutersService} */
		this.routerService = this.registry.subscribe('routers');

		/** @type {AccountsService} */
		this.accounts = this.registry.subscribe('accounts');
		this.routerService.add(this.serviceName);
	}

	/**
	 * Adds account API routes to the app router.
	 *
	 * @param {typeof import("express")} _express - Carries the Express module.
	 * @param {import("express").Router} router - Receives account routes.
	 * @param {*} _app - Carries the Polylith app.
	 */
	routes(_express, router, _app) {
		router.post('/api/accounts/salt', this.accounts.getSalt.bind(this.accounts));
		router.post('/api/accounts/create', this.accounts.createAccount.bind(this.accounts));
		router.post('/api/accounts/login', this.accounts.login.bind(this.accounts));
		router.get('/api/accounts/session', this.accounts.session.bind(this.accounts));
		router.post('/api/accounts/logout', this.accounts.logout.bind(this.accounts));
		router.patch(
			'/api/accounts/last-open-document',
			this.authenticate.bind(this),
			this.accounts.setLastOpenDocument.bind(this.accounts),
		);
	}
}

new AccountsRouter();
