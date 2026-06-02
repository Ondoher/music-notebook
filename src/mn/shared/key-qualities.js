export const KEY_QUALITY_OPTIONS = Object.freeze([
	{ fallback: 'Major', label: 'music.key_mode.major', value: 'major', scaleType: 'major' },
	{ fallback: 'Minor', label: 'music.key_mode.minor', value: 'minor', scaleType: 'minor' },
	{ fallback: 'Harmonic minor', label: 'music.scale.harmonic_minor', value: 'harmonic-minor', scaleType: 'harmonic minor' },
	{ fallback: 'Major pentatonic', label: 'music.scale.major_pentatonic', value: 'major-pentatonic', scaleType: 'major pentatonic' },
	{ fallback: 'Minor pentatonic', label: 'music.scale.minor_pentatonic', value: 'minor-pentatonic', scaleType: 'minor pentatonic' },
	{ fallback: 'Major blues', label: 'music.scale.major_blues', value: 'major-blues', scaleType: 'major blues' },
	{ fallback: 'Minor blues', label: 'music.scale.minor_blues', value: 'minor-blues', scaleType: 'minor blues' },
	{ fallback: 'Ionian', label: 'music.mode.ionian', value: 'ionian', scaleType: 'ionian', dividerBefore: true },
	{ fallback: 'Dorian', label: 'music.mode.dorian', value: 'dorian', scaleType: 'dorian' },
	{ fallback: 'Phrygian', label: 'music.mode.phrygian', value: 'phrygian', scaleType: 'phrygian' },
	{ fallback: 'Lydian', label: 'music.mode.lydian', value: 'lydian', scaleType: 'lydian' },
	{ fallback: 'Mixolydian', label: 'music.mode.mixolydian', value: 'mixolydian', scaleType: 'mixolydian' },
	{ fallback: 'Aeolian', label: 'music.mode.aeolian', value: 'aeolian', scaleType: 'aeolian' },
	{ fallback: 'Locrian', label: 'music.mode.locrian', value: 'locrian', scaleType: 'locrian' },
]);

export const KEY_QUALITY_VALUES = Object.freeze(KEY_QUALITY_OPTIONS.map((option) => option.value));
export const MINOR_KEY_QUALITIES = Object.freeze(['minor', 'harmonic-minor', 'minor-pentatonic', 'minor-blues', 'aeolian']);
export const MODAL_KEY_QUALITIES = Object.freeze(['ionian', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'aeolian', 'locrian']);

export function normalizeKeyQuality(value, fallback = 'major') {
	const stringValue = String(value || '').trim();

	return KEY_QUALITY_VALUES.includes(stringValue) ? stringValue : fallback;
}

export function getScaleTypeForKeyQuality(value) {
	const quality = normalizeKeyQuality(value);
	const option = KEY_QUALITY_OPTIONS.find((candidate) => candidate.value === quality);

	return option?.scaleType || 'major';
}

export function isMinorKeyQuality(value) {
	return MINOR_KEY_QUALITIES.includes(normalizeKeyQuality(value));
}

export function isModalKeyQuality(value) {
	return MODAL_KEY_QUALITIES.includes(normalizeKeyQuality(value));
}
