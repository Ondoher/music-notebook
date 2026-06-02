import { Note } from 'tonal';
import {
	ACCIDENTAL_SYMBOLS,
	PITCH_OFFSETS,
} from './const.js';

const DEFAULT_OCTAVE = 4;

/**
 * Converts a note name to a MIDI number.
 *
 * @param {string} note
 * @returns {number | null}
 */
export function noteToMidi(note) {
	const parsedMidiNumber = parseNoteToMidi(note);

	if (parsedMidiNumber !== null) {
		return parsedMidiNumber;
	}

	const midiNumber = Note.midi(String(note || ''));
	return Number.isFinite(midiNumber) ? midiNumber : null;
}

/**
 * Gets the explicit octave from a note name.
 *
 * @param {string} note
 * @returns {number | null}
 */
export function getNoteOctave(note) {
	const match = /^[A-Ga-g](?:#{1,2}|b{1,2}|x|n|\u266f|\u266d|\u266e|\ud834\udd2a|\ud834\udd2b)?(-?\d+)$/u.exec(String(note || ''));

	if (!match) {
		return null;
	}

	const octave = Number(match[1]);
	return Number.isInteger(octave) ? octave : null;
}

/**
 * Normalizes one note into a canonical pitch + octave string.
 *
 * @param {string} note
 * @param {number} [fallbackOctave=4]
 * @returns {string}
 */
export function normalizeNoteName(note, fallbackOctave = DEFAULT_OCTAVE) {
	const pitch = getNotePitch(note);

	if (!pitch) {
		return String(note || '');
	}

	return `${pitch}${getNoteAccidental(note)}${getNoteOctave(note) ?? normalizeOctave(fallbackOctave)}`;
}

/**
 * Normalizes notes so the sequence ascends from the first note's octave.
 *
 * @param {string[]} notes
 * @param {number} [rootOctave=4]
 * @returns {string[]}
 */
export function normalizeAscendingNotes(notes = [], rootOctave = DEFAULT_OCTAVE) {
	let currentOctave = normalizeOctave(rootOctave);
	let previousMidi = null;

	return notes.map((note) => {
		let renderedNote = normalizeNoteName(note, currentOctave);
		let midi = noteToMidi(renderedNote);

		while (previousMidi !== null && midi !== null && midi <= previousMidi) {
			currentOctave += 1;
			renderedNote = normalizeNoteName(withoutNoteOctave(note), currentOctave);
			midi = noteToMidi(renderedNote);
		}

		previousMidi = midi ?? previousMidi;
		return renderedNote;
	});
}

export function getNotePitch(note) {
	const match = /^([A-Ga-g])/.exec(String(note || ''));
	return match ? match[1].toUpperCase() : '';
}

export function getNoteAccidental(note) {
	const match = /^[A-Ga-g](#{1,2}|b{1,2}|x|n|\u266f|\u266d|\u266e|\ud834\udd2a|\ud834\udd2b)?/u.exec(String(note || ''));
	return match?.[1] || '';
}

function withoutNoteOctave(note) {
	return String(note || '').replace(/(-?\d+)$/u, '');
}

function normalizeOctave(octave) {
	const value = Number(octave);
	return Number.isInteger(value) ? value : DEFAULT_OCTAVE;
}

function parseNoteToMidi(note) {
	const match = /^([A-Ga-g])(#{1,2}|b{1,2}|x|n|\u266f|\u266d|\u266e|\ud834\udd2a|\ud834\udd2b)?(-?\d+)$/u.exec(String(note || ''));

	if (!match) {
		return null;
	}

	const pitch = match[1].toUpperCase();
	const accidental = match[2] || '';
	const octave = Number(match[3]);
	const pitchOffset = PITCH_OFFSETS[pitch];

	if (!Number.isInteger(octave) || pitchOffset === undefined) {
		return null;
	}

	return 12 + pitchOffset + getAccidentalOffset(accidental) + (12 * octave);
}

function getAccidentalOffset(accidental) {
	switch (accidental) {
		case '#':
		case ACCIDENTAL_SYMBOLS.sharp:
			return 1;
		case '##':
		case 'x':
		case ACCIDENTAL_SYMBOLS.doubleSharp:
			return 2;
		case 'b':
		case ACCIDENTAL_SYMBOLS.flat:
			return -1;
		case 'bb':
		case ACCIDENTAL_SYMBOLS.doubleFlat:
			return -2;
		default:
			return 0;
	}
}
