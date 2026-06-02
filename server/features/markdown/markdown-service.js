/// <reference path="./markdown-service.d.ts" />

import path from 'path';
import { readFile } from 'fs/promises';
import { Service } from '@polylith/core';

const DEFAULT_LANGUAGE = 'en_US';

/** Loads localized markdown content from the server data folder. */
export class MarkdownService extends Service {
	constructor(registry) {
		super('markdown', registry);

		this.implement([
			'start',
			'normalizeLanguage',
			'normalizeName',
			'getLanguageCandidates',
			'getMarkdown',
		]);
	}

	/** Initializes the markdown content root. */
	start() {
		this.root = path.resolve('server', 'data', 'markdown');
	}

	/**
	 * Normalizes one request language into a markdown content folder name.
	 *
	 * @param {string} [language] - Supplies the Accept-Language header value.
	 * @returns {string} Returns a safe markdown language folder name.
	 */
	normalizeLanguage(language = DEFAULT_LANGUAGE) {
		const firstLanguage = String(language || DEFAULT_LANGUAGE)
			.split(',')[0]
			.split(';')[0]
			.trim()
			.replace(/-/g, '_')
			.replace(/[^a-zA-Z0-9_]/g, '');

		return firstLanguage || DEFAULT_LANGUAGE;
	}

	/**
	 * Normalizes one document name into a safe markdown basename.
	 *
	 * @param {string} [name] - Supplies the requested markdown name.
	 * @returns {string} Returns a safe markdown basename.
	 */
	normalizeName(name = '') {
		const basename = path.basename(String(name), '.md');
		return basename.replace(/[^a-zA-Z0-9_-]/g, '');
	}

	/**
	 * Gets candidate language folders in lookup order.
	 *
	 * @param {string} [language] - Supplies the Accept-Language header value.
	 * @returns {string[]} Returns candidate language folder names.
	 */
	getLanguageCandidates(language = DEFAULT_LANGUAGE) {
		const normalized = this.normalizeLanguage(language);
		return Array.from(new Set([normalized, DEFAULT_LANGUAGE]));
	}

	/**
	 * Loads one localized markdown document by name.
	 *
	 * @param {string} name - Supplies the requested markdown name.
	 * @param {string} [language] - Supplies the Accept-Language header value.
	 * @returns {Promise<MarkdownLoadResult>} Returns the markdown lookup result.
	 */
	async getMarkdown(name, language = DEFAULT_LANGUAGE) {
		const safeName = this.normalizeName(name);

		if (!safeName) {
			return {
				success: false,
				reason: 'markdown.error.invalid_name',
			};
		}

		for (const candidate of this.getLanguageCandidates(language)) {
			try {
				const filename = path.join(this.root, candidate, `${safeName}.md`);
				const content = await readFile(filename, 'utf-8');

				return {
					success: true,
					data: content,
				};
			} catch (error) {
				if (error?.code !== 'ENOENT') {
					return {
						success: false,
						reason: 'markdown.error.read_failed',
					};
				}
			}
		}

		return {
			success: false,
			reason: 'markdown.error.file_not_found',
		};
	}
}

new MarkdownService();
