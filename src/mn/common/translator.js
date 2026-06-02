export default class Translator {
	constructor(options = {}) {
		const phrases = options.phrases || {};

		this.phrases = JSON.parse(JSON.stringify(phrases));
		this.locale = options.locale || 'en-US-u-ms-ussystem';
		this.language = this.locale.split('-u-')[0];
		this.defaultPhrases = {};
	}

	getAll() {
		return this.phrases;
	}

	getLocale() {
		return this.locale;
	}

	getLanguage() {
		return this.language;
	}

	getPhrase(key) {
		return this.phrases[key];
	}

	getPluralForm(number) {
		return new Intl.PluralRules(this.locale).select(number);
	}

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

	flattenPhrases(phrases) {
		const flat = {};

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

	replacePhrases(phrases) {
		Object.keys(phrases).forEach((key) => {
			this.phrases[key] = phrases[key];
		});
	}

	extend(phrases) {
		this.replacePhrases(this.flattenPhrases(phrases));
	}

	setDefault(translator) {
		this.defaultPhrases = translator?.phrases || {};
	}
}
