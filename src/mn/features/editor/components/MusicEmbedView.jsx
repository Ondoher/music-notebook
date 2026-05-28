import React, { Component } from 'react';
import MusicNotebookContext from '../../../common/MusicNotebookContext.js';
import LocaleString from '../../../components/LocaleString.jsx';
import MusicDisplayOptions from '../../../components/MusicDisplayOptions.jsx';
import MusicEmbedDialog from '../../../components/MusicEmbedDialog.jsx';
import MusicPreview from '../../../components/MusicPreview.jsx';
import { buildKeyboardChordPayload } from '../../../shared/chord-builder.js';
import {
	getEffectiveKeyName,
	getEnharmonicKeyOption,
	getPayloadKey,
	isUsingEnharmonicKey,
	normalizeKeyName,
	normalizeStaffOctave,
} from '../../../shared/music_helper.js';
import { buildKeyboardProgressionPayload } from '../../../shared/progression-builder.js';
import { buildKeyboardScalePayload } from '../../../shared/scale-builder.js';

const EMBED_MIN_WIDTH = 240;
const EMBED_MIN_HEIGHT = 180;
const EMBED_MAX_WIDTH = 900;
const EMBED_MAX_HEIGHT = 640;
const RESIZE_KEYBOARD_STEP = 8;
const RESIZE_KEYBOARD_LARGE_STEP = 24;

/**
 * Renders a playable and editable music embed for keyboard or staff notation.
 *
 * @extends {Component<MusicEmbedViewProps, MusicEmbedViewState>}
 */
export default class MusicEmbedView extends Component {
	static contextType = MusicNotebookContext;

	/**
	 * Creates the local embed view state.
	 *
	 * @param {MusicEmbedViewProps} props - Initial component props.
	 */
	constructor(props) {
		super(props);

		this.state = {
			currentPayload: props.payload,
			dialogOpen: props.initialDialogOpen === true,
			displayKeyInput: props.payload.displayKey || getPayloadKey(props.payload) || 'C',
			displayKeyMode: props.payload.displayKeyMode || 'major',
			editMode: getInitialEditMode(props.initialEditMode),
			playbackState: 'idle',
		};
		this.playback = {
			timer: null,
			token: 0,
		};
		this.playerService = null;
	}

	/**
	 * Stops playback when the embed view is removed.
	 *
	 * @returns {void}
	 */
	componentWillUnmount() {
		this.stopPlayback();
	}

	/**
	 * Gets the selected display key for the current payload.
	 *
	 * @returns {string}
	 */
	getSelectedDisplayKey() {
		const { currentPayload, displayKeyInput } = this.state;

		return normalizeKeyName(displayKeyInput) || getPayloadKey(currentPayload) || 'C';
	}

	/**
	 * Opens the music-object edit dialog.
	 *
	 * @param {React.MouseEvent<HTMLElement>} event - Triggering click event.
	 * @returns {void}
	 */
	handleEditButtonClick = (event) => {
		event.stopPropagation();
		this.setState({ dialogOpen: true });
	};

	/**
	 * Closes the music-object edit dialog.
	 *
	 * @returns {void}
	 */
	handleDialogClose = () => {
		this.setState({ dialogOpen: false });
	};

	/**
	 * Handles playback button activation.
	 *
	 * @param {React.MouseEvent<HTMLElement>} event - Triggering click event.
	 * @returns {Promise<void>}
	 */
	handlePlaybackButtonClick = async (event) => {
		event.stopPropagation();

		if (this.state.playbackState === 'playing') {
			this.stopPlayback();
			this.setState({ playbackState: 'idle' });
			return;
		}

		if (this.state.playbackState === 'loading') {
			return;
		}

		this.setState({ playbackState: 'loading' });
		this.stopPlayback();

		const playerService = this.getPlayerService();

		if (!playerService) {
			console.warn('[MusicEmbedView] Player service is unavailable.');
			this.setState({ playbackState: 'idle' });
			return;
		}

		const token = this.playback.token + 1;
		this.playback.token = token;

		try {
			const playback = await playerService.play(this.state.currentPayload);

			if (this.playback.token !== token) {
				return;
			}

			this.setState({ playbackState: 'playing' });

			this.playback.timer = window.setTimeout(() => {
				if (this.playback.token === token) {
					this.stopPlayback();
					this.setState({ playbackState: 'idle' });
				}
			}, Math.max(playback.duration || 0, 250) + 250);
		} catch (error) {
			console.warn('[MusicEmbedView] MusicXML playback failed.', error);
			this.stopPlayback();
			this.setState({ playbackState: 'idle' });
		}
	};

	/**
	 * Stops active playback and removes playback resources.
	 *
	 * @returns {void}
	 */
	stopPlayback() {
		this.playback.token += 1;

		if (this.playback.timer) {
			window.clearTimeout(this.playback.timer);
			this.playback.timer = null;
		}

		this.getPlayerService()?.stop?.();
	}

	/**
	 * Gets the shared player service from the registry.
	 *
	 * @returns {PlayerService | null}
	 */
	getPlayerService() {
		if (!this.playerService) {
			this.playerService = this.context?.registry?.subscribe?.('player') || null;
		}

		return this.playerService;
	}

	/**
	 * Applies a valid chord builder result to the current embed.
	 *
	 * @param {MusicBuildResult} result
	 * @returns {void}
	 */
	updateChordFromBuilder = (result) => {
		if (!result.isValid || !result.payload) {
			return;
		}

		this.applyKeyboardPayload({
			...result.payload,
			displayKey: this.getSelectedDisplayKey(),
			displayKeyMode: this.state.displayKeyMode,
		});
	};

	/**
	 * Applies a valid scale builder result to the current embed.
	 *
	 * @param {MusicBuildResult} result
	 * @returns {void}
	 */
	updateScaleFromBuilder = (result) => {
		if (!result.isValid || !result.payload) {
			return;
		}

		this.applyKeyboardPayload({
			...result.payload,
			displayKey: this.getSelectedDisplayKey(),
		});
	};

	/**
	 * Applies a valid progression builder result to the current embed.
	 *
	 * @param {MusicBuildResult} result
	 * @returns {void}
	 */
	updateProgressionFromBuilder = (result) => {
		if (!result.isValid || !result.payload) {
			return;
		}

		this.applyKeyboardPayload({
			...result.payload,
			displayKey: this.getSelectedDisplayKey(),
			displayKeyMode: this.state.displayKeyMode,
		});
	};

	/**
	 * Updates the embed display mode.
	 *
	 * @param {KeyboardDisplayMode} displayMode
	 * @returns {void}
	 */
	updateDisplayMode = (displayMode) => {
		const { currentPayload } = this.state;

		this.applyKeyboardPayload({
			...currentPayload,
			displayMode,
			staffOctave: currentPayload.staffOctave ?? 4,
		});
	};

	/**
	 * Updates the staff octave used by notation preview.
	 *
	 * @param {string | number} staffOctave
	 * @returns {void}
	 */
	updateStaffOctave = (staffOctave) => {
		this.applyKeyboardPayload({
			...this.state.currentPayload,
			staffOctave: normalizeStaffOctave(staffOctave),
		});
	};

	/**
	 * Toggles whether the enharmonic display key should be used.
	 *
	 * @param {boolean} useEnharmonicKey
	 * @returns {void}
	 */
	updateUseEnharmonicKey = (useEnharmonicKey) => {
		const { currentPayload, displayKeyInput, displayKeyMode, editMode } = this.state;
		const key = normalizeKeyName(displayKeyInput) || getPayloadKey(currentPayload) || 'C';
		const effectiveKey = getEffectiveKeyName(key, {
			...currentPayload,
			useEnharmonicKey,
		});

		this.applyKeyboardPayload({
			...currentPayload,
			label: editMode === 'none' ? getDisplayKeyLabel(effectiveKey, editMode, displayKeyMode) : currentPayload.label,
			useEnharmonicKey,
		});
	};

	/**
	 * Toggles keyboard note-name labels.
	 *
	 * @param {boolean} keyboardShowNoteNames
	 * @returns {void}
	 */
	updateKeyboardShowNoteNames = (keyboardShowNoteNames) => {
		this.applyKeyboardPayload({
			...this.state.currentPayload,
			keyboardShowNoteNames,
		});
	};

	/**
	 * Updates the persisted embed dimensions.
	 *
	 * @param {number} width
	 * @param {number} height
	 * @returns {void}
	 */
	updateEmbedSize(width, height) {
		this.applyKeyboardPayload({
			...this.state.currentPayload,
			width: clampEmbedWidth(width),
			height: clampEmbedHeight(height),
		});
	}

	/**
	 * Starts pointer-driven embed resizing.
	 *
	 * @param {React.PointerEvent<HTMLElement>} event
	 * @returns {void}
	 */
	handleResizePointerDown = (event) => {
		event.preventDefault();
		event.stopPropagation();

		const { currentPayload } = this.state;
		const startX = event.clientX;
		const startY = event.clientY;
		const startWidth = currentPayload.width || 456;
		const startHeight = currentPayload.height || 266;

		try {
			event.currentTarget.setPointerCapture?.(event.pointerId);
		} catch {
			// Synthetic pointer events in tests may not have a browser-tracked pointer.
		}

		/**
		 * Applies pointer movement to the embed size.
		 *
		 * @param {PointerEvent} pointerEvent
		 * @returns {void}
		 */
		const handlePointerMove = (pointerEvent) => {
			pointerEvent.preventDefault();
			this.updateEmbedSize(
				startWidth + pointerEvent.clientX - startX,
				startHeight + pointerEvent.clientY - startY,
			);
		};

		/**
		 * Stops pointer-driven embed resizing.
		 *
		 * @returns {void}
		 */
		const handlePointerUp = () => {
			document.removeEventListener('pointermove', handlePointerMove);
			document.removeEventListener('pointerup', handlePointerUp);
		};

		document.addEventListener('pointermove', handlePointerMove);
		document.addEventListener('pointerup', handlePointerUp);
	};

	/**
	 * Applies keyboard-driven resizing from the resize handle.
	 *
	 * @param {React.KeyboardEvent<HTMLElement>} event
	 * @returns {void}
	 */
	handleResizeKeyDown = (event) => {
		const step = event.shiftKey ? RESIZE_KEYBOARD_LARGE_STEP : RESIZE_KEYBOARD_STEP;
		const horizontalStep = event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0;
		const verticalStep = event.key === 'ArrowDown' ? step : event.key === 'ArrowUp' ? -step : 0;

		if (!horizontalStep && !verticalStep) {
			return;
		}

		event.preventDefault();
		event.stopPropagation();

		this.updateEmbedSize(
			(this.state.currentPayload.width || 456) + horizontalStep,
			(this.state.currentPayload.height || 266) + verticalStep,
		);
	};

	/**
	 * Updates the display key and rebuilds chord payloads when possible.
	 *
	 * @param {string} displayKey
	 * @returns {void}
	 */
	updateDisplayKey = (displayKey) => {
		const { currentPayload, displayKeyMode, editMode } = this.state;

		const key = normalizeKeyName(displayKey);
		const effectiveKey = getEffectiveKeyName(key, currentPayload);

		this.setState({ displayKeyInput: displayKey });
		this.applyKeyboardPayload({
			...currentPayload,
			displayKey: key,
			label: key ? getDisplayKeyLabel(effectiveKey, editMode, displayKeyMode) : currentPayload.label,
			notes: editMode === 'none' ? [] : currentPayload.notes,
		});
	};

	/**
	 * Updates the display key mode and rebuilds numeric progression payloads.
	 *
	 * @param {KeyMode} keyMode
	 * @returns {void}
	 */
	updateDisplayKeyMode = (keyMode) => {
		const { currentPayload, displayKeyInput, editMode } = this.state;
		const nextKeyMode = keyMode === 'minor' ? 'minor' : 'major';

		this.setState({ displayKeyMode: nextKeyMode });

		if (editMode === 'progression') {
			const key = getEffectiveKeyName(normalizeKeyName(displayKeyInput) || getPayloadKey(currentPayload) || 'C', currentPayload);

			this.applyKeyboardPayload({
				...buildKeyboardProgressionPayload({
					key,
					keyMode: nextKeyMode,
					romanNumeral: getInitialProgressionValue(currentPayload),
				}).payload,
				displayKey: this.getSelectedDisplayKey(),
			});
			return;
		}

		if (editMode === 'none') {
			const key = normalizeKeyName(displayKeyInput) || getPayloadKey(currentPayload) || 'C';
			const effectiveKey = getEffectiveKeyName(key, currentPayload);

			this.applyKeyboardPayload({
				...currentPayload,
				displayKey: key,
				displayKeyMode: nextKeyMode,
				label: getDisplayKeyLabel(effectiveKey, 'none', nextKeyMode),
				notes: [],
			});
			return;
		}

		this.applyKeyboardPayload({
			...currentPayload,
			displayKeyMode: nextKeyMode,
		});
	};

	/**
	 * Switches the active edit mode and initializes mode-specific payload data.
	 *
	 * @param {MusicEmbedEditMode} nextEditMode
	 * @returns {void}
	 */
	updateEditMode = (nextEditMode) => {
		const { currentPayload, displayKeyInput, displayKeyMode } = this.state;

		this.setState({ editMode: nextEditMode });

		if (nextEditMode === 'scale') {
			const key = getEffectiveKeyName(normalizeKeyName(displayKeyInput) || getPayloadKey(currentPayload) || 'C', currentPayload);

			this.applyKeyboardPayload({
				...buildKeyboardScalePayload({ key }).payload,
				displayKey: this.getSelectedDisplayKey(),
			});
		}

		if (nextEditMode === 'chord') {
			this.applyKeyboardPayload(buildKeyboardChordPayload(getInitialChordValue(currentPayload)).payload);
		}

		if (nextEditMode === 'progression') {
			const key = getEffectiveKeyName(normalizeKeyName(displayKeyInput) || getPayloadKey(currentPayload) || 'C', currentPayload);

			this.applyKeyboardPayload({
				...buildKeyboardProgressionPayload({ key, keyMode: displayKeyMode }).payload,
				displayKey: this.getSelectedDisplayKey(),
			});
		}

		if (nextEditMode === 'none') {
			const key = normalizeKeyName(currentPayload.displayKey || getPayloadKey(currentPayload)) || 'C';
			const effectiveKey = getEffectiveKeyName(key, currentPayload);

			this.setState({ displayKeyInput: key });
			this.applyKeyboardPayload({
				...currentPayload,
				displayKey: key,
				label: getDisplayKeyLabel(effectiveKey, 'none', displayKeyMode),
				notes: [],
			});
		}
	};

	/**
	 * Merges and publishes an updated keyboard payload.
	 *
	 * @param {Partial<KeyboardPayload> | KeyboardPayload | null} payload
	 * @returns {void}
	 */
	applyKeyboardPayload(payload) {
		if (!payload) {
			return;
		}

		const nextPayload = {
			...this.state.currentPayload,
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

		if (!payload.progressionInput) {
			delete nextPayload.progressionInput;
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

		if (nextPayload.displayKeyMode !== 'minor') {
			delete nextPayload.displayKeyMode;
		}

		if (nextPayload.useEnharmonicKey !== false) {
			delete nextPayload.useEnharmonicKey;
		}

		if (payload.scaleId) {
			delete nextPayload.displayKeyMode;
		}

		if (Object.prototype.hasOwnProperty.call(payload, 'displayKey') && !payload.displayKey) {
			delete nextPayload.displayKey;
		}

		this.setState({ currentPayload: nextPayload });
		this.props.onPayloadChange?.(nextPayload);
	}

	/**
	 * Renders the music object toolbar.
	 *
	 * @returns {React.ReactElement}
	 */
	renderToolbar() {
		const { playbackState } = this.state;

		return (
			<div className="music-embed-toolbar" aria-label="Music object actions">
				<button
					className="music-keyboard-play-button"
					disabled={playbackState === 'loading'}
					onClick={this.handlePlaybackButtonClick}
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
					onClick={this.handleEditButtonClick}
					type="button"
				>
					<LocaleString fallback="Edit" phrase="music.controls.edit" />
				</button>
			</div>
		);
	}

	/**
	 * Renders the resize handle.
	 *
	 * @returns {React.ReactElement}
	 */
	renderResizeHandle() {
		return (
			<button
				className="music-embed-resize-handle"
				onClick={(event) => event.stopPropagation()}
				onKeyDown={this.handleResizeKeyDown}
				onPointerDown={this.handleResizePointerDown}
				type="button"
			>
				<span className="music-embed-resize-label">
					<LocaleString fallback="Resize music object" phrase="music.controls.resize_object" />
				</span>
			</button>
		);
	}

	/**
	 * Renders the music-object edit dialog.
	 *
	 * @returns {React.ReactElement}
	 */
	renderDialog() {
		const {
			currentPayload,
			dialogOpen,
			displayKeyInput,
			displayKeyMode,
			editMode,
		} = this.state;
		const selectedDisplayKey = this.getSelectedDisplayKey();
		const enharmonicDisplayKey = getEnharmonicKeyOption(selectedDisplayKey);
		const effectiveSelectedDisplayKey = getEffectiveKeyName(selectedDisplayKey, currentPayload);

		return (
			<MusicEmbedDialog
				currentPayload={currentPayload}
				displayKeyInput={displayKeyInput}
				displayKeyMode={displayKeyMode}
				editMode={editMode}
				effectiveSelectedDisplayKey={effectiveSelectedDisplayKey}
				enharmonicDisplayKey={enharmonicDisplayKey}
				initialChordValue={getInitialChordValue(currentPayload)}
				initialProgressionValue={getInitialProgressionValue(currentPayload)}
				onChordChange={this.updateChordFromBuilder}
				onClose={this.handleDialogClose}
				onDisplayKeyChange={this.updateDisplayKey}
				onDisplayKeyModeChange={this.updateDisplayKeyMode}
				onEditModeChange={this.updateEditMode}
				onProgressionChange={this.updateProgressionFromBuilder}
				onScaleChange={this.updateScaleFromBuilder}
				onUseEnharmonicKeyChange={this.updateUseEnharmonicKey}
				open={dialogOpen}
				useEnharmonicKey={isUsingEnharmonicKey(currentPayload)}
			>
				<MusicDisplayOptions
					payload={currentPayload}
					onDisplayModeChange={this.updateDisplayMode}
					onKeyboardShowNoteNamesChange={this.updateKeyboardShowNoteNames}
					onStaffOctaveChange={this.updateStaffOctave}
				/>
			</MusicEmbedDialog>
		);
	}

	/**
	 * Renders the playable and editable music embed.
	 *
	 * @returns {React.ReactElement}
	 */
	render() {
		const { currentPayload } = this.state;

		return (
			<div className="music-keyboard-embed-content">
				{this.renderToolbar()}
				<MusicPreview payload={currentPayload} />
				{this.renderResizeHandle()}
				{this.renderDialog()}
			</div>
		);
	}
}

/**
 * Clamps a proposed embed width to supported bounds.
 *
 * @param {number} width
 * @returns {number}
 */
function clampEmbedWidth(width) {
	const numericWidth = Number(width);

	if (!Number.isFinite(numericWidth)) {
		return 456;
	}

	return Math.min(Math.max(Math.round(numericWidth), EMBED_MIN_WIDTH), EMBED_MAX_WIDTH);
}

/**
 * Clamps a proposed embed height to supported bounds.
 *
 * @param {number} height
 * @returns {number}
 */
function clampEmbedHeight(height) {
	const numericHeight = Number(height);

	if (!Number.isFinite(numericHeight)) {
		return 266;
	}

	return Math.min(Math.max(Math.round(numericHeight), EMBED_MIN_HEIGHT), EMBED_MAX_HEIGHT);
}


/**
 * Gets the initial chord value for the chord editor.
 *
 * @param {KeyboardPayload} payload
 * @returns {string}
 */
function getInitialChordValue(payload) {
	if (payload.sourceChordSymbol) {
		return payload.sourceChordSymbol;
	}

	if (payload.chordId && !payload.progressionId) {
		return payload.label;
	}

	return 'C';
}

/**
 * Gets the initial progression value for the progression editor.
 *
 * @param {KeyboardPayload} payload
 * @returns {string}
 */
function getInitialProgressionValue(payload) {
	if (payload.progressionInput) {
		return payload.progressionInput;
	}

	const match = /^typed:[^:]+:(.+)$/.exec(String(payload.progressionId || ''));
	return match?.[1] || 'I';
}

/**
 * Gets the initial edit panel shown by the dialog.
 *
 * @param {MusicEmbedEditMode} editMode
 * @returns {MusicEmbedEditMode}
 */
function getInitialEditMode(editMode) {
	return editMode === 'none' || editMode === 'scale' || editMode === 'progression'
		? editMode
		: 'chord';
}

/**
 * Builds the visible label for the current display key.
 *
 * @param {string} key
 * @param {MusicEmbedEditMode} editMode
 * @param {KeyMode} [keyMode='major']
 * @returns {string}
 */
function getDisplayKeyLabel(key, editMode, keyMode = 'major') {
	if (editMode === 'none') {
		return `${key} ${keyMode === 'minor' ? 'minor' : 'major'} key`;
	}

	return `${key} major`;
}
