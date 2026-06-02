import Localization from './localization.js';
import phrases from '../phrases/en-US.json';

export function createDefaultLocalize() {
	const localization = new Localization();
	localization.add('en-US-u-ms-ussystem', phrases);

	return {
		getLocale: localization.getLocale.bind(localization),
		listen() {},
		translate: localization.translate.bind(localization),
		translateLocale: localization.translateLocale.bind(localization),
		unlisten() {},
	};
}
