/// <reference path="./markdown-model.d.ts" />

import { Service } from '@polylith/core';

/** Loads localized markdown documents through the standard IO service. */
export default class MarkdownModelService extends Service {
	constructor(registry) {
		super('markdown-model', registry);

		this.implement(['ready', 'get']);
	}

	/** Subscribes to HTTP dependencies. */
	ready() {
		/** @type {IoService} */
		this.io = this.registry.subscribe('io');
	}

	/**
	 * Loads one localized markdown document by name.
	 *
	 * @param {string} name - Identifies the markdown document.
	 * @returns {Promise<string>} Returns raw markdown text, or an empty string when missing.
	 */
	async get(name) {
		const result = await this.io.get(
			`api/markdown?name=${encodeURIComponent(name)}`,
			{auth: false},
		);

		if (result.success && result.data?.success) {
			return result.data.data || '';
		}

		return '';
	}
}

new MarkdownModelService();
