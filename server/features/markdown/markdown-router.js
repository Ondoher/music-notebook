/// <reference path="./markdown-router.d.ts" />

import { Service } from '@polylith/core';

/** Adds localized markdown content routes. */
export class MarkdownRouter extends Service {
	constructor(registry) {
		super('markdown-router', registry);

		this.implement(['ready', 'routes']);
	}

	/** Subscribes to route registration dependencies. */
	ready() {
		/** @type {RoutersService} */
		this.routerService = this.registry.subscribe('routers');

		/** @type {MarkdownService} */
		this.markdown = this.registry.subscribe('markdown');
		this.routerService.add(this.serviceName);
	}

	/**
	 * Handles one localized markdown request.
	 *
	 * @param {import("express").Request} request - Supplies the markdown request.
	 * @param {import("express").Response} response - Receives the markdown response.
	 * @returns {Promise<import("express").Response>} Returns the Express response.
	 */
	async getMarkdown(request, response) {
		const result = await this.markdown.getMarkdown(
			request.query?.name,
			request.get?.('accept-language') || request.headers?.['accept-language'],
		);

		if (!result.success) {
			return response.status(404).json(result);
		}

		return response.json(result);
	}

	/**
	 * Adds markdown API routes to the app router.
	 *
	 * @param {typeof import("express")} _express - Carries the Express module.
	 * @param {import("express").Router} router - Receives markdown routes.
	 * @param {*} _app - Carries the Polylith app.
	 */
	routes(_express, router, _app) {
		router.get('/api/markdown', this.getMarkdown.bind(this));
	}
}

new MarkdownRouter();
