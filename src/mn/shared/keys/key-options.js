import { Note } from 'tonal';

export const KEY_OPTIONS = Object.freeze([
	'C',
	'Db',
	'D',
	'Eb',
	'E',
	'F',
	'F#',
	'G',
	'Ab',
	'A',
	'Bb',
	'B',
]);

export function normalizeKey(value, fallback = 'C') {
	const input = String(value || '').trim();
	const note = Note.get(input);

	if (note.empty || note.oct !== undefined) {
		return fallback;
	}

	return note.pc;
}
