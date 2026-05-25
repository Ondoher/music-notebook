import { Chord, Note } from 'tonal';

const DEFAULT_OCTAVE = 4;

export function buildKeyboardChordPayload(chordName, options = {}) {
	const input = String(chordName || '').trim();
	const octave = Number.isInteger(options.octave) ? options.octave : DEFAULT_OCTAVE;
	const chord = Chord.get(input);

	if (!input || chord.empty || !chord.notes.length) {
		return {
			input,
			isValid: false,
			error: input ? 'Chord not recognized' : '',
			payload: null,
		};
	}

	const inversion = normalizeInversion(options.inversion, chord.notes.length);
	const notes = getInvertedNotes(chord.notes, octave, inversion);
	const rootNote = getRootNote(notes, chord.tonic);

	return {
		input,
		inversion,
		isValid: true,
		error: '',
		chord,
		payload: {
			...(options.arpeggiate === true ? { arpeggiate: true } : {}),
			chordId: `typed:${chord.symbol}:inv${inversion}`,
			inversion,
			label: chord.symbol || input,
			notes,
			rootNote,
		},
	};
}

export function getChordInversionOptions(chordNoteCount = 0) {
	return Array.from({ length: Math.max(1, chordNoteCount) }, (_, inversion) => ({
		label: getInversionLabel(inversion),
		phrase: getInversionPhrase(inversion),
		value: inversion,
	}));
}

function getInvertedNotes(notes, octave, inversion) {
	let previousMidi = null;

	return rotate(notes, inversion)
		.map((note) => {
			let noteOctave = octave;
			let midi = Note.midi(`${note}${noteOctave}`);

			while (midi !== null && previousMidi !== null && midi <= previousMidi) {
				noteOctave += 1;
				midi = Note.midi(`${note}${noteOctave}`);
			}

			previousMidi = midi;

			return `${note}${noteOctave}`;
		});
}

function getRootNote(notes, tonic) {
	if (!tonic) {
		return notes[0];
	}

	const tonicUpper = tonic.toUpperCase();

	return notes.find((note) => String(note).toUpperCase().startsWith(tonicUpper)) || notes[0];
}

function normalizeInversion(inversion, noteCount) {
	const parsedInversion = Number(inversion);
	const maxInversion = Math.max(0, noteCount - 1);

	if (!Number.isInteger(parsedInversion)) {
		return 0;
	}

	return Math.min(Math.max(parsedInversion, 0), maxInversion);
}

function rotate(values, count) {
	return [...values.slice(count), ...values.slice(0, count)];
}

function getInversionLabel(inversion) {
	switch (inversion) {
		case 0:
			return 'Root position';
		case 1:
			return 'First inversion';
		case 2:
			return 'Second inversion';
		case 3:
			return 'Third inversion';
		default:
			return `${inversion}th inversion`;
	}
}

function getInversionPhrase(inversion) {
	switch (inversion) {
		case 0:
			return 'music.inversion.root_position';
		case 1:
			return 'music.inversion.first';
		case 2:
			return 'music.inversion.second';
		case 3:
			return 'music.inversion.third';
		default:
			return 'music.inversion.nth';
	}
}
