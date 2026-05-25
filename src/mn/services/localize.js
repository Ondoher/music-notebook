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
			't',
			't_locale',
			'findKeys',
			'getPhrase',
			'replacePhrases',
		]);
	}

	start() {
		this.localization = new Localization();
		this.localization.fire = this.fire.bind(this);
		this.localization.add('en-US-u-ms-ussystem', phrases);
	}

	ready() {}

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

	t(key, replacements, cardinal) {
		return this.localization.t(key, replacements, cardinal);
	}

	t_locale(locale, key, replacements, cardinal) {
		return this.localization.t_locale(locale, key, replacements, cardinal);
	}
}

new LocalizeService();
