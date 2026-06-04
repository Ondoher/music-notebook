/// <reference path="./types.d.ts" />

import Translator from './Translator.js';

/**
 * Stores phrase maps and translates phrase keys for the active locale.
 *
 * The `localize` service wraps this plain engine and supplies `fire` so locale
 * changes can notify service listeners and React views.
 */
export default class Localization {
	/** Initializes localization state with the default app locale. */
	constructor() {
		/** @type {Record<LocalizationLocale, Translator>} */
		this.translators = {};
		/** @type {LocalizationLocale} */
		this.locale = 'en-US-u-ms-ussystem';
		/** @type {Translator | undefined} */
		this.translator = undefined;
		/** @type {LocalizationEventEmitter | undefined} */
		this.fire = undefined;
	}

	/**
	 * Gets the active locale identifier.
	 *
	 * @returns {LocalizationLocale}
	 */
	getLocale() {
		return this.locale;
	}

	/**
	 * Gets the language portion of the active locale identifier.
	 *
	 * @returns {string}
	 */
	getLanguage() {
		return this.locale.split('-u')[0];
	}

	/**
	 * Gets localized month names for the active language.
	 *
	 * @param {'long' | 'short' | 'narrow'} [format='long'] - Intl month display style.
	 * @returns {string[]}
	 */
	getMonthNames(format = 'long') {
		const locale = this.getLanguage();
		const formatter = new Intl.DateTimeFormat(locale, { month: format, timeZone: 'UTC' });
		const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((month) => {
			const mm = month < 10 ? `0${month}` : month;
			return new Date(`2017-${mm}-01T00:00:00+00:00`);
		});

		return months.map((date) => formatter.format(date));
	}

	/**
	 * Gets the date separator used by the active language.
	 *
	 * @returns {string | undefined}
	 */
	getDateSeparator() {
		const locale = this.getLanguage();
		const separators = ['/', '-', '.', '. '];
		const dateStr = new Intl.DateTimeFormat(locale).format(new Date());

		return separators.find((separator) => dateStr.split(separator).length !== 1);
	}

	/**
	 * Gets the date field order used by the active language.
	 *
	 * @returns {LocalizationDateOrder}
	 */
	getDateOrder() {
		const locale = this.getLanguage();
		const separator = this.getDateSeparator();

		if (!separator) {
			return ['month', 'day', 'year'];
		}

		let parts = new Intl.DateTimeFormat(locale).format(new Date(2000, 0, 21)).split(separator);
		parts = parts.slice(0, 3).map((part) => parseInt(part, 10));

		const order = {};
		order[parts.indexOf(1)] = 'month';
		order[parts.indexOf(2000)] = 'year';
		order[parts.indexOf(21)] = 'date';

		return [order[0], order[1], order[2]];
	}

	/**
	 * Adds a locale phrase map and activates it when it matches the active locale.
	 *
	 * @param {LocalizationLocale} locale
	 * @param {LocalizationPhraseMap} phrases
	 * @returns {void}
	 */
	add(locale, phrases) {
		this.translators[locale] = new Translator({ phrases, locale });
		this.translators[locale].setDefault(this.translators['en-US-u-ms-ussystem']);

		if (locale === this.locale) {
			this.translator = this.translators[locale];
		}
	}

	/**
	 * Extends an existing locale with additional nested or flattened phrases.
	 *
	 * @param {LocalizationLocale} locale
	 * @param {LocalizationPhraseMap} phrases
	 * @returns {void}
	 */
	extend(locale, phrases) {
		if (!this.translators[locale]) {
			console.warn('Trying to extend phrases for nonexisting locale:', locale);
			return;
		}

		this.translators[locale].extend(phrases);
		this.fire?.('updated');
	}

	/**
	 * Checks whether a locale has loaded phrase data.
	 *
	 * @param {LocalizationLocale} locale
	 * @returns {boolean}
	 */
	hasLocale(locale) {
		return Boolean(this.translators[locale]);
	}

	/**
	 * Switches the active locale and notifies listeners.
	 *
	 * @param {LocalizationLocale} locale
	 * @returns {void}
	 */
	switchLocale(locale) {
		if (!this.translators[locale]) {
			console.warn('Attempt to switch to nonexistent locale', locale);
			return;
		}

		this.translator = this.translators[locale];
		this.locale = locale;
		this.fire?.('changeLocale', locale);
	}

	/**
	 * Translates a phrase key in the active locale.
	 *
	 * @param {string} key
	 * @param {LocalizationReplacementMap} [replacements]
	 * @param {number} [cardinal]
	 * @returns {string}
	 */
	translate(key, replacements, cardinal) {
		if (!this.translator) {
			console.error('No current translator');
			return '';
		}

		return this.translator.translate(key, replacements, cardinal);
	}

	/**
	 * Translates a phrase key in a specific locale.
	 *
	 * @param {LocalizationLocale} locale
	 * @param {string} key
	 * @param {LocalizationReplacementMap} [replacements]
	 * @param {number} [cardinal]
	 * @returns {string}
	 */
	translateLocale(locale, key, replacements, cardinal) {
		if (!this.translators[locale]) {
			console.warn('Attempt to switch to nonexistent locale', locale);
			return '';
		}

		return this.translators[locale].translate(key, replacements, cardinal);
	}

	/**
	 * Replaces `%{name}` tokens in arbitrary localized text.
	 *
	 * @param {string} text
	 * @param {LocalizationReplacementMap} [replacements]
	 * @returns {string}
	 */
	replace(text, replacements = {}) {
		if (!this.translator) {
			console.error('No current translator');
			return '';
		}

		return this.translator.replace(text, replacements);
	}

	/**
	 * Gets all loaded locale identifiers.
	 *
	 * @returns {LocalizationLocale[]}
	 */
	getLocales() {
		return Object.keys(this.translators);
	}

	/**
	 * Gets the raw phrase value for the active locale.
	 *
	 * @param {string} key
	 * @returns {LocalizationPhraseValue | undefined}
	 */
	getPhrase(key) {
		const translator = this.translators[this.getLocale()];
		return translator.getPhrase(key);
	}

	/**
	 * Finds phrase keys for a locale that match a regular expression.
	 *
	 * @param {LocalizationLocale} locale
	 * @param {RegExp} match
	 * @param {LocalizationFindKeyCallback} cb
	 * @returns {void}
	 */
	findKeys(locale, match, cb) {
		const translator = this.translators[locale];
		const phrases = translator.getAll();
		const keys = Object.keys(phrases);

		keys.forEach((key) => {
			const matched = key.match(match);

			if (matched) {
				cb(key, matched);
			}
		});
	}

	/**
	 * Replaces active-locale phrases and notifies listeners.
	 *
	 * @param {LocalizationFlatPhraseMap} phrases
	 * @returns {void}
	 */
	replacePhrases(phrases) {
		if (!this.translator) {
			console.error('No current translator');
			return;
		}

		this.translator.replacePhrases(phrases);
		this.fire?.('updated');
	}
}
