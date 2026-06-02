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
