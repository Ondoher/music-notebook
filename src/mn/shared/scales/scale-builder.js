import { Scale } from 'tonal';
import { KEY_OPTIONS, normalizeKey } from '../keys/key-options.js';

const DEFAULT_OCTAVE = 4;

export const SCALE_KEY_OPTIONS = KEY_OPTIONS;

export const SCALE_TYPE_OPTIONS = Object.freeze([
	{ label: 'Major', phrase: 'music.scale.major', value: 'major', scaleType: 'major' },
	{ label: 'Natural minor', phrase: 'music.scale.natural_minor', value: 'minor', scaleType: 'minor' },
	{ label: 'Harmonic minor', phrase: 'music.scale.harmonic_minor', value: 'harmonic-minor', scaleType: 'harmonic minor' },
	{ label: 'Major pentatonic', phrase: 'music.scale.major_pentatonic', value: 'major-pentatonic', scaleType: 'major pentatonic' },
	{ label: 'Minor pentatonic', phrase: 'music.scale.minor_pentatonic', value: 'minor-pentatonic', scaleType: 'minor pentatonic' },
	{ label: 'Mode', phrase: 'music.scale.mode', value: 'mode', scaleType: 'ionian' },
]);

export const MODE_OPTIONS = Object.freeze([
	{ label: 'Ionian', phrase: 'music.mode.ionian', value: 'ionian' },
	{ label: 'Dorian', phrase: 'music.mode.dorian', value: 'dorian' },
	{ label: 'Phrygian', phrase: 'music.mode.phrygian', value: 'phrygian' },
	{ label: 'Lydian', phrase: 'music.mode.lydian', value: 'lydian' },
	{ label: 'Mixolydian', phrase: 'music.mode.mixolydian', value: 'mixolydian' },
	{ label: 'Aeolian', phrase: 'music.mode.aeolian', value: 'aeolian' },
	{ label: 'Locrian', phrase: 'music.mode.locrian', value: 'locrian' },
]);

export function buildKeyboardScalePayload({
	key = 'C',
	mode = 'ionian',
	scaleType = 'major',
} = {}, options = {}) {
	const octave = Number.isInteger(options.octave) ? options.octave : DEFAULT_OCTAVE;
	const normalizedKey = normalizeKey(key, 'C');
	const normalizedScaleType = normalizeOptionValue(
		scaleType,
		SCALE_TYPE_OPTIONS.map((option) => option.value),
		'major',
	);
	const selectedScaleType = SCALE_TYPE_OPTIONS.find((option) => option.value === normalizedScaleType);
	const normalizedMode = normalizeOptionValue(
		mode,
		MODE_OPTIONS.map((option) => option.value),
		'ionian',
	);
	const tonalScaleType = normalizedScaleType === 'mode'
		? normalizedMode
		: selectedScaleType.scaleType;
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
			label: scale.name,
			notes: scale.notes.map((note) => `${note}${octave}`),
			rootNote: `${scale.tonic}${octave}`,
			scaleId: `typed:${scale.name}`,
		},
		scale,
	};
}

function normalizeOptionValue(value, options, fallback) {
	const stringValue = String(value || '').trim();
	return options.includes(stringValue) ? stringValue : fallback;
}
