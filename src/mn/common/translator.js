/// <reference path="./types.d.ts" />

/**
 * Translates phrase keys for one locale.
 *
 * A translator owns one flattened phrase map, optional fallback phrases from
 * the default locale, plural selection, and `%{name}` token replacement.
 */
export default class Translator {
	/**
	 * Creates a translator for one locale.
	 *
	 * @param {TranslatorOptions} [options]
	 */
	constructor(options = {}) {
		const phrases = options.phrases || {};

		/** @type {LocalizationFlatPhraseMap} */
		this.phrases = JSON.parse(JSON.stringify(phrases));
		/** @type {LocalizationLocale} */
		this.locale = options.locale || 'en-US-u-ms-ussystem';
		/** @type {string} */
		this.language = this.locale.split('-u-')[0];
		/** @type {LocalizationFlatPhraseMap} */
		this.defaultPhrases = {};
	}

	/**
	 * Gets the flattened phrase map owned by this translator.
	 *
	 * @returns {LocalizationFlatPhraseMap}
	 */
	getAll() {
		return this.phrases;
	}

	/**
	 * Gets the translator locale identifier.
	 *
	 * @returns {LocalizationLocale}
	 */
	getLocale() {
		return this.locale;
	}

	/**
	 * Gets the language portion of the locale identifier.
	 *
	 * @returns {string}
	 */
	getLanguage() {
		return this.language;
	}

	/**
	 * Gets one raw phrase value without fallback or replacement.
	 *
	 * @param {string} key
	 * @returns {LocalizationPhraseValue | undefined}
	 */
	getPhrase(key) {
		return this.phrases[key];
	}

	/**
	 * Gets the locale plural rule for a numeric cardinal value.
	 *
	 * @param {number} number
	 * @returns {LocalizationPluralRule}
	 */
	getPluralForm(number) {
		return new Intl.PluralRules(this.locale).select(number);
	}

	/**
	 * Translates a phrase key and applies replacements.
	 *
	 * @param {string | undefined} key
	 * @param {LocalizationReplacementMap} [replacements]
	 * @param {number} [cardinal]
	 * @returns {string | number}
	 */
	translate(key, replacements = {}, cardinal = 0) {
		if (key === undefined) {
			console.error('Attempted to translate an undefined phrase key.');
			return '';
		}

		let text = this.phrases[key] || this.defaultPhrases[key] || key;

		if (text !== this.phrases[key] && text === this.defaultPhrases[key]) {
			console.error('Unknown translation key, used default translation:', key);
		} else if (text !== this.phrases[key]) {
			console.error(`Missing translation for phrase "${key}".`);
			text = key;
		}

		if (!['string', 'object'].includes(typeof text)) {
			return text;
		}

		if (typeof text === 'object') {
			const pluralRule = this.getPluralForm(cardinal);
			text = text[pluralRule] || text.other || key;
		}

		return this.replace(text, replacements);
	}

	/**
	 * Replaces `%{name}` tokens in translated text.
	 *
	 * Unknown replacement names are treated as nested phrase keys before
	 * falling back to an empty string.
	 *
	 * @param {string} text
	 * @param {LocalizationReplacementMap} [replacements]
	 * @returns {string}
	 */
	replace(text, replacements = {}) {
		const re = /%{(.*?)}/gs;
		const matches = [...text.matchAll(re)];

		for (let index = matches.length - 1; index >= 0; index -= 1) {
			const match = matches[index];
			let sub;

			if (replacements[match[1]] !== undefined) {
				sub = replacements[match[1]];
			} else {
				sub = this.translate(match[1]);
				sub = sub === match[1] ? '' : sub;
			}

			if (sub === '') {
				console.warn('Unknown substitution', match[1]);
			}

			text = text.slice(0, match.index) + sub + text.slice(match.index + match[0].length);
		}

		return text;
	}

	/**
	 * Flattens nested phrase objects into dot-separated phrase keys.
	 *
	 * Objects that look like plural-rule maps are preserved as phrase values.
	 *
	 * @param {LocalizationPhraseMap} phrases
	 * @returns {LocalizationFlatPhraseMap}
	 */
	flattenPhrases(phrases) {
		/** @type {LocalizationFlatPhraseMap} */
		const flat = {};

		/**
		 * Checks whether an object should be treated as a plural phrase value.
		 *
		 * @type {TranslatorCardinalRuleCheck}
		 */
		function isCardinalRule(object) {
			const cardinalRuleKeys = ['zero', 'one', 'two', 'few', 'many', 'other'];
			const keys = Object.keys(object);
			let missed = 0;
			let hit = 0;
			let nested = false;

			keys.forEach((key) => {
				if (cardinalRuleKeys.includes(key)) {
					hit += 1;
				} else {
					missed += 1;
				}

				nested = nested || typeof object[key] === 'object';
			});

			if (nested) {
				if (hit > 0) {
					console.warn(`Ambiguous translation on object with keys ${JSON.stringify(keys)}, sub object found`);
				}
				return false;
			}

			if (hit === 0) {
				return false;
			}

			if (missed === 0) {
				return true;
			}

			if (hit > 1 || keys.includes('other')) {
				console.warn(`Ambiguous translation on object with keys ${JSON.stringify(keys)}, not all keys are for a cardinal rule`);
				return true;
			}

			return false;
		}

		/**
		 * Recursively copies nested phrase values into the flattened map.
		 *
		 * @param {LocalizationPhraseMap} nextPhrases
		 * @param {string} upperKey
		 * @returns {void}
		 */
		function flattenOne(nextPhrases, upperKey) {
			Object.keys(nextPhrases).forEach((key) => {
				const value = nextPhrases[key];
				const nextKey = upperKey === '' ? key : `${upperKey}.${key}`;

				if (typeof value === 'object' && value !== null && !isCardinalRule(value)) {
					flattenOne(value, nextKey);
				} else {
					flat[nextKey] = value;
				}
			});
		}

		flattenOne(phrases, '');

		return flat;
	}

	/**
	 * Replaces phrases in the current flattened phrase map.
	 *
	 * @param {LocalizationFlatPhraseMap} phrases
	 * @returns {void}
	 */
	replacePhrases(phrases) {
		Object.keys(phrases).forEach((key) => {
			this.phrases[key] = phrases[key];
		});
	}

	/**
	 * Adds nested or flattened phrases to the translator.
	 *
	 * @param {LocalizationPhraseMap} phrases
	 * @returns {void}
	 */
	extend(phrases) {
		this.replacePhrases(this.flattenPhrases(phrases));
	}

	/**
	 * Uses another translator's phrase map as fallback phrases.
	 *
	 * @param {Translator | undefined | null} translator
	 * @returns {void}
	 */
	setDefault(translator) {
		this.defaultPhrases = translator?.phrases || {};
	}
}
