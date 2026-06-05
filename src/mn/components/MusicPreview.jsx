import React, { Component, createRef } from 'react';
import { OpenSheetMusicDisplay } from 'opensheetmusicdisplay';
import { MidiNumbers, Piano } from 'react-piano';
import {
	ACCIDENTAL_SYMBOLS,
} from '../shared/const.js';
import {
	buildMusicXml,
	getEffectivePayloadKey,
	getMajorKeyLabelsByPitchClass,
	getPayloadKeyFifths,
	getStaffNotes,
	noteToMidi,
} from '../shared/music_helper.js';
import { getKeyboardNoteRange } from '../shared/music-object-layout.js';

const DEFAULT_WIDTH = 420;
const EMBED_HORIZONTAL_CHROME = 0;
const KEYBOARD_KEY_WIDTH_TO_HEIGHT = 0.28;
const STAFF_LAYOUT_WIDTH = 360;
const STAFF_LAYOUT_HEIGHT = 260;
const STAFF_LAYOUT_BASE_WIDTH = 220;
const STAFF_LAYOUT_KEY_SIGNATURE_ACCIDENTAL_WIDTH = 24;

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
			? <StaffPreview payload={this.props.payload} onNaturalHeight={this.props.onNaturalHeight} />
			: <KeyboardPreview fitWidth={this.props.fitWidth} payload={this.props.payload} />;
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
	renderSurface = null;

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
		this.removeRenderSurface();
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
		this.removeRenderSurface();

		const renderSurface = this.createRenderSurface(container);
		const osmd = new OpenSheetMusicDisplay(renderSurface, {
			autoResize: false,
			backend: 'svg',
			drawPartNames: false,
			drawTitle: false,
			drawTimeSignatures: false,
			renderSingleHorizontalStaffline: false,
		});

		osmd.load(this.getMusicXml()).then(() => {
			if (this.cancelled) {
				this.removeRenderSurface(renderSurface);
				return;
			}

			osmd.zoom = 1.35;
			osmd.render();
			const bounds = fitOsmdSvgToGeneratedSize(renderSurface);
			const svg = renderSurface.querySelector('svg');

			if (svg) {
				container.replaceChildren(svg);
			}

			this.removeRenderSurface(renderSurface);
			this.reportNaturalHeight(bounds);
		}).catch(() => {
			this.removeRenderSurface(renderSurface);

			if (!this.cancelled) {
				container.textContent = '';
			}
		});
	}

	/**
	 * Creates a fixed-size render target so OSMD layout is independent of the embed size.
	 *
	 * @param {HTMLDivElement} visibleContainer
	 * @returns {HTMLDivElement}
	 */
	createRenderSurface(visibleContainer) {
		const ownerDocument = visibleContainer.ownerDocument;
		const renderSurface = ownerDocument.createElement('div');

		renderSurface.style.position = 'fixed';
		renderSurface.style.left = '-10000px';
		renderSurface.style.top = '0';
		renderSurface.style.width = `${getStaffLayoutWidth(this.props.payload)}px`;
		renderSurface.style.height = `${STAFF_LAYOUT_HEIGHT}px`;
		renderSurface.style.overflow = 'visible';
		renderSurface.style.opacity = '0';
		renderSurface.style.pointerEvents = 'none';

		(ownerDocument.body || visibleContainer).appendChild(renderSurface);
		this.renderSurface = renderSurface;

		return renderSurface;
	}

	/**
	 * Removes a temporary staff render surface.
	 *
	 * @param {HTMLDivElement} [renderSurface]
	 * @returns {void}
	 */
	removeRenderSurface(renderSurface = this.renderSurface) {
		renderSurface?.remove();

		if (this.renderSurface === renderSurface) {
			this.renderSurface = null;
		}
	}

	/**
	 * Reports the rendered staff height that matches the generated SVG aspect ratio.
	 *
	 * @param {{width: number, height: number} | null} bounds
	 * @returns {void}
	 */
	reportNaturalHeight(bounds) {
		const renderedWidth = this.containerRef.current?.getBoundingClientRect?.().width;
		const width = Number.isFinite(renderedWidth) && renderedWidth > 0
			? renderedWidth
			: Number(this.props.payload.width);

		if (!bounds || !Number.isFinite(width) || width <= 0 || bounds.width <= 0) {
			return;
		}

		this.props.onNaturalHeight?.(Math.ceil(width * (bounds.height / bounds.width)));
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
		const naturalKeyCount = countNaturalMidiNumbers(model.firstNote, model.lastNote);
		const previewWidth = getPreviewWidth(this.props.payload.width);
		const previewHeight = getKeyboardPreviewHeight(model.firstNote, model.lastNote, previewWidth);
		const pianoProps = {
			activeNotes: [],
			keyWidthToHeight: KEYBOARD_KEY_WIDTH_TO_HEIGHT,
			noteRange: { first: model.firstNote, last: model.lastNote },
			playNote: () => {},
			renderNoteLabel: (noteProps) => this.renderNoteLabel(noteProps, model),
			stopNote: () => {},
		};

		if (!this.props.fitWidth) {
			pianoProps.width = previewWidth;
		}

		return (
			<div
				ref={this.pianoRef}
				className={model.hasHighlights
					? 'music-keyboard-embed-piano music-keyboard-embed-has-highlights'
					: 'music-keyboard-embed-piano'}
				aria-hidden="true"
				style={this.props.fitWidth
					? { aspectRatio: `${naturalKeyCount * KEYBOARD_KEY_WIDTH_TO_HEIGHT} / 1` }
					: { height: `${previewHeight}px` }}
			>
				<Piano {...pianoProps} />
			</div>
		);
	}
}

function getKeyboardPreviewHeight(firstNote, lastNote, width) {
	const naturalKeyCount = countNaturalMidiNumbers(firstNote, lastNote);

	return Math.ceil((width / naturalKeyCount) / KEYBOARD_KEY_WIDTH_TO_HEIGHT);
}

function countNaturalMidiNumbers(firstNote, lastNote) {
	let count = 0;

	for (let midiNumber = firstNote; midiNumber <= lastNote; midiNumber += 1) {
		if (!MidiNumbers.getAttributes(midiNumber).isAccidental) {
			count += 1;
		}
	}

	return Math.max(count, 1);
}

function fitOsmdSvgToGeneratedSize(container) {
	const svg = container.querySelector('svg');

	if (!svg) {
		return null;
	}

	const bounds = getSvgVisibleBounds(svg);

	if (!bounds || bounds.width <= 0 || bounds.height <= 0) {
		return null;
	}

	svg.setAttribute('viewBox', `${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`);
	svg.setAttribute('width', '100%');
	svg.setAttribute('height', '100%');
	svg.setAttribute('preserveAspectRatio', 'xMinYMin meet');

	return {
		height: bounds.height,
		width: bounds.width,
	};
}

function getSvgVisibleBounds(svg) {
	const renderedBounds = getSvgRenderedContentBounds(svg);

	if (renderedBounds) {
		return expandSvgBounds(renderedBounds, getSvgStrokePadding(svg));
	}

	return getSvgGeneratedBounds(svg);
}

function getStaffLayoutWidth(payload = {}) {
	const accidentalWidth = Math.abs(getPayloadKeyFifths(payload)) * STAFF_LAYOUT_KEY_SIGNATURE_ACCIDENTAL_WIDTH;
	const keySignatureWidth = STAFF_LAYOUT_BASE_WIDTH + accidentalWidth;

	return Math.max(Number(payload.width) || 0, STAFF_LAYOUT_WIDTH, keySignatureWidth);
}

function getSvgRenderedContentBounds(svg) {
	const screenMatrix = typeof svg.getScreenCTM === 'function' ? svg.getScreenCTM() : null;
	const inverseMatrix = screenMatrix ? screenMatrix.inverse() : null;

	if (!inverseMatrix) {
		return null;
	}

	const clientBounds = Array.from(svg.querySelectorAll('path, line, rect, polyline, polygon, circle, ellipse, text, use'))
		.map((element) => getSvgElementClientBounds(element))
		.filter(Boolean)
		.reduce((combinedBounds, bounds) => combineSvgBounds(combinedBounds, bounds), null);

	if (!clientBounds) {
		return null;
	}

	return clientBoundsToSvgBounds(svg, clientBounds, inverseMatrix);
}

function getSvgElementClientBounds(element) {
	const bounds = element.getBoundingClientRect();

	if (!Number.isFinite(bounds.x) || !Number.isFinite(bounds.y) || bounds.width <= 0 || bounds.height <= 0) {
		return null;
	}

	return {
		x: bounds.x,
		y: bounds.y,
		width: bounds.width,
		height: bounds.height,
	};
}

function clientBoundsToSvgBounds(svg, bounds, inverseMatrix) {
	const points = [
		clientPointToSvgPoint(svg, bounds.x, bounds.y, inverseMatrix),
		clientPointToSvgPoint(svg, bounds.x + bounds.width, bounds.y, inverseMatrix),
		clientPointToSvgPoint(svg, bounds.x, bounds.y + bounds.height, inverseMatrix),
		clientPointToSvgPoint(svg, bounds.x + bounds.width, bounds.y + bounds.height, inverseMatrix),
	].filter(Boolean);

	if (points.length !== 4) {
		return null;
	}

	const xValues = points.map((point) => point.x);
	const yValues = points.map((point) => point.y);
	const x = Math.min(...xValues);
	const y = Math.min(...yValues);
	const right = Math.max(...xValues);
	const bottom = Math.max(...yValues);

	return {
		x,
		y,
		width: right - x,
		height: bottom - y,
	};
}

function clientPointToSvgPoint(svg, x, y, inverseMatrix) {
	if (typeof svg.createSVGPoint === 'function') {
		const point = svg.createSVGPoint();
		point.x = x;
		point.y = y;

		return point.matrixTransform(inverseMatrix);
	}

	if (typeof DOMPoint === 'function') {
		return new DOMPoint(x, y).matrixTransform(inverseMatrix);
	}

	if (
		typeof inverseMatrix.a === 'number'
		&& typeof inverseMatrix.b === 'number'
		&& typeof inverseMatrix.c === 'number'
		&& typeof inverseMatrix.d === 'number'
		&& typeof inverseMatrix.e === 'number'
		&& typeof inverseMatrix.f === 'number'
	) {
		return {
			x: (inverseMatrix.a * x) + (inverseMatrix.c * y) + inverseMatrix.e,
			y: (inverseMatrix.b * x) + (inverseMatrix.d * y) + inverseMatrix.f,
		};
	}

	return null;
}

function getSvgGeneratedBounds(svg) {
	const viewBox = svg.viewBox?.baseVal;

	if (viewBox && viewBox.width > 0 && viewBox.height > 0) {
		return {
			x: viewBox.x,
			y: viewBox.y,
			width: viewBox.width,
			height: viewBox.height,
		};
	}

	const width = parseSvgNumber(svg.getAttribute('width'));
	const height = parseSvgNumber(svg.getAttribute('height'));

	if (width > 0 && height > 0) {
		return {
			x: 0,
			y: 0,
			width,
			height,
		};
	}

	try {
		const bounds = svg.getBBox();

		if (bounds.width > 0 && bounds.height > 0) {
			return {
				x: bounds.x,
				y: bounds.y,
				width: bounds.width,
				height: bounds.height,
			};
		}
	} catch {
		// Some SVG implementations do not expose root bounds.
	}

	return null;
}

function getSvgStrokePadding(svg) {
	const strokeWidths = Array.from(svg.querySelectorAll('path, line, rect, polyline, polygon, circle, ellipse, text, use'))
		.map((element) => getSvgElementStrokeWidth(element))
		.filter((strokeWidth) => strokeWidth > 0);
	const maxStrokeWidth = strokeWidths.length ? Math.max(...strokeWidths) : 0;

	return maxStrokeWidth / 2;
}

function getSvgElementStrokeWidth(element) {
	const attributeWidth = parseSvgNumber(element.getAttribute('stroke-width'));

	if (attributeWidth > 0) {
		return attributeWidth;
	}

	const styleWidth = parseSvgNumber(element.style?.strokeWidth);

	if (styleWidth > 0) {
		return styleWidth;
	}

	const computedWidth = typeof window !== 'undefined'
		? parseSvgNumber(window.getComputedStyle(element).strokeWidth)
		: 0;

	return computedWidth;
}

function expandSvgBounds(bounds, padding) {
	return {
		x: bounds.x - padding,
		y: bounds.y - padding,
		width: bounds.width + (padding * 2),
		height: bounds.height + (padding * 2),
	};
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

function parseSvgNumber(value) {
	const match = /^([0-9]+(?:\.[0-9]+)?)/.exec(String(value || '').trim());

	return match ? Number(match[1]) : 0;
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
