/// <reference path="./types.d.ts" />

/**
 * Resolves a phrase-like value to plain localized text.
 *
 * Use this helper where a component needs a string for a label, helper text,
 * or accessibility attribute instead of a rendered `LocaleString` element.
 *
 * @param {LocalizeService | null | undefined} localize - Localization service used to resolve phrase keys.
 * @param {LocalizedTextResolverValue} value - Phrase key, phrase object, or empty value.
 * @param {string} [fallback=''] - Text returned when the value or translation is unavailable.
 * @returns {string}
 */
export function getLocalizedText(localize, value, fallback = '') {
	if (value === undefined || value === null || value === false) {
		return fallback;
	}

	if (typeof value === 'object') {
		const {
			cardinal,
			fallback: objectFallback = fallback,
			phrase,
			replacements,
		} = value;

		if (!phrase) {
			return objectFallback;
		}

		return localize?.translate?.(phrase, replacements, cardinal) || objectFallback || phrase;
	}

	const phrase = String(value);

	if (!phrase) {
		return fallback;
	}

	return localize?.translate?.(phrase) || fallback || phrase;
}
