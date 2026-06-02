import { Scale } from 'tonal';
import { getScaleTypeForKeyQuality, normalizeKeyQuality } from './key-qualities.js';
import { KEY_OPTIONS, normalizeKey } from './key-options.js';
import { normalizeAscendingNotes } from './music-notes.js';

const DEFAULT_OCTAVE = 4;

export const SCALE_KEY_OPTIONS = KEY_OPTIONS;

export const SCALE_TYPE_OPTIONS = Object.freeze([
	{ label: 'Major', phrase: 'music.scale.major', value: 'major', scaleType: 'major' },
	{ label: 'Natural minor', phrase: 'music.scale.natural_minor', value: 'minor', scaleType: 'minor' },
	{ label: 'Harmonic minor', phrase: 'music.scale.harmonic_minor', value: 'harmonic-minor', scaleType: 'harmonic minor' },
	{ label: 'Major pentatonic', phrase: 'music.scale.major_pentatonic', value: 'major-pentatonic', scaleType: 'major pentatonic' },
	{ label: 'Minor pentatonic', phrase: 'music.scale.minor_pentatonic', value: 'minor-pentatonic', scaleType: 'minor pentatonic' },
	{ label: 'Major blues', phrase: 'music.scale.major_blues', value: 'major-blues', scaleType: 'major blues' },
	{ label: 'Minor blues', phrase: 'music.scale.minor_blues', value: 'minor-blues', scaleType: 'minor blues' },
]);

export function buildKeyboardScalePayload({
	key = 'C',
	keyMode = 'major',
	scaleType = null,
} = {}, options = {}) {
	const octave = Number.isInteger(options.octave) ? options.octave : DEFAULT_OCTAVE;
	const normalizedKey = normalizeKey(key, 'C');
	const normalizedKeyMode = normalizeKeyQuality(keyMode);
	const selectedScaleType = SCALE_TYPE_OPTIONS.find((option) => option.value === scaleType);
	const tonalScaleType = selectedScaleType?.scaleType || getScaleTypeForKeyQuality(normalizedKeyMode);
	const scaleName = `${normalizedKey} ${tonalScaleType}`;
	const scale = Scale.get(scaleName);

	if (scale.empty || !scale.notes.length) {
		return {
			error: 'Scale not recognized',
			isValid: false,
			payload: null,
			scale,
		};
	}

	return {
		error: '',
		isValid: true,
		payload: {
			displayKey: normalizedKey,
			displayKeyMode: normalizedKeyMode,
			label: scale.name,
			notes: normalizeAscendingNotes([...scale.notes, scale.tonic], octave),
			rootNote: `${scale.tonic}${octave}`,
			scaleId: `typed:${scale.name}`,
		},
		scale,
	};
}
