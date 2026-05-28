export const ACCIDENTAL_SYMBOLS = Object.freeze({
	sharp: '\u266f',
	flat: '\u266d',
	natural: '\u266e',
	doubleSharp: '\ud834\udd2a',
	doubleFlat: '\ud834\udd2b',
});

export const PITCH_OFFSETS = Object.freeze({
	C: 0,
	D: 2,
	E: 4,
	F: 5,
	G: 7,
	A: 9,
	B: 11,
});

export const NATURAL_PITCH_CLASSES = Object.freeze([0, 2, 4, 5, 7, 9, 11]);

export const MAJOR_KEY_FIFTHS = Object.freeze({
	C: 0,
	G: 1,
	D: 2,
	A: 3,
	E: 4,
	B: 5,
	'F#': 6,
	'C#': 7,
	F: -1,
	Bb: -2,
	Eb: -3,
	Ab: -4,
	Db: -5,
	Gb: -6,
	Cb: -7,
});

export const MINOR_KEY_FIFTHS = Object.freeze({
	A: 0,
	E: 1,
	B: 2,
	'F#': 3,
	'C#': 4,
	'G#': 5,
	'D#': 6,
	'A#': 7,
	D: -1,
	G: -2,
	C: -3,
	F: -4,
	Bb: -5,
	Eb: -6,
	Ab: -7,
});

export const MODE_PARENT_MAJOR_OFFSETS = Object.freeze({
	ionian: 0,
	dorian: -2,
	phrygian: -4,
	lydian: -5,
	mixolydian: -7,
	aeolian: -9,
	locrian: -11,
});

export const MODE_PARENT_NOTE_INDEX = Object.freeze({
	ionian: 0,
	dorian: 6,
	phrygian: 5,
	lydian: 4,
	mixolydian: 3,
	aeolian: 2,
	locrian: 1,
});
