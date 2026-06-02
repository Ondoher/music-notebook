import path from 'path';
import { Service } from "@polylith/core";

/** Provides the final app-shell route fallback. */
export class FinalRouter extends Service {
	constructor(registry) {
		super('final-router', registry);

		this.implement(['ready', 'routes']);
	}

	/** Registers this router as the final route service. */
	ready() {
		this.routerService = this.registry.subscribe('routers');
		this.routerService.setLast(this.serviceName);
	}

	/**
	 * Adds the app-shell fallback route.
	 *
	 * @param {typeof import("express")} _express - Carries the Express module.
	 * @param {import("express").Router} router - Receives the fallback route.
	 * @param {*} app - Carries the Polylith app.
	 */
	routes(_express, router, app) {
		router.get('*', function(_request, response) {
			if (app && typeof app.sendIndex === 'function') {
				app.sendIndex(response);
				return;
			}

			response.sendFile(path.resolve('dist', 'mn', 'index.html'));
		});
	}
}


new FinalRouter();
