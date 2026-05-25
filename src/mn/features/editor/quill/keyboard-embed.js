import React from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import Quill from 'quill';
import MusicEmbedView from '../components/MusicEmbedView.jsx';
import { getKeyboardChordPreset } from './keyboard-chords.js';

const BlockEmbed = Quill.import('blots/block/embed');
const KEYBOARD_EMBED_BLOT = 'music-keyboard';
const KEYBOARD_EMBED_CLASS = 'music-keyboard-embed';
const REGISTER_FLAG = '__MUSIC_NOTEBOOK_KEYBOARD_EMBED_REGISTERED__';
const DEFAULT_DISPLAY_MODE = 'keyboard';
const DEFAULT_STAFF_OCTAVE = 4;
const DEFAULT_WIDTH = 456;
const DEFAULT_HEIGHT = 266;
const MIN_WIDTH = 240;
const MIN_HEIGHT = 180;

const DEFAULT_CHORD_PRESET = getKeyboardChordPreset('c-dim7');

export const DEFAULT_KEYBOARD_PAYLOAD = Object.freeze({
	id: 'keyboard-1',
		...DEFAULT_CHORD_PRESET,
	width: DEFAULT_WIDTH,
	height: DEFAULT_HEIGHT,
});

export class MusicKeyboardEmbed extends BlockEmbed {
	static blotName = KEYBOARD_EMBED_BLOT;
	static tagName = 'section';
	static className = KEYBOARD_EMBED_CLASS;

	static create(value = {}) {
		const payload = normalizeKeyboardPayload(value);
		const node = super.create();

		node.setAttribute('contenteditable', 'false');
		node.setAttribute('role', 'group');
		setKeyboardNodePayload(node, payload);

		renderKeyboardComponent(node, payload, {
			initialDialogOpen: value?.openEditor === true,
		});

		return node;
	}

	static value(node) {
		try {
			return normalizeKeyboardPayload(JSON.parse(node.dataset.keyboardPayload || '{}'));
		} catch {
			return normalizeKeyboardPayload();
		}
	}

	updateContent(nextPayload) {
		const payload = setKeyboardNodePayload(this.domNode, nextPayload);
		renderKeyboardComponent(this.domNode, payload);
	}

	detach() {
		this.domNode.__musicNotebookKeyboardRoot?.unmount();
		delete this.domNode.__musicNotebookKeyboardRoot;
		super.detach();
	}
}

export function registerKeyboardEmbed() {
	if (Quill[REGISTER_FLAG]) {
		return;
	}

	Quill.register(MusicKeyboardEmbed);
	Quill[REGISTER_FLAG] = true;
}

export function normalizeKeyboardPayload(value = {}) {
	const nextValue = value && typeof value === 'object' ? value : {};
	const notes = Array.isArray(nextValue.notes)
		? nextValue.notes.map((note) => String(note)).filter(Boolean)
		: [...DEFAULT_KEYBOARD_PAYLOAD.notes];
	const highlightedNotes = Array.isArray(nextValue.highlightedNotes)
		? nextValue.highlightedNotes.map((note) => String(note)).filter(Boolean)
		: undefined;

	const payload = {
		id: String(nextValue.id || DEFAULT_KEYBOARD_PAYLOAD.id),
		displayMode: normalizeDisplayMode(nextValue.displayMode),
		label: String(nextValue.label || DEFAULT_KEYBOARD_PAYLOAD.label),
		notes,
		staffOctave: normalizeStaffOctave(nextValue.staffOctave),
		width: normalizeDimension(nextValue.width, DEFAULT_WIDTH, MIN_WIDTH),
		height: normalizeDimension(nextValue.height, DEFAULT_HEIGHT, MIN_HEIGHT),
	};

	if (nextValue.displayKey) {
		payload.displayKey = normalizeDisplayKey(nextValue.displayKey);
	}

	if (nextValue.displayKeyMode === 'minor') {
		payload.displayKeyMode = 'minor';
	}

	if (nextValue.chordId) {
		payload.chordId = String(nextValue.chordId);
	}

	if (Number.isInteger(nextValue.inversion)) {
		payload.inversion = nextValue.inversion;
	}

	if (nextValue.scaleId) {
		payload.scaleId = String(nextValue.scaleId);
	}

	if (nextValue.progressionId) {
		payload.progressionId = String(nextValue.progressionId);
	}

	if (nextValue.progressionInput) {
		payload.progressionInput = String(nextValue.progressionInput);
	}

	if (nextValue.sourceChordSymbol) {
		payload.sourceChordSymbol = String(nextValue.sourceChordSymbol);
	}

	if (highlightedNotes) {
		payload.highlightedNotes = highlightedNotes;
	}

	if (nextValue.arpeggiate === true) {
		payload.arpeggiate = true;
	}

	if (nextValue.useEnharmonicKey === false) {
		payload.useEnharmonicKey = false;
	}

	if (nextValue.keyboardShowNoteNames === false) {
		payload.keyboardShowNoteNames = false;
	}

	if (nextValue.firstNote) {
		payload.firstNote = String(nextValue.firstNote);
	}

	if (nextValue.lastNote) {
		payload.lastNote = String(nextValue.lastNote);
	}

	if (nextValue.rootNote) {
		payload.rootNote = String(nextValue.rootNote);
	}

	return payload;
}

function renderKeyboardComponent(node, payload, options = {}) {
	if (!node.__musicNotebookKeyboardRoot) {
		node.innerHTML = '';
		node.__musicNotebookKeyboardRoot = createRoot(node);
	}

	flushSync(() => {
		node.__musicNotebookKeyboardRoot.render(
			<MusicEmbedView
				initialDialogOpen={options.initialDialogOpen === true}
				payload={payload}
				onPayloadChange={(nextPayload) => updateKeyboardPayload(node, nextPayload)}
			/>,
		);
	});
}

function updateKeyboardPayload(node, nextPayload) {
	const payload = setKeyboardNodePayload(node, nextPayload);

	syncOwningQuillDelta(node);
	node.dispatchEvent(new CustomEvent('music-keyboard-change', {
		bubbles: true,
		detail: { payload },
	}));
}

function setKeyboardNodePayload(node, nextPayload) {
	const payload = normalizeKeyboardPayload(nextPayload);

	node.setAttribute('aria-label', `Music object: ${payload.label}`);
	node.dataset.keyboardPayload = JSON.stringify(payload);
	node.style.setProperty('--music-embed-width', `${payload.width}px`);
	node.style.setProperty('--music-embed-height', `${payload.height}px`);

	return payload;
}

function normalizeDimension(dimension, defaultValue, minimumValue) {
	const value = Number(dimension);

	if (!Number.isFinite(value)) {
		return defaultValue;
	}

	return Math.max(Math.round(value), minimumValue);
}

function normalizeDisplayMode(displayMode) {
	return displayMode === 'staff' ? 'staff' : DEFAULT_DISPLAY_MODE;
}

function normalizeDisplayKey(displayKey) {
	return displayKey ? String(displayKey) : '';
}

function normalizeStaffOctave(staffOctave) {
	const octave = Number(staffOctave);

	if (!Number.isInteger(octave)) {
		return DEFAULT_STAFF_OCTAVE;
	}

	return Math.min(Math.max(octave, 0), 8);
}

function syncOwningQuillDelta(node) {
	const container = node.closest('.ql-container');
	const quill = container ? Quill.find(container) : null;

	quill?.editor?.update?.();
}

export { KEYBOARD_EMBED_BLOT };
