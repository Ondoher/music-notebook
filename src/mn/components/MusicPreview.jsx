import React, { Component, createRef } from 'react';
import { OpenSheetMusicDisplay } from 'opensheetmusicdisplay';
import { MidiNumbers, Piano } from 'react-piano';
import {
	ACCIDENTAL_SYMBOLS,
	NATURAL_PITCH_CLASSES,
} from '../shared/const.js';
import {
	buildMusicXml,
	getEffectivePayloadKey,
	getMajorKeyLabelsByPitchClass,
	getStaffNotes,
	normalizeKeyName,
	normalizeStaffOctave,
	noteToMidi,
} from '../shared/music_helper.js';
import 'react-piano/dist/styles.css';

const DEFAULT_FIRST_NOTE = 'c4';
const DEFAULT_LAST_NOTE = 'b4';
const DEFAULT_WIDTH = 420;
const EMBED_HORIZONTAL_CHROME = 0;

/**
 * Renders a music embed payload using the shared keyboard or staff preview.
 *
 * @extends {Component<MusicPreviewProps>}
 */
export default class MusicPreview extends Component {
	/**
	 * Renders the active preview surface.
	 *
	 * @returns {React.ReactElement}
	 */
	render() {
		return this.props.payload.displayMode === 'staff'
			? <StaffPreview payload={this.props.payload} />
			: <KeyboardPreview payload={this.props.payload} />;
	}
}

/**
 * Renders a music embed payload as staff notation using OpenSheetMusicDisplay.
 *
 * @extends {Component<StaffPreviewProps>}
 */
class StaffPreview extends Component {
	/** @type {React.RefObject<HTMLDivElement>} */
	containerRef = createRef();

	cancelled = false;

	/**
	 * Renders staff notation after mount.
	 *
	 * @returns {void}
	 */
	componentDidMount() {
		this.renderStaff();
	}

	/**
	 * Renders staff notation after payload changes.
	 *
	 * @param {StaffPreviewProps} previousProps
	 * @returns {void}
	 */
	componentDidUpdate(previousProps) {
		if (previousProps.payload !== this.props.payload) {
			this.renderStaff();
		}
	}

	/**
	 * Stops pending staff rendering work.
	 *
	 * @returns {void}
	 */
	componentWillUnmount() {
		this.cancelled = true;
		this.containerRef.current?.replaceChildren();
	}

	/**
	 * Builds the current staff MusicXML.
	 *
	 * @returns {string}
	 */
	getMusicXml() {
		const { payload } = this.props;
		const staffNotes = getStaffNotes(payload.highlightedNotes || payload.notes, payload.staffOctave ?? 4, payload);

		return buildMusicXml(payload, staffNotes);
	}

	/**
	 * Draws the staff preview.
	 *
	 * @returns {void}
	 */
	renderStaff() {
		const container = this.containerRef.current;

		if (!container) {
			return;
		}

		this.cancelled = false;
		container.replaceChildren();

		const osmd = new OpenSheetMusicDisplay(container, {
			autoResize: false,
			backend: 'svg',
			drawPartNames: false,
			drawTitle: false,
			drawTimeSignatures: false,
			renderSingleHorizontalStaffline: false,
		});

		osmd.load(this.getMusicXml()).then(() => {
			if (this.cancelled) {
				return;
			}

			osmd.zoom = 1.35;
			osmd.render();
			fitOsmdSvgToContent(container);
		}).catch(() => {
			if (!this.cancelled) {
				container.textContent = '';
			}
		});
	}

	/**
	 * Renders the staff preview host.
	 *
	 * @returns {React.ReactElement}
	 */
	render() {
		return (
			<div className="music-staff-preview" aria-hidden="true">
				<div ref={this.containerRef} className="music-staff-osmd" />
			</div>
		);
	}
}

/**
 * Renders a music embed payload as a highlighted piano keyboard.
 *
 * @extends {Component<KeyboardPreviewProps>}
 */
class KeyboardPreview extends Component {
	/** @type {React.RefObject<HTMLDivElement>} */
	pianoRef = createRef();

	/**
	 * Applies keyboard highlight classes after mount.
	 *
	 * @returns {void}
	 */
	componentDidMount() {
		this.applyHighlights();
	}

	/**
	 * Applies keyboard highlight classes after payload changes.
	 *
	 * @returns {void}
	 */
	componentDidUpdate() {
		this.applyHighlights();
	}

	/**
	 * Gets the current preview model.
	 *
	 * @returns {KeyboardPreviewModel}
	 */
	getPreviewModel() {
		const { payload } = this.props;
		const displayKey = getEffectivePayloadKey(payload);
		const noteMidiNumbers = notesToMidi(payload.highlightedNotes || payload.notes);
		const noteRange = getKeyboardNoteRange(noteMidiNumbers, displayKey, payload.staffOctave);
		const firstNote = noteRange.first;
		const lastNote = noteRange.last;
		const spelledLabelsByMidi = getSpelledLabelsByMidi(payload.highlightedNotes || payload.notes);
		const keyLabelsByMidi = getKeyLabelsByMidi(firstNote, lastNote, displayKey);
		const showNoteNames = payload.keyboardShowNoteNames !== false;

		return {
			firstNote,
			hasHighlights: noteMidiNumbers.length > 0,
			highlightedNotes: noteMidiNumbers,
			keyLabelsByMidi,
			lastNote,
			rootNote: noteToMidi(payload.rootNote || payload.notes[0]),
			showNoteNames,
			spelledLabelsByMidi,
		};
	}

	/**
	 * Applies highlight and root classes to rendered piano keys.
	 *
	 * @returns {void}
	 */
	applyHighlights() {
		const piano = this.pianoRef.current;
		const model = this.getPreviewModel();

		if (!piano) {
			return;
		}

		piano.querySelectorAll('.ReactPiano__Key').forEach((key) => {
			key.classList.remove('music-keyboard-key-highlighted', 'music-keyboard-key-root');
		});

		piano.querySelectorAll('[data-midi-number]').forEach((label) => {
			const midiNumber = Number(label.dataset.midiNumber);
			const key = label.closest('.ReactPiano__Key');

			if (!key) {
				return;
			}

			if (model.highlightedNotes.includes(midiNumber)) {
				key.classList.add('music-keyboard-key-highlighted');
			}

			if (midiNumber === model.rootNote) {
				key.classList.add('music-keyboard-key-root');
			}
		});
	}

	/**
	 * Renders one keyboard note label.
	 *
	 * @param {{midiNumber: number, isAccidental: boolean}} noteProps
	 * @param {KeyboardPreviewModel} model
	 * @returns {React.ReactElement}
	 */
	renderNoteLabel(noteProps, model) {
		return renderKeyboardNoteLabel(
			noteProps,
			model.spelledLabelsByMidi,
			model.keyLabelsByMidi,
			model.showNoteNames,
		);
	}

	/**
	 * Renders the keyboard preview.
	 *
	 * @returns {React.ReactElement}
	 */
	render() {
		const model = this.getPreviewModel();

		return (
			<div
				ref={this.pianoRef}
				className={model.hasHighlights
					? 'music-keyboard-embed-piano music-keyboard-embed-has-highlights'
					: 'music-keyboard-embed-piano'}
				aria-hidden="true"
			>
				<Piano
					activeNotes={[]}
					keyWidthToHeight={0.28}
					noteRange={{ first: model.firstNote, last: model.lastNote }}
					playNote={() => {}}
					renderNoteLabel={(noteProps) => this.renderNoteLabel(noteProps, model)}
					stopNote={() => {}}
					width={getPreviewWidth(this.props.payload.width)}
				/>
			</div>
		);
	}
}

function fitOsmdSvgToContent(container) {
	const svg = container.querySelector('svg');

	if (!svg) {
		return;
	}

	const bounds = Array.from(svg.querySelectorAll('path, line, polyline, polygon, circle, ellipse, text'))
		.map((element) => getSvgElementBounds(element))
		.filter(Boolean)
		.reduce((combinedBounds, bounds) => combineSvgBounds(combinedBounds, bounds), null);

	if (!bounds || bounds.width <= 0 || bounds.height <= 0) {
		return;
	}

	const padding = 10;
	const viewBox = [
		bounds.x - padding,
		bounds.y - padding,
		bounds.width + (padding * 2),
		bounds.height + (padding * 2),
	].join(' ');

	svg.setAttribute('viewBox', viewBox);
	svg.removeAttribute('width');
	svg.removeAttribute('height');
	svg.setAttribute('preserveAspectRatio', 'xMinYMin meet');
}

function getSvgElementBounds(element) {
	try {
		const bounds = element.getBBox();

		if (!Number.isFinite(bounds.x) || !Number.isFinite(bounds.y) || bounds.width <= 0 || bounds.height <= 0) {
			return null;
		}

		return bounds;
	} catch {
		return null;
	}
}

function combineSvgBounds(firstBounds, secondBounds) {
	if (!firstBounds) {
		return secondBounds;
	}

	const x = Math.min(firstBounds.x, secondBounds.x);
	const y = Math.min(firstBounds.y, secondBounds.y);
	const right = Math.max(firstBounds.x + firstBounds.width, secondBounds.x + secondBounds.width);
	const bottom = Math.max(firstBounds.y + firstBounds.height, secondBounds.y + secondBounds.height);

	return {
		x,
		y,
		width: right - x,
		height: bottom - y,
	};
}

function isChordPayload(payload) {
	return (payload.notes?.length || 0) > 1
		&& (
			Boolean(payload.chordId || payload.progressionId || payload.sourceChordSymbol)
			|| !payload.scaleId
		);
}

function getPreviewWidth(width) {
	const previewWidth = Number(width) - EMBED_HORIZONTAL_CHROME;

	if (!Number.isFinite(previewWidth) || previewWidth <= 0) {
		return DEFAULT_WIDTH;
	}

	return previewWidth;
}

function renderKeyboardNoteLabel({ midiNumber, isAccidental }, spelledLabelsByMidi, keyLabelsByMidi, showNoteNames) {
	if (!showNoteNames) {
		return <span data-midi-number={midiNumber} />;
	}

	const spelledLabel = spelledLabelsByMidi.get(midiNumber);
	const keyLabel = keyLabelsByMidi.get(midiNumber);
	const label = spelledLabel || keyLabel || '';

	if (isAccidental) {
		return (
			<span data-midi-number={midiNumber}>
				<span className="music-keyboard-accidental-marker">
					{renderKeyboardLabelText(label)}
				</span>
			</span>
		);
	}

	return (
		<span data-midi-number={midiNumber}>
			<span className={spelledLabel || keyLabel ? 'music-keyboard-spelled-label' : ''}>
				{renderKeyboardLabelText(label || MidiNumbers.getAttributes(midiNumber).pitchName)}
			</span>
		</span>
	);
}

function renderKeyboardLabelText(label) {
	const labelParts = splitKeyboardLabel(label);

	if (!labelParts) {
		return label;
	}

	return (
		<>
			<span className="music-keyboard-note-letter">{labelParts.letter}</span>
			{labelParts.accidental ? (
				<span className="music-keyboard-note-accidental">{labelParts.accidental}</span>
			) : null}
		</>
	);
}

function splitKeyboardLabel(label) {
	const match = /^([A-G])(\u266f|\u266d|\u266e|\ud834\udd2a|\ud834\udd2b)?$/u.exec(String(label || ''));

	if (!match) {
		return null;
	}

	return {
		accidental: match[2] || '',
		letter: match[1],
	};
}

function notesToMidi(notes = []) {
	return notes
		.map(noteToMidi)
		.filter((midiNumber) => midiNumber !== null);
}

function getKeyLabelsByMidi(firstNote, lastNote, displayKey = '') {
	const labelsByPitchClass = getMajorKeyLabelsByPitchClass(displayKey);
	const labelsByMidi = new Map();

	if (!labelsByPitchClass.size) {
		return labelsByMidi;
	}

	for (let midiNumber = firstNote; midiNumber <= lastNote; midiNumber += 1) {
		const pitchClass = ((midiNumber % 12) + 12) % 12;
		const label = labelsByPitchClass.get(pitchClass);

		if (label) {
			labelsByMidi.set(midiNumber, label);
		}
	}

	return labelsByMidi;
}

function getKeyboardNoteRange(midiNumbers = [], displayKey = '', staffOctave = 4) {
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

function isNaturalMidiNumber(midiNumber) {
	return NATURAL_PITCH_CLASSES.includes(midiNumber % 12);
}

function getSpelledLabelsByMidi(notes = []) {
	return notes.reduce((markers, note) => {
		const midiNumber = noteToMidi(note);
		const marker = getSpelledLabel(note);

		if (midiNumber !== null && marker) {
			markers.set(midiNumber, marker);
		}

		return markers;
	}, new Map());
}

function getSpelledLabel(note) {
	const match = /^([A-Ga-g])(#{1,2}|b{1,2}|x|n|\u266f|\u266d|\u266e|\ud834\udd2a|\ud834\udd2b)?/u.exec(String(note || ''));

	if (!match) {
		return '';
	}

	const pitch = match[1].toUpperCase();

	switch (match[2]) {
		case undefined:
		case '':
			return '';
		case '#':
		case ACCIDENTAL_SYMBOLS.sharp:
			return `${pitch}${ACCIDENTAL_SYMBOLS.sharp}`;
		case '##':
		case 'x':
		case ACCIDENTAL_SYMBOLS.doubleSharp:
			return `${pitch}${ACCIDENTAL_SYMBOLS.doubleSharp}`;
		case 'b':
		case ACCIDENTAL_SYMBOLS.flat:
			return `${pitch}${ACCIDENTAL_SYMBOLS.flat}`;
		case 'bb':
		case ACCIDENTAL_SYMBOLS.doubleFlat:
			return `${pitch}${ACCIDENTAL_SYMBOLS.doubleFlat}`;
		case 'n':
		case ACCIDENTAL_SYMBOLS.natural:
			return `${pitch}${ACCIDENTAL_SYMBOLS.natural}`;
		default:
			return '';
	}
}
