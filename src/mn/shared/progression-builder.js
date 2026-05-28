import { Chord, Note, RomanNumeral } from 'tonal';
import { buildKeyboardChordPayload } from './chord-builder.js';
import { KEY_OPTIONS, normalizeKey } from './key-options.js';

const DEFAULT_ROMAN_NUMERAL = 'I';
const DEFAULT_KEY_MODE = 'major';
const MAJOR_NUMERIC_DEGREES = Object.freeze({
	1: 'I',
	2: 'ii',
	3: 'iii',
	4: 'IV',
	5: 'V',
	6: 'vi',
	7: 'vii\u00b0',
});
const MINOR_NUMERIC_DEGREES = Object.freeze({
	1: 'i',
	2: 'ii\u00b0',
	3: 'III',
	4: 'iv',
	5: 'v',
	6: 'VI',
	7: 'VII',
});

export const PROGRESSION_KEY_OPTIONS = KEY_OPTIONS;

export function buildKeyboardProgressionPayload({
	key = 'C',
	keyMode = DEFAULT_KEY_MODE,
	romanNumeral = DEFAULT_ROMAN_NUMERAL,
} = {}, options = {}) {
	const normalizedKey = normalizeKey(key, 'C');
	const normalizedKeyMode = normalizeKeyMode(keyMode);
	const input = String(romanNumeral || '').trim();
	const normalizedInput = normalizeRomanNumeralAliases(input);
	const effectiveRomanNumeral = getEffectiveRomanNumeral(normalizedInput, normalizedKeyMode);
	const roman = RomanNumeral.get(effectiveRomanNumeral);

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
		effectiveRomanNumeral,
		input,
		isValid: true,
		keyMode: normalizedKeyMode,
		payload: {
			...chordResult.payload,
			displayKeyMode: normalizedKeyMode,
			label: `${normalizedKey}: ${roman.name}`,
			progressionInput: input,
			progressionId: `typed:${normalizedKey}:${roman.name}`,
			sourceChordSymbol: chordSymbol,
		},
		roman,
	};
}

export function normalizeRomanNumeralAliases(romanNumeral) {
	return String(romanNumeral || '')
		.replace(/(\/o|o\/)/giu, '\u00f8')
		.replace(/^(\s*[ivIV]+)\s*(?:dim|diminished)(\d*)\s*$/iu, '$1\u00b0$2')
		.replace(/^(\s*[ivIV]+)\s*(?:aug|augmented)(\d*)\s*$/iu, '$1+$2');
}

function getEffectiveRomanNumeral(input, keyMode) {
	const numericDegree = getNumericDegree(input);

	if (!numericDegree) {
		return input;
	}

	return keyMode === 'minor'
		? MINOR_NUMERIC_DEGREES[numericDegree]
		: MAJOR_NUMERIC_DEGREES[numericDegree];
}

function getNumericDegree(input) {
	const match = /^([1-7])$/.exec(String(input || '').trim());
	return match ? Number(match[1]) : null;
}

function normalizeKeyMode(keyMode) {
	return keyMode === 'minor' ? 'minor' : DEFAULT_KEY_MODE;
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
