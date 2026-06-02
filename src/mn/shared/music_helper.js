import {
	ACCIDENTAL_SYMBOLS,
	MAJOR_KEY_FIFTHS,
	MINOR_KEY_FIFTHS,
	MODE_PARENT_MAJOR_OFFSETS,
	MODE_PARENT_NOTE_INDEX,
	PITCH_OFFSETS,
} from './const.js';
import { isMinorKeyQuality, isModalKeyQuality, normalizeKeyQuality } from './key-qualities.js';
import {
	getNoteAccidental,
	getNoteOctave,
	getNotePitch,
	normalizeNoteName,
	noteToMidi,
} from './music-notes.js';

/**
 * Builds a one-measure MusicXML document for the supplied staff notes.
 *
 * @param {KeyboardPayload} payload
 * @param {StaffNote[]} staffNotes
 * @returns {string}
 */
export function buildMusicXml(payload, staffNotes) {
	const sequentialNotes = !isChordPayload(payload) || payload.arpeggiate === true;
	const clef = getStaffClef(staffNotes);
	const octaveSign = getOctaveSign(staffNotes, clef);
	const renderedNotes = octaveSign
		? staffNotes.map((note) => shiftStaffNoteOctave(note, octaveSign.octaveOffset))
		: staffNotes;
	const keyFifths = getPayloadKeyFifths(payload);
	const notesXml = renderedNotes.length
		? renderedNotes.map((note, index) => buildMusicXmlNote(note, {
			keyFifths,
			isChordTone: !sequentialNotes && index > 0,
			sequentialNotes,
		})).join('\n')
		: buildMusicXmlHiddenRest();
	const octaveSignXml = buildOctaveSignDirection(octaveSign);

	return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <part-list>
    <score-part id="P1">
      <part-name>Music object</part-name>
    </score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>1</divisions>
        <key>
          <fifths>${keyFifths}</fifths>
        </key>
        <clef>
          <sign>${clef === 'bass' ? 'F' : 'G'}</sign>
          <line>${clef === 'bass' ? '4' : '2'}</line>
        </clef>
      </attributes>
      ${octaveSignXml}
      ${notesXml}
    </measure>
  </part>
</score-partwise>`;
}

/**
 * Resolves note names into staff-note objects.
 *
 * @param {string[]} [notes]
 * @param {number} [staffOctave]
 * @param {Partial<KeyboardPayload>} [payload]
 * @returns {StaffNote[]}
 */
export function getStaffNotes(notes = [], staffOctave = 4, payload = {}) {
	const octave = normalizeStaffOctave(staffOctave);
	const staffKeyLabels = getStaffKeyLabelsByPitchClass(payload);

	return notes
		.map((note) => {
			const renderedNote = normalizeNoteName(note, octave);
			const renderedOctave = getNoteOctave(renderedNote) ?? octave;
			const originalMidiNumber = noteToMidi(renderedNote);
			const staffRenderedNote = getStaffRenderedNote(originalMidiNumber, staffKeyLabels, renderedOctave) || renderedNote;
			const midiNumber = noteToMidi(staffRenderedNote);
			const noteParts = getMusicXmlNoteParts(staffRenderedNote);

			return midiNumber === null || !noteParts ? null : {
				...noteParts,
				midiNumber,
				note: staffRenderedNote,
			};
		})
		.filter(Boolean);
}

/**
 * Gets the MusicXML fifths value for the payload key.
 *
 * @param {Partial<KeyboardPayload>} payload
 * @returns {number}
 */
export function getPayloadKeyFifths(payload) {
	const signature = getEffectiveStaffKeySignature(payload);

	if (!signature.key) {
		return 0;
	}

	return signature.table[signature.key] ?? 0;
}

/**
 * Gets the effective key used for keyboard note labels.
 *
 * @param {Partial<KeyboardPayload>} payload
 * @returns {string}
 */
export function getEffectivePayloadKey(payload) {
	return getEffectiveKeyName(getPayloadKey(payload), payload);
}

/**
 * Applies the payload enharmonic preference to a key name.
 *
 * @param {string} key
 * @param {Partial<KeyboardPayload>} payload
 * @returns {string}
 */
export function getEffectiveKeyName(key, payload) {
	const normalizedKey = normalizeKeyName(key);
	const enharmonicKey = getEnharmonicKeyOption(normalizedKey);

	return enharmonicKey && isUsingEnharmonicKey(payload) ? enharmonicKey : normalizedKey;
}

/**
 * Gets the enharmonic key option for an unsupported key spelling.
 *
 * @param {string} key
 * @returns {string}
 */
export function getEnharmonicKeyOption(key) {
	const normalizedKey = normalizeKeyName(key);

	if (!normalizedKey || MAJOR_KEY_FIFTHS[normalizedKey] !== undefined) {
		return '';
	}

	return getEnharmonicKeyInSignatureTable(normalizedKey, MAJOR_KEY_FIFTHS);
}

/**
 * Gets the most useful key value from a payload.
 *
 * @param {Partial<KeyboardPayload>} payload
 * @returns {string}
 */
export function getPayloadKey(payload) {
	if (payload.displayKey) {
		return normalizeKeyName(payload.displayKey);
	}

	if (payload.progressionId) {
		const match = /^typed:([^:]+)/.exec(payload.progressionId);
		return normalizeKeyName(match?.[1]);
	}

	if (payload.scaleId) {
		const match = /^typed:([A-Ga-g](?:#|b)?)/.exec(payload.scaleId);
		return normalizeKeyName(match?.[1]);
	}

	const root = payload.rootNote || payload.notes?.[0] || payload.label;
	const match = /^([A-Ga-g](?:#|b)?)/.exec(String(root || ''));
	return normalizeKeyName(match?.[1]);
}

/**
 * Checks whether the payload should use an enharmonic key spelling.
 *
 * @param {Partial<KeyboardPayload>} payload
 * @returns {boolean}
 */
export function isUsingEnharmonicKey(payload) {
	return payload.useEnharmonicKey !== false;
}

/**
 * Normalizes key names to leading uppercase spelling.
 *
 * @param {string} key
 * @returns {string}
 */
export function normalizeKeyName(key) {
	if (!key) {
		return '';
	}

	return `${key.charAt(0).toUpperCase()}${key.slice(1)}`;
}

/**
 * Normalizes a staff octave field value into the supported range.
 *
 * @param {string | number} staffOctave
 * @returns {number}
 */
export function normalizeStaffOctave(staffOctave) {
	const octave = Number(staffOctave);

	if (!Number.isInteger(octave)) {
		return 4;
	}

	return Math.min(Math.max(octave, 0), 8);
}

/**
 * Builds major-key note labels by pitch class.
 *
 * @param {string} [displayKey]
 * @returns {Map<number, string>}
 */
export function getMajorKeyLabelsByPitchClass(displayKey = '') {
	const key = normalizeKeyName(displayKey);
	const tonicMidi = noteToMidi(`${key}4`);
	const labelsByPitchClass = new Map();

	if (tonicMidi === null) {
		return labelsByPitchClass;
	}

	const letters = getMajorScaleLetters(key.charAt(0));
	const intervals = [0, 2, 4, 5, 7, 9, 11];

	letters.forEach((letter, index) => {
		const pitchClass = ((tonicMidi + intervals[index]) % 12 + 12) % 12;
		const naturalPitchClass = PITCH_OFFSETS[letter];
		const accidentalOffset = normalizeAccidentalOffset(pitchClass - naturalPitchClass);

		labelsByPitchClass.set(pitchClass, `${letter}${getAccidentalText(accidentalOffset)}`);
	});

	return labelsByPitchClass;
}

/**
 * Converts a note name to a MIDI number.
 *
 * @param {string} note
 * @returns {number | null}
 */
export { noteToMidi };

function buildMusicXmlNote(note, { isChordTone, keyFifths, sequentialNotes }) {
	const noteType = sequentialNotes ? 'quarter' : 'whole';
	const duration = sequentialNotes ? 1 : 4;
	const alterXml = note.alter ? `\n        <alter>${note.alter}</alter>` : '';
	const accidentalXml = note.accidentalName && note.alter !== getKeySignatureAlter(note.step, keyFifths)
		? `\n      <accidental>${note.accidentalName}</accidental>`
		: '';
	const chordXml = isChordTone ? '\n      <chord/>' : '';

	return `      <note>${chordXml}
      <pitch>
        <step>${note.step}</step>${alterXml}
        <octave>${note.octave}</octave>
      </pitch>
      <duration>${duration}</duration>
      <type>${noteType}</type>${accidentalXml}
    </note>`;
}

function buildMusicXmlHiddenRest() {
	return `      <note print-object="no">
      <rest measure="yes"/>
      <duration>4</duration>
      <type>whole</type>
    </note>`;
}

function buildOctaveSignDirection(octaveSign) {
	if (!octaveSign) {
		return '';
	}

	return `<direction placement="${octaveSign.placement}">
        <direction-type>
          <words>${octaveSign.label}</words>
        </direction-type>
      </direction>`;
}

function shiftStaffNoteOctave(note, octaveOffset) {
	return {
		...note,
		midiNumber: note.midiNumber + (octaveOffset * 12),
		note: `${note.step}${getAccidentalText(note.alter || 0)}${note.octave + octaveOffset}`,
		octave: note.octave + octaveOffset,
	};
}

function isChordPayload(payload) {
	return (payload.notes?.length || 0) > 1
		&& (
			Boolean(payload.chordId || payload.progressionId || payload.sourceChordSymbol)
			|| !payload.scaleId
		);
}

function getStaffRenderedNote(midiNumber, labelsByPitchClass, fallbackOctave) {
	if (midiNumber === null || !labelsByPitchClass.size) {
		return '';
	}

	const pitchClass = ((midiNumber % 12) + 12) % 12;
	const label = labelsByPitchClass.get(pitchClass);

	if (!label) {
		return '';
	}

	return `${label}${normalizeStaffOctave(fallbackOctave)}`;
}

function getStaffKeyLabelsByPitchClass(payload) {
	const signature = getEffectiveStaffKeySignature(payload);

	if (!signature.usesEnharmonicKey || !signature.key) {
		return new Map();
	}

	return signature.table === MINOR_KEY_FIFTHS
		? getMinorKeyLabelsByPitchClass(signature.key)
		: getMajorKeyLabelsByPitchClass(signature.key);
}

function getStaffClef(notes = []) {
	if (!notes.length) {
		return 'treble';
	}

	const averageMidi = notes.reduce((sum, note) => sum + note.midiNumber, 0) / notes.length;
	return averageMidi < noteToMidi('C4') ? 'bass' : 'treble';
}

function getOctaveSign(notes = [], clef = 'treble') {
	if (!notes.length) {
		return null;
	}

	const highThreshold = clef === 'bass' ? noteToMidi('C4') : noteToMidi('G5');
	const lowThreshold = clef === 'bass' ? noteToMidi('E2') : noteToMidi('D4');
	const lowestMidi = Math.min(...notes.map((note) => note.midiNumber));
	const highestMidi = Math.max(...notes.map((note) => note.midiNumber));

	if (lowestMidi > highThreshold) {
		const octaveCount = getOctaveSignCount(lowestMidi - highThreshold);

		return {
			label: getHighOctaveSignLabel(octaveCount),
			octaveOffset: -octaveCount,
			placement: 'above',
		};
	}

	if (highestMidi < lowThreshold) {
		const octaveCount = getOctaveSignCount(lowThreshold - highestMidi);

		return {
			label: getLowOctaveSignLabel(octaveCount),
			octaveOffset: octaveCount,
			placement: 'below',
		};
	}

	return null;
}

function getOctaveSignCount(midiDistance) {
	return Math.min(Math.max(Math.ceil(midiDistance / 12), 1), 3);
}

function getHighOctaveSignLabel(octaveCount) {
	return octaveCount === 1 ? '8va' : `${8 + ((octaveCount - 1) * 7)}ma`;
}

function getLowOctaveSignLabel(octaveCount) {
	return octaveCount === 1 ? '8vb' : `${8 + ((octaveCount - 1) * 7)}mb`;
}

function getEffectiveStaffKeySignature(payload) {
	const signature = getPayloadKeySignature(payload);
	const rawKey = getPayloadKey(payload);

	return {
		...signature,
		usesEnharmonicKey: signature.key !== rawKey && Boolean(getPayloadEnharmonicKeyOption(payload)),
	};
}

function getPayloadKeySignature(payload) {
	const key = getEffectivePayloadKey(payload);

	if (!key) {
		return { key: '', table: MAJOR_KEY_FIFTHS };
	}

	const keyMode = getPayloadKeyMode(payload);

	if (isMinorKeyQuality(keyMode)) {
		return { key, table: MINOR_KEY_FIFTHS };
	}

	if (isModalKeyQuality(keyMode)) {
		const parentKey = getModeParentMajorKey(payload, keyMode)
			|| transposePitchClass(key, MODE_PARENT_MAJOR_OFFSETS[keyMode]);
		return { key: parentKey, table: MAJOR_KEY_FIFTHS };
	}

	return { key, table: MAJOR_KEY_FIFTHS };
}

function getPayloadKeyMode(payload) {
	const displayKeyMode = normalizeKeyQuality(payload.displayKeyMode, '');

	if (displayKeyMode) {
		return displayKeyMode;
	}

	const modeMatch = /\b(major|minor|harmonic minor|major pentatonic|minor pentatonic|major blues|minor blues|ionian|dorian|phrygian|lydian|mixolydian|aeolian|locrian)\b/i.exec(payload.label || '');
	const mode = String(modeMatch?.[1] || '').toLowerCase().replace(/\s+/g, '-');

	return normalizeKeyQuality(mode);
}

function getModeParentMajorKey(payload, mode) {
	const noteIndex = MODE_PARENT_NOTE_INDEX[mode];
	const noteKey = getNoteKeyName(payload.notes?.[noteIndex]);

	if (noteKey && MAJOR_KEY_FIFTHS[noteKey] !== undefined) {
		return noteKey;
	}

	return '';
}

function getPayloadEnharmonicKeyOption(payload) {
	return getEnharmonicKeyOption(getPayloadKey(payload));
}

function getEnharmonicKeyInSignatureTable(key, table) {
	const midiNumber = noteToMidi(`${key}4`);

	if (midiNumber === null) {
		return '';
	}

	const pitchClass = ((midiNumber % 12) + 12) % 12;

	return Object.keys(table)
		.filter((candidateKey) => {
			const candidateMidiNumber = noteToMidi(`${candidateKey}4`);
			return candidateMidiNumber !== null
				&& ((candidateMidiNumber % 12) + 12) % 12 === pitchClass;
		})
		.sort((firstKey, secondKey) => Math.abs(table[firstKey]) - Math.abs(table[secondKey]))[0] || '';
}

function transposePitchClass(key, semitones) {
	const midiNumber = noteToMidi(`${key}4`);

	if (midiNumber === null) {
		return key;
	}

	const transposedPitchClass = ((midiNumber + semitones) % 12 + 12) % 12;
	const sharpNames = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
	return sharpNames[transposedPitchClass];
}

function getNoteKeyName(note) {
	const pitch = getNotePitch(note);

	if (!pitch) {
		return '';
	}

	return `${pitch}${getAsciiAccidental(getNoteAccidental(note))}`;
}

function getAsciiAccidental(accidental) {
	switch (accidental) {
		case '#':
		case ACCIDENTAL_SYMBOLS.sharp:
			return '#';
		case '##':
		case 'x':
		case ACCIDENTAL_SYMBOLS.doubleSharp:
			return '##';
		case 'b':
		case ACCIDENTAL_SYMBOLS.flat:
			return 'b';
		case 'bb':
		case ACCIDENTAL_SYMBOLS.doubleFlat:
			return 'bb';
		default:
			return '';
	}
}

function getMusicXmlNoteParts(note) {
	const match = /^([A-Ga-g])(#{1,2}|b{1,2}|x|n|\u266f|\u266d|\u266e|\ud834\udd2a|\ud834\udd2b)?(-?\d+)$/u.exec(String(note || ''));

	if (!match) {
		return null;
	}

	const alter = getAccidentalOffset(match[2] || '');

	return {
		accidentalName: getMusicXmlAccidentalName(match[2] || ''),
		alter,
		octave: Number(match[3]),
		step: match[1].toUpperCase(),
	};
}

function getMusicXmlAccidentalName(accidental) {
	switch (accidental) {
		case '#':
		case ACCIDENTAL_SYMBOLS.sharp:
			return 'sharp';
		case '##':
		case 'x':
		case ACCIDENTAL_SYMBOLS.doubleSharp:
			return 'double-sharp';
		case 'b':
		case ACCIDENTAL_SYMBOLS.flat:
			return 'flat';
		case 'bb':
		case ACCIDENTAL_SYMBOLS.doubleFlat:
			return 'flat-flat';
		case 'n':
		case ACCIDENTAL_SYMBOLS.natural:
			return 'natural';
		default:
			return '';
	}
}

function getKeySignatureAlter(step, fifths) {
	const sharpSteps = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
	const flatSteps = ['B', 'E', 'A', 'D', 'G', 'C', 'F'];

	if (fifths > 0) {
		return sharpSteps.slice(0, fifths).includes(step) ? 1 : 0;
	}

	if (fifths < 0) {
		return flatSteps.slice(0, Math.abs(fifths)).includes(step) ? -1 : 0;
	}

	return 0;
}

function getMinorKeyLabelsByPitchClass(displayKey = '') {
	const key = normalizeKeyName(displayKey);
	const tonicMidi = noteToMidi(`${key}4`);
	const labelsByPitchClass = new Map();

	if (tonicMidi === null) {
		return labelsByPitchClass;
	}

	const letters = getMajorScaleLetters(key.charAt(0));
	const intervals = [0, 2, 3, 5, 7, 8, 10];

	letters.forEach((letter, index) => {
		const pitchClass = ((tonicMidi + intervals[index]) % 12 + 12) % 12;
		const naturalPitchClass = PITCH_OFFSETS[letter];
		const accidentalOffset = normalizeAccidentalOffset(pitchClass - naturalPitchClass);

		labelsByPitchClass.set(pitchClass, `${letter}${getAccidentalText(accidentalOffset)}`);
	});

	return labelsByPitchClass;
}

function getMajorScaleLetters(tonicLetter) {
	const letters = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
	const startIndex = letters.indexOf(tonicLetter);

	if (startIndex < 0) {
		return letters;
	}

	return [
		...letters.slice(startIndex),
		...letters.slice(0, startIndex),
	];
}

function normalizeAccidentalOffset(offset) {
	let nextOffset = offset;

	while (nextOffset > 6) {
		nextOffset -= 12;
	}

	while (nextOffset < -6) {
		nextOffset += 12;
	}

	return nextOffset;
}

function getAccidentalText(offset) {
	switch (offset) {
		case -2:
			return ACCIDENTAL_SYMBOLS.doubleFlat;
		case -1:
			return ACCIDENTAL_SYMBOLS.flat;
		case 1:
			return ACCIDENTAL_SYMBOLS.sharp;
		case 2:
			return ACCIDENTAL_SYMBOLS.doubleSharp;
		default:
			return '';
	}
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
