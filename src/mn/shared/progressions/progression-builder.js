import { Chord, Note, RomanNumeral } from 'tonal';
import { buildKeyboardChordPayload } from '../chords/chord-builder.js';
import { KEY_OPTIONS, normalizeKey } from '../keys/key-options.js';

const DEFAULT_ROMAN_NUMERAL = 'I';

export const PROGRESSION_KEY_OPTIONS = KEY_OPTIONS;

export function buildKeyboardProgressionPayload({
	key = 'C',
	romanNumeral = DEFAULT_ROMAN_NUMERAL,
} = {}, options = {}) {
	const normalizedKey = normalizeKey(key, 'C');
	const input = String(romanNumeral || '').trim();
	const roman = RomanNumeral.get(input);

	if (!input || roman.empty) {
		return {
			chordSymbol: '',
			error: input ? 'Roman numeral not recognized' : '',
			input,
			isValid: false,
			payload: null,
			roman,
		};
	}

	const chordSymbol = getChordSymbol(normalizedKey, roman);
	const chord = Chord.get(chordSymbol);
	const inversion = Number.isInteger(options.inversion)
		? options.inversion
		: getProgressionInversion(roman);

	if (chord.empty || !chord.notes.length) {
		return {
			chordSymbol,
			error: 'Roman numeral not recognized',
			input,
			isValid: false,
			payload: null,
			roman,
		};
	}

	const chordResult = buildKeyboardChordPayload(chordSymbol, {
		...options,
		inversion,
	});

	return {
		chord,
		chordSymbol,
		error: '',
		input,
		isValid: true,
		payload: {
			...chordResult.payload,
			label: `${normalizedKey}: ${roman.name}`,
			progressionId: `typed:${normalizedKey}:${roman.name}`,
			sourceChordSymbol: chordSymbol,
		},
		roman,
	};
}

function getChordSymbol(key, roman) {
	const root = Note.transpose(key, roman.interval);
	const suffix = getChordSuffix(roman);

	return `${root}${suffix}`;
}

function getChordSuffix(roman) {
	const chordType = String(roman.chordType || '');

	if (chordType === '6' || chordType === '64') {
		return roman.major ? '' : 'm';
	}

	if (chordType === '65' || chordType === '43' || chordType === '42') {
		return roman.major ? '7' : 'm7';
	}

	if (chordType === 'o' || chordType === '\u00b0') {
		return 'dim';
	}

	if (chordType === 'o7' || chordType === '\u00b07') {
		return 'dim7';
	}

	if (chordType === '\u00f8' || chordType === '\u00f87') {
		return 'm7b5';
	}

	if (chordType === '+') {
		return 'aug';
	}

	if (chordType === 'aug') {
		return 'aug';
	}

	if (chordType === '7') {
		return roman.major ? '7' : 'm7';
	}

	if (chordType === '9' || chordType === '11' || chordType === '13') {
		return roman.major ? chordType : `m${chordType}`;
	}

	if (chordType === 'maj7' || chordType === 'M7' || chordType === '^7') {
		return roman.major ? chordType : 'mM7';
	}

	if (chordType === 'm') {
		return 'm';
	}

	if (chordType.startsWith('sus') || chordType.startsWith('add')) {
		return roman.major ? chordType : `m${chordType}`;
	}

	if (chordType) {
		const chordSymbol = `${Note.transpose('C', roman.interval)}${chordType}`;

		if (!Chord.get(chordSymbol).empty) {
			return chordType;
		}
	}

	return roman.major ? '' : 'm';
}

function getProgressionInversion(roman) {
	switch (roman.chordType) {
		case '6':
		case '65':
			return 1;
		case '64':
		case '43':
			return 2;
		case '42':
			return 3;
		default:
			return 0;
	}
}
