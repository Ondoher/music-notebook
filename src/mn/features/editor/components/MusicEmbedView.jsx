import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import { load } from '@polylith/loader';
import { OpenSheetMusicDisplay } from 'opensheetmusicdisplay';
import { MidiNumbers, Piano } from 'react-piano';
import 'react-piano/dist/styles.css';
import ChordBuilder from '../../../components/ChordBuilder.jsx';
import KeyPicker from '../../../components/KeyPicker.jsx';
import ProgressionBuilder from '../../../components/ProgressionBuilder.jsx';
import ScaleBuilder from '../../../components/ScaleBuilder.jsx';
import LocaleString from '../../../components/LocaleString.jsx';
import { buildKeyboardChordPayload } from '../../../shared/chords/chord-builder.js';
import { buildKeyboardProgressionPayload } from '../../../shared/progressions/progression-builder.js';
import { buildKeyboardScalePayload } from '../../../shared/scales/scale-builder.js';

const DEFAULT_FIRST_NOTE = 'c4';
const DEFAULT_LAST_NOTE = 'b4';
const DEFAULT_WIDTH = 420;
const EMBED_HORIZONTAL_CHROME = 0;
const EMBED_MIN_WIDTH = 240;
const EMBED_MIN_HEIGHT = 180;
const EMBED_MAX_WIDTH = 900;
const EMBED_MAX_HEIGHT = 640;
const RESIZE_KEYBOARD_STEP = 8;
const RESIZE_KEYBOARD_LARGE_STEP = 24;
const ACCIDENTAL_SYMBOLS = Object.freeze({
	sharp: '\u266f',
	flat: '\u266d',
	natural: '\u266e',
	doubleSharp: '\ud834\udd2a',
	doubleFlat: '\ud834\udd2b',
});
const PITCH_OFFSETS = Object.freeze({
	C: 0,
	D: 2,
	E: 4,
	F: 5,
	G: 7,
	A: 9,
	B: 11,
});
const NATURAL_PITCH_CLASSES = Object.freeze([0, 2, 4, 5, 7, 9, 11]);
const MAJOR_KEY_FIFTHS = Object.freeze({
	C: 0,
	G: 1,
	D: 2,
	A: 3,
	E: 4,
	B: 5,
	'F#': 6,
	'C#': 7,
	F: -1,
	Bb: -2,
	Eb: -3,
	Ab: -4,
	Db: -5,
	Gb: -6,
	Cb: -7,
});
const MINOR_KEY_FIFTHS = Object.freeze({
	A: 0,
	E: 1,
	B: 2,
	'F#': 3,
	'C#': 4,
	'G#': 5,
	'D#': 6,
	'A#': 7,
	D: -1,
	G: -2,
	C: -3,
	F: -4,
	Bb: -5,
	Eb: -6,
	Ab: -7,
});
const MODE_PARENT_MAJOR_OFFSETS = Object.freeze({
	ionian: 0,
	dorian: -2,
	phrygian: -4,
	lydian: -5,
	mixolydian: -7,
	aeolian: -9,
	locrian: -11,
});
const MODE_PARENT_NOTE_INDEX = Object.freeze({
	ionian: 0,
	dorian: 6,
	phrygian: 5,
	lydian: 4,
	mixolydian: 3,
	aeolian: 2,
	locrian: 1,
});

export default function MusicEmbedView({ initialDialogOpen = false, payload, onPayloadChange }) {
	const [currentPayload, setCurrentPayload] = useState(payload);
	const [dialogOpen, setDialogOpen] = useState(initialDialogOpen);
	const [displayKeyInput, setDisplayKeyInput] = useState(payload.displayKey || getPayloadKey(payload) || 'C');
	const [editMode, setEditMode] = useState('chord');
	const [playbackState, setPlaybackState] = useState('idle');
	const playbackRef = useRef({
		container: null,
		player: null,
		timer: null,
		token: 0,
	});
	const selectedDisplayKey = normalizeKeyName(displayKeyInput) || getPayloadKey(currentPayload) || 'C';
	const enharmonicDisplayKey = getEnharmonicKeyOption(selectedDisplayKey);
	const effectiveSelectedDisplayKey = getEffectiveKeyName(selectedDisplayKey, currentPayload);

	useEffect(() => () => {
		stopPlayback();
	}, []);

	return (
		<div className="music-keyboard-embed-content">
			<div className="music-embed-toolbar" aria-label="Music object actions">
				<button
					className="music-keyboard-play-button"
					disabled={playbackState === 'loading'}
					onClick={handlePlaybackButtonClick}
					type="button"
				>
					{playbackState === 'playing' ? (
						<LocaleString fallback="Stop" phrase="music.controls.stop" />
					) : (
						<LocaleString fallback="Play" phrase="music.controls.play" />
					)}
				</button>
				<button
					className="music-keyboard-edit-button"
					onClick={(event) => {
						event.stopPropagation();
						setDialogOpen(true);
					}}
					type="button"
				>
					<LocaleString fallback="Edit" phrase="music.controls.edit" />
				</button>
			</div>
			<MusicPreview payload={currentPayload} />
			<button
				className="music-embed-resize-handle"
				onClick={(event) => event.stopPropagation()}
				onKeyDown={handleResizeKeyDown}
				onPointerDown={handleResizePointerDown}
				type="button"
			>
				<span className="music-embed-resize-label">
					<LocaleString fallback="Resize music object" phrase="music.controls.resize_object" />
				</span>
			</button>
			<Dialog
				className="music-keyboard-dialog"
				fullWidth
				maxWidth="sm"
				onClose={() => setDialogOpen(false)}
				open={dialogOpen}
			>
				<DialogTitle>{currentPayload.label}</DialogTitle>
				<DialogContent>
					<div className="music-keyboard-editor-dialog">
						<label className="music-keyboard-edit-mode">
							<span><LocaleString fallback="Edit mode" phrase="music.controls.edit_mode" /></span>
							<select
								onChange={(event) => updateEditMode(event.target.value)}
								onInput={(event) => updateEditMode(event.target.value)}
								value={editMode}
							>
								<option value="none">
									<LocaleString fallback="None" phrase="music.edit_mode.none" />
								</option>
								<option value="chord">
									<LocaleString fallback="Chord" phrase="music.edit_mode.chord" />
								</option>
								<option value="scale">
									<LocaleString fallback="Scale" phrase="music.edit_mode.scale" />
								</option>
								<option value="progression">
									<LocaleString fallback="Chord degree" phrase="music.edit_mode.chord_degree" />
								</option>
							</select>
						</label>
						<div className={enharmonicDisplayKey ? 'music-key-control-row' : 'music-key-control-row music-key-control-row-single'}>
							<KeyPicker
								className="music-display-key-field"
								label={{ fallback: 'Key', phrase: 'music.controls.key' }}
								onKeyChange={updateDisplayKey}
								value={displayKeyInput}
							/>
							{enharmonicDisplayKey ? (
								<label className="music-key-enharmonic-option music-display-options-field-checkbox">
									<input
										checked={isUsingEnharmonicKey(currentPayload)}
										onChange={(event) => updateUseEnharmonicKey(event.target.checked)}
										type="checkbox"
									/>
									<span>
										<LocaleString
											fallback={`Use ${enharmonicDisplayKey}`}
											phrase={{
												phrase: 'music.controls.use_enharmonic_key',
												replacements: { key: enharmonicDisplayKey },
											}}
										/>
									</span>
								</label>
							) : null}
						</div>
						{editMode === 'chord' ? (
							<ChordBuilder
								initialArpeggiate={currentPayload.arpeggiate === true}
								initialInversion={currentPayload.inversion || 0}
								initialValue={getInitialChordValue(currentPayload)}
								label={{ fallback: 'Chord', phrase: 'music.edit_mode.chord' }}
								onChordChange={updateChordFromBuilder}
							/>
						) : null}
						{editMode === 'scale' ? (
							<ScaleBuilder
								initialKey={effectiveSelectedDisplayKey}
								label={{ fallback: 'Scale', phrase: 'music.edit_mode.scale' }}
								onScaleChange={updateScaleFromBuilder}
								selectedKey={effectiveSelectedDisplayKey}
								showKey={false}
							/>
						) : null}
						{editMode === 'progression' ? (
							<ProgressionBuilder
								initialArpeggiate={currentPayload.arpeggiate === true}
								initialKey={effectiveSelectedDisplayKey}
								label={{ fallback: 'Chord degree', phrase: 'music.edit_mode.chord_degree' }}
								onProgressionChange={updateProgressionFromBuilder}
								selectedKey={effectiveSelectedDisplayKey}
								showKey={false}
							/>
						) : null}
						<MusicPreview payload={currentPayload} />
						<DisplayOptions
							payload={currentPayload}
							onDisplayModeChange={updateDisplayMode}
							onKeyboardShowNoteNamesChange={updateKeyboardShowNoteNames}
							onStaffOctaveChange={updateStaffOctave}
						/>
					</div>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setDialogOpen(false)}>
						<LocaleString fallback="Done" phrase="music.controls.done" />
					</Button>
				</DialogActions>
			</Dialog>
		</div>
	);

	async function handlePlaybackButtonClick(event) {
		event.stopPropagation();

		if (playbackState === 'playing') {
			stopPlayback();
			setPlaybackState('idle');
			return;
		}

		if (playbackState === 'loading') {
			return;
		}

		setPlaybackState('loading');
		stopPlayback();

		const token = playbackRef.current.token + 1;
		playbackRef.current.token = token;

		try {
			const playback = await createMusicXmlPlayback(currentPayload);

			if (playbackRef.current.token !== token) {
				destroyMusicXmlPlayback(playback);
				return;
			}

			playbackRef.current.container = playback.container;
			playbackRef.current.player = playback.player;
			playback.player.play();
			setPlaybackState('playing');

			playbackRef.current.timer = window.setTimeout(() => {
				if (playbackRef.current.token === token) {
					stopPlayback();
					setPlaybackState('idle');
				}
			}, Math.max(playback.player.duration || 0, 250) + 250);
		} catch (error) {
			console.warn('[MusicEmbedView] MusicXML playback failed.', error);
			stopPlayback();
			setPlaybackState('idle');
		}
	}

	function stopPlayback() {
		playbackRef.current.token += 1;

		if (playbackRef.current.timer) {
			window.clearTimeout(playbackRef.current.timer);
			playbackRef.current.timer = null;
		}

		if (playbackRef.current.player) {
			destroyMusicXmlPlayback({
				container: playbackRef.current.container,
				player: playbackRef.current.player,
			});
			playbackRef.current.player = null;
		}

		playbackRef.current.container = null;
	}

	function updateChordFromBuilder(result) {
		if (!result.isValid || !result.payload) {
			return;
		}

		applyKeyboardPayload({
			...result.payload,
			displayKey: selectedDisplayKey,
		});
	}

	function updateScaleFromBuilder(result) {
		if (!result.isValid || !result.payload) {
			return;
		}

		applyKeyboardPayload({
			...result.payload,
			displayKey: selectedDisplayKey,
		});
	}

	function updateProgressionFromBuilder(result) {
		if (!result.isValid || !result.payload) {
			return;
		}

		applyKeyboardPayload({
			...result.payload,
			displayKey: selectedDisplayKey,
		});
	}

	function updateDisplayMode(displayMode) {
		applyKeyboardPayload({
			...currentPayload,
			displayMode,
			staffOctave: currentPayload.staffOctave ?? 4,
		});
	}

	function updateStaffOctave(staffOctave) {
		applyKeyboardPayload({
			...currentPayload,
			staffOctave: normalizeStaffOctave(staffOctave),
		});
	}

	function updateUseEnharmonicKey(useEnharmonicKey) {
		const key = normalizeKeyName(displayKeyInput) || getPayloadKey(currentPayload) || 'C';
		const effectiveKey = getEffectiveKeyName(key, {
			...currentPayload,
			useEnharmonicKey,
		});

		applyKeyboardPayload({
			...currentPayload,
			label: editMode === 'none' ? getDisplayKeyLabel(effectiveKey, editMode) : currentPayload.label,
			useEnharmonicKey,
		});
	}

	function updateKeyboardShowNoteNames(keyboardShowNoteNames) {
		applyKeyboardPayload({
			...currentPayload,
			keyboardShowNoteNames,
		});
	}

	function updateEmbedSize(width, height) {
		applyKeyboardPayload({
			...currentPayload,
			width: clampEmbedWidth(width),
			height: clampEmbedHeight(height),
		});
	}

	function handleResizePointerDown(event) {
		event.preventDefault();
		event.stopPropagation();

		const startX = event.clientX;
		const startY = event.clientY;
		const startWidth = currentPayload.width || 456;
		const startHeight = currentPayload.height || 266;

		try {
			event.currentTarget.setPointerCapture?.(event.pointerId);
		} catch {
			// Synthetic pointer events in tests may not have a browser-tracked pointer.
		}

		function handlePointerMove(pointerEvent) {
			pointerEvent.preventDefault();
			updateEmbedSize(
				startWidth + pointerEvent.clientX - startX,
				startHeight + pointerEvent.clientY - startY,
			);
		}

		function handlePointerUp() {
			document.removeEventListener('pointermove', handlePointerMove);
			document.removeEventListener('pointerup', handlePointerUp);
		}

		document.addEventListener('pointermove', handlePointerMove);
		document.addEventListener('pointerup', handlePointerUp);
	}

	function handleResizeKeyDown(event) {
		const step = event.shiftKey ? RESIZE_KEYBOARD_LARGE_STEP : RESIZE_KEYBOARD_STEP;
		const horizontalStep = event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0;
		const verticalStep = event.key === 'ArrowDown' ? step : event.key === 'ArrowUp' ? -step : 0;

		if (!horizontalStep && !verticalStep) {
			return;
		}

		event.preventDefault();
		event.stopPropagation();

		updateEmbedSize(
			(currentPayload.width || 456) + horizontalStep,
			(currentPayload.height || 266) + verticalStep,
		);
	}

	function updateDisplayKey(displayKey) {
		setDisplayKeyInput(displayKey);

		const key = normalizeKeyName(displayKey);
		const effectiveKey = getEffectiveKeyName(key, currentPayload);

		applyKeyboardPayload({
			...currentPayload,
			displayKey: key,
			label: key ? getDisplayKeyLabel(effectiveKey, editMode) : currentPayload.label,
			notes: editMode === 'none' ? [] : currentPayload.notes,
		});
	}

	function updateEditMode(nextEditMode) {
		setEditMode(nextEditMode);

		if (nextEditMode === 'scale') {
			const key = getEffectiveKeyName(normalizeKeyName(displayKeyInput) || getPayloadKey(currentPayload) || 'C', currentPayload);

			applyKeyboardPayload({
				...buildKeyboardScalePayload({ key }).payload,
				displayKey: selectedDisplayKey,
			});
		}

		if (nextEditMode === 'chord') {
			applyKeyboardPayload(buildKeyboardChordPayload(getInitialChordValue(currentPayload)).payload);
		}

		if (nextEditMode === 'progression') {
			const key = getEffectiveKeyName(normalizeKeyName(displayKeyInput) || getPayloadKey(currentPayload) || 'C', currentPayload);

			applyKeyboardPayload({
				...buildKeyboardProgressionPayload({ key }).payload,
				displayKey: selectedDisplayKey,
			});
		}

		if (nextEditMode === 'none') {
			const key = normalizeKeyName(currentPayload.displayKey || getPayloadKey(currentPayload)) || 'C';
			const effectiveKey = getEffectiveKeyName(key, currentPayload);

			setDisplayKeyInput(key);
			applyKeyboardPayload({
				...currentPayload,
				displayKey: key,
				label: getDisplayKeyLabel(effectiveKey, 'none'),
				notes: [],
			});
		}
	}

	function applyKeyboardPayload(payload) {
		if (!payload) {
			return;
		}

		const nextPayload = {
			...currentPayload,
			...payload,
			notes: [...payload.notes],
		};

		if (!payload.chordId) {
			delete nextPayload.chordId;
		}

		if (!payload.scaleId) {
			delete nextPayload.scaleId;
		}

		if (!payload.progressionId) {
			delete nextPayload.progressionId;
		}

		if (!payload.sourceChordSymbol) {
			delete nextPayload.sourceChordSymbol;
		}

		if (!payload.rootNote) {
			delete nextPayload.rootNote;
		}

		if (!Number.isInteger(payload.inversion)) {
			delete nextPayload.inversion;
		}

		if (payload.arpeggiate !== true) {
			delete nextPayload.arpeggiate;
		}

		if (!payload.highlightedNotes) {
			delete nextPayload.highlightedNotes;
		}

		if (payload.keyboardShowNoteNames !== false) {
			delete nextPayload.keyboardShowNoteNames;
		}

		if (nextPayload.useEnharmonicKey !== false) {
			delete nextPayload.useEnharmonicKey;
		}

		if (Object.prototype.hasOwnProperty.call(payload, 'displayKey') && !payload.displayKey) {
			delete nextPayload.displayKey;
		}

		setCurrentPayload(nextPayload);
		onPayloadChange?.(nextPayload);
	}
}

function clampEmbedWidth(width) {
	const numericWidth = Number(width);

	if (!Number.isFinite(numericWidth)) {
		return 456;
	}

	return Math.min(Math.max(Math.round(numericWidth), EMBED_MIN_WIDTH), EMBED_MAX_WIDTH);
}

function clampEmbedHeight(height) {
	const numericHeight = Number(height);

	if (!Number.isFinite(numericHeight)) {
		return 266;
	}

	return Math.min(Math.max(Math.round(numericHeight), EMBED_MIN_HEIGHT), EMBED_MAX_HEIGHT);
}

function MusicPreview({ payload }) {
	return payload.displayMode === 'staff'
		? <StaffPreview payload={payload} />
		: <KeyboardPreview payload={payload} />;
}

function DisplayOptions({
	payload,
	onDisplayModeChange,
	onKeyboardShowNoteNamesChange,
	onStaffOctaveChange,
}) {
	const displayMode = payload.displayMode || 'keyboard';

	return (
		<div className="music-display-options">
			<label className="music-display-options-field">
				<span><LocaleString fallback="Display" phrase="music.controls.display" /></span>
				<select
					onChange={(event) => onDisplayModeChange(event.target.value)}
					onInput={(event) => onDisplayModeChange(event.target.value)}
					value={displayMode}
				>
					<option value="keyboard">
						<LocaleString fallback="Keyboard" phrase="music.display.keyboard" />
					</option>
					<option value="staff">
						<LocaleString fallback="Staff" phrase="music.display.staff" />
					</option>
				</select>
			</label>
			{displayMode === 'staff' ? (
				<label className="music-display-options-field">
					<span><LocaleString fallback="Octave" phrase="music.controls.octave" /></span>
					<input
						max="8"
						min="0"
						onChange={(event) => onStaffOctaveChange(event.target.value)}
						type="number"
						value={payload.staffOctave ?? 4}
					/>
				</label>
			) : null}
			{displayMode === 'keyboard' ? (
				<label className="music-display-options-field music-display-options-field-checkbox">
					<input
						checked={payload.keyboardShowNoteNames !== false}
						onChange={(event) => onKeyboardShowNoteNamesChange(event.target.checked)}
						type="checkbox"
					/>
					<span><LocaleString fallback="Show note names" phrase="music.controls.show_note_names" /></span>
				</label>
			) : null}
		</div>
	);
}

async function createMusicXmlPlayback(payload) {
	const staffNotes = getStaffNotes(payload.highlightedNotes || payload.notes, payload.staffOctave ?? 4, payload);
	const musicXml = buildMusicXml(payload, staffNotes);
	const container = document.createElement('div');

	container.className = 'music-xml-playback-host';
	document.body.appendChild(container);

	try {
		const { createMusicXmlPlayer } = await load('musicxml-player');
		const player = await createMusicXmlPlayer({
			container,
			followCursor: false,
			horizontal: true,
			musicXml,
			renderer: createNoopMusicXmlRenderer(),
			repeat: 0,
		});

		return { container, player };
	} catch (error) {
		container.remove();
		throw error;
	}
}

function destroyMusicXmlPlayback(playback) {
	try {
		playback?.player?.destroy?.();
	} finally {
		playback?.container?.remove?.();
	}
}

function createNoopMusicXmlRenderer() {
	return {
		destroy() {},
		initialize() {
			return Promise.resolve();
		},
		moveTo() {},
		onEvent() {},
		onResize() {},
		version: 'music-notebook-noop-renderer',
	};
}

function StaffPreview({ payload }) {
	const containerRef = useRef(null);
	const staffNotes = useMemo(
		() => getStaffNotes(payload.highlightedNotes || payload.notes, payload.staffOctave ?? 4, payload),
		[payload.highlightedNotes, payload.notes, payload.staffOctave, payload],
	);
	const musicXml = useMemo(
		() => buildMusicXml(payload, staffNotes),
		[payload, staffNotes],
	);

	useEffect(() => {
		const container = containerRef.current;
		let cancelled = false;

		if (!container) {
			return undefined;
		}

		container.replaceChildren();

		const osmd = new OpenSheetMusicDisplay(container, {
			autoResize: false,
			backend: 'svg',
			drawPartNames: false,
			drawTitle: false,
			drawTimeSignatures: false,
			renderSingleHorizontalStaffline: false,
		});

		osmd.load(musicXml).then(() => {
			if (cancelled) {
				return;
			}

			osmd.zoom = 1.35;
			osmd.render();
			fitOsmdSvgToContent(container);
		}).catch(() => {
			if (!cancelled) {
				container.textContent = '';
			}
		});

		return () => {
			cancelled = true;
			container.replaceChildren();
		};
	}, [musicXml]);

	return (
		<div className="music-staff-preview" aria-hidden="true">
			<div ref={containerRef} className="music-staff-osmd" />
		</div>
	);
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

export function buildMusicXml(payload, staffNotes) {
	const sequentialNotes = !isChordPayload(payload) || payload.arpeggiate === true;
	const clef = getStaffClef(staffNotes);
	const keyFifths = getPayloadKeyFifths(payload);
	const notesXml = staffNotes.map((note, index) => buildMusicXmlNote(note, {
		keyFifths,
		isChordTone: !sequentialNotes && index > 0,
		sequentialNotes,
	})).join('\n');

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
      ${notesXml}
    </measure>
  </part>
</score-partwise>`;
}

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

function getInitialChordValue(payload) {
	if (payload.sourceChordSymbol) {
		return payload.sourceChordSymbol;
	}

	if (payload.chordId && !payload.progressionId) {
		return payload.label;
	}

	return 'Cdim7';
}

function getInitialScaleKey(payload) {
	const root = payload.rootNote || payload.notes?.[0] || 'C4';
	const match = /^([A-Ga-g](?:#|b)?)/.exec(String(root));

	if (!match) {
		return 'C';
	}

	return `${match[1].charAt(0).toUpperCase()}${match[1].slice(1)}`;
}

function getDisplayKeyLabel(key, editMode) {
	return editMode === 'none' ? `${key} key` : `${key} major`;
}

function isChordPayload(payload) {
	return (payload.notes?.length || 0) > 1
		&& (
			Boolean(payload.chordId || payload.progressionId || payload.sourceChordSymbol)
			|| !payload.scaleId
		);
}

function normalizeStaffOctave(staffOctave) {
	const octave = Number(staffOctave);

	if (!Number.isInteger(octave)) {
		return 4;
	}

	return Math.min(Math.max(octave, 0), 8);
}

export function getStaffNotes(notes = [], staffOctave = 4, payload = {}) {
	const octave = normalizeStaffOctave(staffOctave);
	const staffKeyLabels = getStaffKeyLabelsByPitchClass(payload);

	return notes
		.map((note) => {
			const pitch = getNotePitch(note);
			const renderedNote = pitch ? `${pitch}${getNoteAccidental(note)}${octave}` : note;
			const originalMidiNumber = noteToMidi(renderedNote);
			const staffRenderedNote = getStaffRenderedNote(originalMidiNumber, staffKeyLabels, octave) || renderedNote;
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

function getNotePitch(note) {
	const match = /^([A-Ga-g])/.exec(String(note || ''));
	return match ? match[1].toUpperCase() : '';
}

function getNoteAccidental(note) {
	const match = /^[A-Ga-g](#{1,2}|b{1,2}|x|n|\u266f|\u266d|\u266e|\ud834\udd2a|\ud834\udd2b)?/u.exec(String(note || ''));
	return match?.[1] || '';
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

function getAccidentalSymbol(note) {
	const match = /^[A-Ga-g](#{1,2}|b{1,2}|x|n|\u266f|\u266d|\u266e|\ud834\udd2a|\ud834\udd2b)?/u.exec(String(note || ''));

	switch (match?.[1]) {
		case '#':
		case ACCIDENTAL_SYMBOLS.sharp:
			return ACCIDENTAL_SYMBOLS.sharp;
		case '##':
		case 'x':
		case ACCIDENTAL_SYMBOLS.doubleSharp:
			return ACCIDENTAL_SYMBOLS.doubleSharp;
		case 'b':
		case ACCIDENTAL_SYMBOLS.flat:
			return ACCIDENTAL_SYMBOLS.flat;
		case 'bb':
		case ACCIDENTAL_SYMBOLS.doubleFlat:
			return ACCIDENTAL_SYMBOLS.doubleFlat;
		case 'n':
		case ACCIDENTAL_SYMBOLS.natural:
			return ACCIDENTAL_SYMBOLS.natural;
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

export function getPayloadKeyFifths(payload) {
	const signature = getEffectiveStaffKeySignature(payload);

	if (!signature.key) {
		return 0;
	}

	return signature.table[signature.key] ?? 0;
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

	if (payload.scaleId && /\bminor\b/i.test(payload.label || '')) {
		return { key, table: MINOR_KEY_FIFTHS };
	}

	const modeMatch = /\b(ionian|dorian|phrygian|lydian|mixolydian|aeolian|locrian)\b/i.exec(payload.label || '');

	if (modeMatch) {
		const mode = modeMatch[1].toLowerCase();
		const parentKey = getModeParentMajorKey(payload, mode)
			|| transposePitchClass(key, MODE_PARENT_MAJOR_OFFSETS[mode]);
		return { key: parentKey, table: MAJOR_KEY_FIFTHS };
	}

	return { key, table: MAJOR_KEY_FIFTHS };
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

function getEnharmonicKeyOption(key) {
	const normalizedKey = normalizeKeyName(key);

	if (!normalizedKey || MAJOR_KEY_FIFTHS[normalizedKey] !== undefined) {
		return '';
	}

	return getEnharmonicKeyInSignatureTable(normalizedKey, MAJOR_KEY_FIFTHS);
}

function getEffectivePayloadKey(payload) {
	return getEffectiveKeyName(getPayloadKey(payload), payload);
}

function getEffectiveKeyName(key, payload) {
	const normalizedKey = normalizeKeyName(key);
	const enharmonicKey = getEnharmonicKeyOption(normalizedKey);

	return enharmonicKey && isUsingEnharmonicKey(payload) ? enharmonicKey : normalizedKey;
}

function isUsingEnharmonicKey(payload) {
	return payload.useEnharmonicKey !== false;
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

function getPayloadKey(payload) {
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

function normalizeKeyName(key) {
	if (!key) {
		return '';
	}

	return `${key.charAt(0).toUpperCase()}${key.slice(1)}`;
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

function KeyboardPreview({ payload }) {
	const pianoRef = useRef(null);
	const displayKey = getEffectivePayloadKey(payload);
	const noteMidiNumbers = useMemo(
		() => notesToMidi(payload.highlightedNotes || payload.notes),
		[payload.highlightedNotes, payload.notes],
	);
	const noteRange = useMemo(
		() => getKeyboardNoteRange(noteMidiNumbers, displayKey, payload.staffOctave),
		[noteMidiNumbers, displayKey, payload.staffOctave],
	);
	const firstNote = noteRange.first;
	const lastNote = noteRange.last;
	const highlightedNotes = useMemo(
		() => noteMidiNumbers,
		[noteMidiNumbers],
	);
	const spelledLabelsByMidi = useMemo(
		() => getSpelledLabelsByMidi(payload.highlightedNotes || payload.notes),
		[payload.highlightedNotes, payload.notes],
	);
	const keyLabelsByMidi = useMemo(
		() => getKeyLabelsByMidi(firstNote, lastNote, displayKey),
		[firstNote, lastNote, displayKey],
	);
	const rootNote = noteToMidi(payload.rootNote || payload.notes[0]);
	const hasHighlights = highlightedNotes.length > 0;
	const showNoteNames = payload.keyboardShowNoteNames !== false;
	const renderNoteLabel = useCallback(
		(noteProps) => renderKeyboardNoteLabel(noteProps, spelledLabelsByMidi, keyLabelsByMidi, showNoteNames),
		[spelledLabelsByMidi, keyLabelsByMidi, showNoteNames],
	);

	useLayoutEffect(() => {
		const piano = pianoRef.current;

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

			if (highlightedNotes.includes(midiNumber)) {
				key.classList.add('music-keyboard-key-highlighted');
			}

			if (midiNumber === rootNote) {
				key.classList.add('music-keyboard-key-root');
			}
		});
	}, [highlightedNotes, rootNote]);

	return (
			<div
				ref={pianoRef}
				className={hasHighlights
					? 'music-keyboard-embed-piano music-keyboard-embed-has-highlights'
					: 'music-keyboard-embed-piano'}
				aria-hidden="true"
			>
				<Piano
					activeNotes={[]}
					keyWidthToHeight={0.28}
					noteRange={{ first: firstNote, last: lastNote }}
					playNote={() => {}}
					renderNoteLabel={renderNoteLabel}
					stopNote={() => {}}
					width={getPreviewWidth(payload.width)}
				/>
			</div>
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

function getMajorKeyLabelsByPitchClass(displayKey = '') {
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

function noteToMidi(note) {
	const parsedMidiNumber = parseNoteToMidi(note);

	if (parsedMidiNumber !== null) {
		return parsedMidiNumber;
	}

	try {
		return MidiNumbers.fromNote(String(note || '').toLowerCase());
	} catch {
		return null;
	}
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
