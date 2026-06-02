import { Service } from '@polylith/core';
import Localization from '../common/localization.js';
import phrases from '../phrases/en-US.json';

export default class LocalizeService extends Service {
	constructor(registry) {
		super('localize', registry);
		this.implement([
			'start',
			'ready',
			'switchLocale',
			'getLocales',
			'getLanguage',
			'getLocale',
			'getMonthNames',
			'getDateOrder',
			'getDateSeparator',
			'translate',
			'translateLocale',
			'translateMarkdown',
			'findKeys',
			'getPhrase',
			'replacePhrases',
		]);
	}

	start() {
		this.localization = new Localization();
		this.localization.fire = this.fire.bind(this);
		this.localization.add('en-US-u-ms-ussystem', phrases);
		this.markdownCache = {};
	}

	/** Subscribes to optional localized content services. */
	ready() {
		/** @type {MarkdownModelService} */
		this.markdown = this.registry.subscribe('markdown-model');
	}

	switchLocale(locale) {
		this.localization.switchLocale(locale);
	}

	getLocales() {
		return this.localization.getLocales();
	}

	getLanguage() {
		return this.localization.getLanguage();
	}

	getLocale() {
		return this.localization.getLocale();
	}

	getMonthNames(format) {
		return this.localization.getMonthNames(format);
	}

	getDateOrder() {
		return this.localization.getDateOrder();
	}

	getDateSeparator() {
		return this.localization.getDateSeparator();
	}

	getPhrase(key) {
		return this.localization.getPhrase(key);
	}

	replacePhrases(phrases) {
		this.localization.replacePhrases(phrases);
	}

	findKeys(locale, match, cb) {
		return this.localization.findKeys(locale, match, cb);
	}

	translate(key, replacements, cardinal) {
		return this.localization.translate(key, replacements, cardinal);
	}

	translateLocale(locale, key, replacements, cardinal) {
		return this.localization.translateLocale(locale, key, replacements, cardinal);
	}

	/**
	 * Translates one localized markdown document through the active locale.
	 *
	 * @param {string} name - Identifies the markdown document.
	 * @param {Record<string, LocalizedReplacementValue>} [replacements] - Supplies replacement values.
	 * @returns {Promise<string>} Returns the localized markdown text.
	 */
	async translateMarkdown(name, replacements = {}) {
		if (!this.markdown?.get) {
			return '';
		}

		const language = this.getLanguage();
		this.markdownCache[language] = this.markdownCache[language] || {};

		if (this.markdownCache[language][name] === undefined) {
			this.markdownCache[language][name] = await this.markdown.get(name);
		}

		return this.localization.replace(
			this.markdownCache[language][name] || '',
			replacements,
		);
	}
}

new LocalizeService();
