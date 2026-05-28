import { Chord, Note } from 'tonal';

const DEFAULT_OCTAVE = 4;

export function buildKeyboardChordPayload(chordName, options = {}) {
	const input = String(chordName || '').trim();
	const normalizedInput = normalizeChordAliases(input);
	const octave = Number.isInteger(options.octave) ? options.octave : DEFAULT_OCTAVE;
	const chord = Chord.get(normalizedInput);
	const baseChord = getBaseChord(normalizedInput, chord);

	if (!input || chord.empty || !chord.notes.length) {
		return {
			input,
			isValid: false,
			error: input ? 'Chord not recognized' : '',
			payload: null,
		};
	}

	const inversion = getResolvedInversion(options.inversion, chord, baseChord);
	const notes = getInvertedNotes(baseChord.notes, octave, inversion);
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

export function normalizeChordAliases(chordName) {
	const input = String(chordName || '').trim();

	return input
		.replace(
			/^([A-Ga-g](?:#|b)?)(?:o\/|\/o|\u00f8)(7?)(.*)$/u,
			(_match, root, seventh, suffix) => `${root}m7b5${suffix}`,
		)
		.replace(/^([A-Ga-g](?:#|b)?)\s+diminished(\d*)$/iu, '$1dim$2')
		.replace(/^([A-Ga-g](?:#|b)?)\s+augmented(\d*)$/iu, '$1aug$2');
}

export function getChordInversionOptions(chordNoteCount = 0) {
	return Array.from({ length: Math.max(1, chordNoteCount) }, (_, inversion) => ({
		label: getInversionLabel(inversion),
		phrase: getInversionPhrase(inversion),
		value: inversion,
	}));
}

export function getChordSymbolForInversion(chordName, inversion) {
	const input = normalizeChordAliases(chordName);
	const chord = Chord.get(input);
	const baseChord = getBaseChord(input, chord);

	if (chord.empty || baseChord.empty || !baseChord.notes.length) {
		return String(chordName || '');
	}

	const nextInversion = normalizeInversion(inversion, baseChord.notes.length);
	const symbol = baseChord.symbol || String(chordName || '').replace(/\/[A-Ga-g](?:#|b)?$/u, '');

	if (nextInversion === 0) {
		return symbol;
	}

	return `${symbol}/${baseChord.notes[nextInversion]}`;
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

function getBaseChord(chordName, chord) {
	const baseChordName = String(chordName || '').replace(/\/[A-Ga-g](?:#|b)?$/u, '');
	const baseChord = Chord.get(baseChordName);

	return !baseChord.empty && baseChord.notes.length ? baseChord : chord;
}

function getSlashChordInversion(chord, baseChord) {
	if (!chord.bass || !Number.isInteger(chord.rootDegree)) {
		return 0;
	}

	if (baseChord.empty || !baseChord.notes.length) {
		return 0;
	}

	return chord.rootDegree - 1;
}

function getResolvedInversion(inversion, chord, baseChord) {
	const slashInversion = getSlashChordInversion(chord, baseChord);
	const parsedInversion = Number(inversion);

	if (slashInversion > 0 && (!Number.isInteger(parsedInversion) || parsedInversion === 0)) {
		return slashInversion;
	}

	return normalizeInversion(inversion, baseChord.notes.length);
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
