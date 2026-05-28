export const KEYBOARD_CHORD_PRESETS = Object.freeze([
	Object.freeze({
		chordId: 'c-dim7',
		label: 'Cdim7',
		notes: Object.freeze(['C4', 'Eb4', 'Gb4', 'Bbb4']),
	}),
	Object.freeze({
		chordId: 'c-major',
		label: 'C',
		notes: Object.freeze(['C4', 'E4', 'G4']),
	}),
	Object.freeze({
		chordId: 'd-major',
		label: 'D major',
		notes: Object.freeze(['D4', 'F#4', 'A4']),
	}),
	Object.freeze({
		chordId: 'f-major-first-inversion',
		label: 'F major first inversion',
		notes: Object.freeze(['A3', 'C4', 'F4']),
	}),
]);

export function getKeyboardChordPreset(chordId) {
	return KEYBOARD_CHORD_PRESETS.find((preset) => preset.chordId === chordId) || KEYBOARD_CHORD_PRESETS[0];
}
