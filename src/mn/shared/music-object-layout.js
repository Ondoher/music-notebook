import {
	NATURAL_PITCH_CLASSES,
} from './const.js';
import {
	getEffectivePayloadKey,
	normalizeKeyName,
	normalizeStaffOctave,
	noteToMidi,
} from './music_helper.js';

const DEFAULT_FIRST_NOTE = 'c4';
const DEFAULT_LAST_NOTE = 'b4';
const DEFAULT_KEYBOARD_WIDTH = 456;
const DEFAULT_STAFF_HEIGHT = 266;
const KEYBOARD_KEY_WIDTH_TO_HEIGHT = 0.28;

export const MUSIC_EMBED_MIN_WIDTH = 120;
export const MUSIC_EMBED_MIN_KEYBOARD_HEIGHT = 64;
export const MUSIC_EMBED_MIN_STAFF_HEIGHT = 72;
export const MUSIC_EMBED_CAPTION_HEIGHT = 26;
export const MUSIC_EMBED_CAPTION_VERTICAL_PADDING = 10;
export const MUSIC_EMBED_CAPTION_LINE_HEIGHT = 1.3;
export const MUSIC_EMBED_MAX_WIDTH = 900;
export const MUSIC_EMBED_MAX_HEIGHT = 640;
export const MUSIC_EMBED_MIN_SCALE = 0.25;
export const MUSIC_EMBED_MAX_SCALE = 3;

/**
 * Gets the keyboard embed height that matches the piano aspect ratio for a given width.
 *
 * @param {KeyboardPayload | Partial<KeyboardPayload>} payload
 * @param {number} width
 * @returns {number}
 */
export function getKeyboardEmbedHeight(payload = {}, width = DEFAULT_KEYBOARD_WIDTH) {
	const displayKey = getEffectivePayloadKey(payload);
	const midiNumbers = notesToMidi(payload.highlightedNotes || payload.notes);
	const noteRange = getKeyboardNoteRange(midiNumbers, displayKey, payload.staffOctave);
	const whiteKeyCount = countNaturalKeys(noteRange.first, noteRange.last);
	const numericWidth = Number(width);
	const previewWidth = Number.isFinite(numericWidth) && numericWidth > 0
		? numericWidth
		: DEFAULT_KEYBOARD_WIDTH;

	const keyboardHeight = Math.max(
		Math.ceil((previewWidth / whiteKeyCount) / KEYBOARD_KEY_WIDTH_TO_HEIGHT),
		MUSIC_EMBED_MIN_KEYBOARD_HEIGHT,
	);

	return keyboardHeight + getMusicEmbedCaptionHeight(payload);
}

/**
 * Gets the minimum embed height for the requested display mode.
 *
 * @param {KeyboardDisplayMode | string} displayMode
 * @returns {number}
 */
export function getMusicEmbedMinimumHeight(displayMode = 'keyboard') {
	return displayMode === 'staff' ? MUSIC_EMBED_MIN_STAFF_HEIGHT : MUSIC_EMBED_MIN_KEYBOARD_HEIGHT;
}

/**
 * Gets the reserved caption height for a music embed payload.
 *
 * @param {KeyboardPayload | Partial<KeyboardPayload>} payload
 * @returns {number}
 */
export function getMusicEmbedCaptionHeight(payload = {}) {
	if (!hasMusicEmbedCaption(payload)) {
		return 0;
	}

	const fontSize = Number(payload.format?.caption?.fontSize);
	const captionFontSize = Number.isFinite(fontSize) ? Math.min(Math.max(Math.round(fontSize), 6), 144) : 12;

	return Math.max(
		MUSIC_EMBED_CAPTION_HEIGHT,
		Math.ceil(captionFontSize * MUSIC_EMBED_CAPTION_LINE_HEIGHT) + MUSIC_EMBED_CAPTION_VERTICAL_PADDING,
	);
}

function hasMusicEmbedCaption(payload = {}) {
	return Boolean(String(payload.caption?.template || '').trim());
}

/**
 * Clamps a proposed music embed width to supported bounds.
 *
 * @param {number} width
 * @param {number} [fallback=DEFAULT_KEYBOARD_WIDTH]
 * @returns {number}
 */
export function clampMusicEmbedWidth(width, fallback = DEFAULT_KEYBOARD_WIDTH) {
	return clampNumber(width, fallback, MUSIC_EMBED_MIN_WIDTH, MUSIC_EMBED_MAX_WIDTH);
}

/**
 * Clamps a proposed music embed scale to supported bounds.
 *
 * @param {number} scale
 * @param {number} [fallback=1]
 * @returns {number}
 */
export function clampMusicEmbedScale(scale, fallback = 1) {
	const numericScale = Number(scale);

	if (!Number.isFinite(numericScale)) {
		return fallback;
	}

	return Math.min(Math.max(numericScale, MUSIC_EMBED_MIN_SCALE), MUSIC_EMBED_MAX_SCALE);
}

/**
 * Normalizes all persisted and layout music embed sizing values from one source.
 *
 * @param {KeyboardPayload | Partial<KeyboardPayload>} payload
 * @returns {{captionHeight: number, height: number, layoutHeight: number, layoutWidth: number, scale: number, width: number}}
 */
export function normalizeMusicEmbedSizing(payload = {}) {
	const nextPayload = payload && typeof payload === 'object' ? payload : {};
	const displayMode = nextPayload.displayMode === 'staff' ? 'staff' : 'keyboard';
	const width = clampMusicEmbedWidth(nextPayload.width, DEFAULT_KEYBOARD_WIDTH);
	const captionHeight = getMusicEmbedCaptionHeight(nextPayload);
	const defaultHeight = displayMode === 'staff'
		? DEFAULT_STAFF_HEIGHT
		: getKeyboardEmbedHeight(nextPayload, width);
	const height = clampMusicEmbedHeight(nextPayload.height, displayMode, defaultHeight);
	const scale = clampMusicEmbedScale(nextPayload.scale, 1);

	return {
		captionHeight,
		height,
		layoutHeight: Math.round(height * scale),
		layoutWidth: Math.round(width * scale),
		scale,
		width,
	};
}

/**
 * Gets the default embed width from the available document content width.
 *
 * @param {number} contentWidth
 * @returns {number}
 */
export function getDefaultMusicEmbedWidth(contentWidth) {
	const width = Number(contentWidth);

	if (!Number.isFinite(width) || width <= 0) {
		return clampMusicEmbedWidth(DEFAULT_KEYBOARD_WIDTH);
	}

	return clampMusicEmbedWidth(width);
}

/**
 * Clamps a proposed music embed height to supported bounds.
 *
 * @param {number} height
 * @param {KeyboardDisplayMode | string} [displayMode='keyboard']
 * @param {number} [fallback=266]
 * @returns {number}
 */
export function clampMusicEmbedHeight(height, displayMode = 'keyboard', fallback = 266) {
	return clampNumber(height, fallback, getMusicEmbedMinimumHeight(displayMode), MUSIC_EMBED_MAX_HEIGHT);
}

/**
 * Gets the visible keyboard note range for a payload.
 *
 * @param {number[]} midiNumbers
 * @param {string} displayKey
 * @param {number} [staffOctave=4]
 * @returns {{first: number, last: number}}
 */
export function getKeyboardNoteRange(midiNumbers = [], displayKey = '', staffOctave = 4) {
	const keyStart = getDisplayKeyStartNote(displayKey, staffOctave);

	if (!midiNumbers.length) {
		return {
			first: keyStart || noteToMidi(DEFAULT_FIRST_NOTE),
			last: getMinimumOctaveLastNote(
				keyStart || noteToMidi(DEFAULT_FIRST_NOTE),
				keyStart || noteToMidi(DEFAULT_LAST_NOTE),
			),
		};
	}

	const firstNote = getNaturalKeyAtOrBefore(Math.min(...midiNumbers));
	const lastNote = getMinimumOctaveLastNote(
		firstNote,
		getNaturalKeyAtOrAfter(Math.max(...midiNumbers)),
	);

	return {
		first: firstNote,
		last: lastNote,
	};
}

function notesToMidi(notes = []) {
	return notes
		.map(noteToMidi)
		.filter((midiNumber) => midiNumber !== null);
}

function getDisplayKeyStartNote(displayKey, staffOctave = 4) {
	const key = normalizeKeyName(displayKey);

	if (!key) {
		return null;
	}

	const keyMidiNumber = noteToMidi(`${key}${normalizeStaffOctave(staffOctave)}`);
	return keyMidiNumber === null ? null : getNaturalKeyAtOrBefore(keyMidiNumber);
}

function getMinimumOctaveLastNote(firstNote, lastNote) {
	const minimumLastNote = firstNote + 12;

	if (lastNote >= minimumLastNote) {
		return lastNote;
	}

	return getNaturalKeyAtOrAfter(minimumLastNote);
}

function getNaturalKeyAtOrBefore(midiNumber) {
	let nextMidiNumber = midiNumber;

	while (!isNaturalMidiNumber(nextMidiNumber)) {
		nextMidiNumber -= 1;
	}

	return nextMidiNumber;
}

function getNaturalKeyAtOrAfter(midiNumber) {
	let nextMidiNumber = midiNumber;

	while (!isNaturalMidiNumber(nextMidiNumber)) {
		nextMidiNumber += 1;
	}

	return nextMidiNumber;
}

function countNaturalKeys(firstNote, lastNote) {
	let count = 0;

	for (let midiNumber = firstNote; midiNumber <= lastNote; midiNumber += 1) {
		if (isNaturalMidiNumber(midiNumber)) {
			count += 1;
		}
	}

	return Math.max(count, 1);
}

function clampNumber(value, fallback, minimum, maximum) {
	const numericValue = Number(value);

	if (!Number.isFinite(numericValue)) {
		return fallback;
	}

	return Math.min(Math.max(Math.round(numericValue), minimum), maximum);
}

function isNaturalMidiNumber(midiNumber) {
	const pitchClass = ((midiNumber % 12) + 12) % 12;

	return NATURAL_PITCH_CLASSES.includes(pitchClass);
}
