import Translator from './translator.js';

export default class Localization {
	constructor() {
		this.translators = {};
		this.locale = 'en-US-u-ms-ussystem';
	}

	getLocale() {
		return this.locale;
	}

	getLanguage() {
		return this.locale.split('-u')[0];
	}

	getMonthNames(format = 'long') {
		const locale = this.getLanguage();
		const formatter = new Intl.DateTimeFormat(locale, { month: format, timeZone: 'UTC' });
		const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((month) => {
			const mm = month < 10 ? `0${month}` : month;
			return new Date(`2017-${mm}-01T00:00:00+00:00`);
		});

		return months.map((date) => formatter.format(date));
	}

	getDateSeparator() {
		const locale = this.getLanguage();
		const separators = ['/', '-', '.', '. '];
		const dateStr = new Intl.DateTimeFormat(locale).format(new Date());

		return separators.find((separator) => dateStr.split(separator).length !== 1);
	}

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

	add(locale, phrases) {
		this.translators[locale] = new Translator({ phrases, locale });
		this.translators[locale].setDefault(this.translators['en-US-u-ms-ussystem']);

		if (locale === this.locale) {
			this.translator = this.translators[locale];
		}
	}

	extend(locale, phrases) {
		if (!this.translators[locale]) {
			console.warn('Trying to extend phrases for nonexisting locale:', locale);
			return;
		}

		this.translators[locale].extend(phrases);
		this.fire?.('updated');
	}

	hasLocale(locale) {
		return Boolean(this.translators[locale]);
	}

	switchLocale(locale) {
		if (!this.translators[locale]) {
			console.warn('Attempt to switch to nonexistent locale', locale);
			return;
		}

		this.translator = this.translators[locale];
		this.locale = locale;
		this.fire?.('changeLocale', locale);
	}

	t(key, replacements, cardinal) {
		if (!this.translator) {
			console.error('No current translator');
			return '';
		}

		return this.translator.t(key, replacements, cardinal);
	}

	t_locale(locale, key, replacements, cardinal) {
		if (!this.translators[locale]) {
			console.warn('Attempt to switch to nonexistent locale', locale);
			return '';
		}

		return this.translators[locale].t(key, replacements, cardinal);
	}

	getLocales() {
		return Object.keys(this.translators);
	}

	getPhrase(key) {
		const translator = this.translators[this.getLocale()];
		return translator.getPhrase(key);
	}

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

	replacePhrases(phrases) {
		if (!this.translator) {
			console.error('No current translator');
			return;
		}

		this.translator.replacePhrases(phrases);
		this.fire?.('updated');
	}
}
