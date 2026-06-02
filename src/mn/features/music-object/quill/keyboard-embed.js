import React from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import Quill from 'quill';
import MusicNotebookProvider from '../../../common/MusicNotebookProvider.jsx';
import MusicEmbedView from '../components/MusicEmbedView.jsx';
import { normalizeKeyQuality } from '../../../shared/key-qualities.js';
import {
	normalizeMusicEmbedSizing,
} from '../../../shared/music-object-layout.js';
import { getKeyboardChordPreset } from './keyboard-chords.js';

const Embed = Quill.import('blots/embed');
const Delta = Quill.import('delta');
const KEYBOARD_EMBED_BLOT = 'music-keyboard';
const KEYBOARD_EMBED_CLASS = 'music-keyboard-embed';
const REGISTER_FLAG = '__MUSIC_NOTEBOOK_KEYBOARD_EMBED_REGISTERED__';
const DEFAULT_DISPLAY_MODE = 'keyboard';
const DEFAULT_STAFF_OCTAVE = 4;
const DEFAULT_WIDTH = 456;

const DEFAULT_CHORD_PRESET = getKeyboardChordPreset('c-major');
const DEFAULT_KEYBOARD_HEIGHT = normalizeMusicEmbedSizing({
	...DEFAULT_CHORD_PRESET,
	width: DEFAULT_WIDTH,
}).height;
const consumedInitialDialogOpenIds = new Set();
let musicNotebookContextValue = null;

export const DEFAULT_KEYBOARD_PAYLOAD = Object.freeze({
	id: 'keyboard-1',
		...DEFAULT_CHORD_PRESET,
	width: DEFAULT_WIDTH,
	height: DEFAULT_KEYBOARD_HEIGHT,
	scale: 1,
});

export class MusicKeyboardEmbed extends Embed {
	static blotName = KEYBOARD_EMBED_BLOT;
	static tagName = 'span';
	static className = KEYBOARD_EMBED_CLASS;

	static create(value = {}) {
		const payload = normalizeKeyboardPayload(value);
		const node = super.create();
		const initialDialogOpen = shouldOpenInitialDialog(value, payload);

		node.setAttribute('contenteditable', 'false');
		node.setAttribute('role', 'group');
		setKeyboardNodePayload(node, payload);

		renderKeyboardComponent(node, payload, {
			initialEditMode: value?.initialEditMode,
			initialDialogOpen,
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

export function configureKeyboardEmbedContext(contextValue) {
	musicNotebookContextValue = contextValue || null;
}

function shouldOpenInitialDialog(value, payload) {
	if (value?.openEditor !== true) {
		return false;
	}

	const id = payload?.id || value?.id || '';

	if (!id) {
		return true;
	}

	if (consumedInitialDialogOpenIds.has(id)) {
		return false;
	}

	consumedInitialDialogOpenIds.add(id);
	return true;
}

export function normalizeKeyboardPayload(value = {}) {
	const nextValue = value && typeof value === 'object' ? value : {};
	const notes = Array.isArray(nextValue.notes)
		? nextValue.notes.map((note) => String(note)).filter(Boolean)
		: [...DEFAULT_KEYBOARD_PAYLOAD.notes];
	const highlightedNotes = Array.isArray(nextValue.highlightedNotes)
		? nextValue.highlightedNotes.map((note) => String(note)).filter(Boolean)
		: undefined;
	const displayMode = normalizeDisplayMode(nextValue.displayMode);
	const caption = normalizeCaption(nextValue.caption);
	const sizing = normalizeMusicEmbedSizing({
		...nextValue,
		caption,
		displayMode,
		width: nextValue.width || DEFAULT_WIDTH,
	});

	const payload = {
		id: String(nextValue.id || DEFAULT_KEYBOARD_PAYLOAD.id),
		displayMode,
		label: String(nextValue.label || DEFAULT_KEYBOARD_PAYLOAD.label),
		notes,
		staffOctave: normalizeStaffOctave(nextValue.staffOctave),
		width: sizing.width,
		height: sizing.height,
	};

	if (sizing.scale !== 1) {
		payload.scale = sizing.scale;
	}

	if (nextValue.displayKey) {
		payload.displayKey = normalizeDisplayKey(nextValue.displayKey);
	}

	const displayKeyMode = normalizeKeyQuality(nextValue.displayKeyMode);

	if (displayKeyMode !== 'major') {
		payload.displayKeyMode = displayKeyMode;
	}

	if (caption) {
		payload.caption = caption;
	}

	const format = normalizeEmbedFormat(nextValue.format);

	if (format) {
		payload.format = format;
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
			<MusicNotebookProvider contextValue={musicNotebookContextValue || {}}>
				<MusicEmbedView
					initialEditMode={options.initialEditMode}
					initialDialogOpen={options.initialDialogOpen === true}
					payload={payload}
					onPayloadChange={(nextPayload, changeOptions) => updateKeyboardPayload(node, nextPayload, changeOptions)}
					onRemove={(objectId) => removeKeyboardPayload(node, objectId)}
				/>
			</MusicNotebookProvider>,
		);
	});
}

function updateKeyboardPayload(node, nextPayload, options = {}) {
	const payload = normalizeKeyboardPayload(nextPayload);
	const focusedField = captureDialogFocus(node.ownerDocument);

	if (options.commit === true && replaceKeyboardPayloadInQuill(node, payload)) {
		restoreDialogFocus(focusedField);
		return;
	}

	setKeyboardNodePayload(node, payload);
	syncOwningQuillDelta(node);
	restoreDialogFocus(focusedField);
	node.dispatchEvent(new CustomEvent('music-keyboard-change', {
		bubbles: true,
		detail: { payload },
	}));
}

function replaceKeyboardPayloadInQuill(node, payload) {
	const container = node.closest('.ql-container');
	const quill = container ? Quill.find(container) : null;
	const blot = Quill.find(node);

	if (!quill || !blot) {
		return false;
	}

	const index = quill.getIndex(blot);
	const selection = quill.getSelection();
	const nextSelectionIndex = selection
		? Math.min(selection.index, Math.max(quill.getLength() - 1, 0))
		: index + 1;

	quill.updateContents(
		new Delta()
			.retain(index)
			.delete(1)
			.insert({ [KEYBOARD_EMBED_BLOT]: payload }),
		'user',
	);
	quill.setSelection(nextSelectionIndex, selection?.length || 0, 'silent');
	quill.root?.dispatchEvent?.(new CustomEvent('music-keyboard-change', {
		bubbles: true,
		detail: { payload },
	}));
	return true;
}

function removeKeyboardPayload(node, objectId) {
	const payload = MusicKeyboardEmbed.value(node);
	const id = objectId || payload.id;

	node.dispatchEvent(new CustomEvent('music-keyboard-remove', {
		bubbles: true,
		detail: { id },
	}));

	const container = node.closest('.ql-container');
	const quill = container ? Quill.find(container) : null;
	const blot = Quill.find(node);

	if (!quill || !blot) {
		node.remove();
		return;
	}

	const index = quill.getIndex(blot);

	quill.deleteText(index, 1, 'user');

	quill.setSelection(Math.min(index, Math.max(quill.getLength() - 1, 0)), 0, 'silent');
	quill.editor?.update?.();
}

function setKeyboardNodePayload(node, nextPayload) {
	const payload = normalizeKeyboardPayload(nextPayload);

	node.setAttribute('aria-label', `Music object: ${payload.label}`);
	node.dataset.keyboardPayload = JSON.stringify(payload);
	applyMusicEmbedSizingStyles(node, payload);
	applyEmbedFormatClassNames(node, payload.format);

	return payload;
}

function applyMusicEmbedSizingStyles(node, payload) {
	const sizing = normalizeMusicEmbedSizing(payload);

	node.style.setProperty('--music-embed-width', `${sizing.width}px`);
	node.style.setProperty('--music-embed-height', `${sizing.height}px`);
	node.style.setProperty('--music-embed-caption-height', `${sizing.captionHeight}px`);
	node.style.setProperty('--music-embed-scale', String(sizing.scale));
	node.style.setProperty('--music-embedded-layout-width', `${sizing.layoutWidth}px`);
	node.style.setProperty('--music-embedded-layout-height', `${sizing.layoutHeight}px`);
}

function normalizeDisplayMode(displayMode) {
	return displayMode === 'staff' ? 'staff' : DEFAULT_DISPLAY_MODE;
}

function normalizeCaption(caption) {
	if (!caption || typeof caption !== 'object') {
		return null;
	}

	const template = String(caption.template || '');

	if (!template.trim()) {
		return null;
	}

	return { template };
}

function normalizeEmbedFormat(format) {
	if (!format || typeof format !== 'object') {
		return null;
	}

	const caption = format.caption && typeof format.caption === 'object' ? format.caption : {};
	const captionFontSize = Number(caption.fontSize);
	const normalizedCaption = {
		alignment: ['left', 'center', 'right'].includes(caption.alignment) ? caption.alignment : 'center',
		bold: caption.bold === true,
		fontSize: Number.isFinite(captionFontSize) ? Math.min(Math.max(Math.round(captionFontSize), 6), 144) : 12,
		italic: caption.italic === true,
		underline: caption.underline === true,
	};
	const styleId = String(caption.styleId || '').trim();

	if (styleId && styleId !== 'normal') {
		normalizedCaption.styleId = styleId;
	}

	return {
		alignment: ['left', 'center', 'right'].includes(format.alignment) ? format.alignment : 'left',
		caption: normalizedCaption,
	};
}

function applyEmbedFormatClassNames(node, format) {
	const normalizedFormat = normalizeEmbedFormat(format) || normalizeEmbedFormat({});
	const classNames = [
		'music-keyboard-embed--align-left',
		'music-keyboard-embed--align-center',
		'music-keyboard-embed--align-right',
	];

	node.classList.remove(...classNames);

	node.classList.add(`music-keyboard-embed--align-${normalizedFormat.alignment}`);
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
	let blot = Quill.find(node);

	while (blot) {
		if (blot.cache) {
			blot.cache = {};
		}

		blot = blot.parent;
	}

	quill?.editor?.update?.();
}

function captureDialogFocus(ownerDocument) {
	const activeElement = ownerDocument?.activeElement;

	if (!activeElement?.closest?.('.music-keyboard-dialog, .music-embed-format-dialog')) {
		return null;
	}

	return {
		element: activeElement,
		selectionDirection: activeElement.selectionDirection,
		selectionEnd: activeElement.selectionEnd,
		selectionStart: activeElement.selectionStart,
	};
}

function restoreDialogFocus(snapshot) {
	if (!snapshot?.element?.isConnected) {
		return;
	}

	const restore = () => {
		if (!snapshot.element.isConnected) {
			return;
		}

		snapshot.element.focus?.({ preventScroll: true });

		if (
			Number.isInteger(snapshot.selectionStart)
			&& Number.isInteger(snapshot.selectionEnd)
			&& snapshot.element.setSelectionRange
		) {
			snapshot.element.setSelectionRange(
				snapshot.selectionStart,
				snapshot.selectionEnd,
				snapshot.selectionDirection || 'none',
			);
		}
	};
	const ownerWindow = snapshot.element.ownerDocument?.defaultView;

	if (ownerWindow?.queueMicrotask) {
		ownerWindow.queueMicrotask(restore);
		return;
	}

	ownerWindow?.setTimeout?.(restore, 0);
}

export { KEYBOARD_EMBED_BLOT };
