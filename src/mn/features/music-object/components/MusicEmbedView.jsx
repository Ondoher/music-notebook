import React, { Component, createRef } from 'react';
import ErrorOutlinedIcon from '@mui/icons-material/ErrorOutlined';
import IconButton from '@mui/material/IconButton';
import MusicNotebookContext from '../../../common/MusicNotebookContext.js';
import LocaleString from '../../../components/LocaleString.jsx';
import LocalizedTooltip from '../../../components/LocalizedTooltip.jsx';
import MusicPreview from '../../../components/MusicPreview.jsx';
import MusicDisplayOptions from './MusicDisplayOptions.jsx';
import MusicEmbedDialog from './MusicEmbedDialog.jsx';
import MusicEmbedFormatDialog, { normalizeMusicEmbedFormat } from './MusicEmbedFormatDialog.jsx';
import { buildKeyboardChordPayload } from '../../../shared/chord-builder.js';
import {
	clampMusicEmbedScale,
	clampMusicEmbedWidth,
	getKeyboardEmbedHeight,
	MUSIC_EMBED_MIN_WIDTH,
	normalizeMusicEmbedSizing,
} from '../../../shared/music-object-layout.js';
import { normalizeKeyQuality } from '../../../shared/key-qualities.js';
import {
	getEffectiveKeyName,
	getEnharmonicKeyOption,
	getPayloadKey,
	isUsingEnharmonicKey,
	normalizeKeyName,
	normalizeStaffOctave,
} from '../../../shared/music_helper.js';
import { buildKeyboardScalePayload } from '../../../shared/scale-builder.js';

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

		const initialState = {
			currentPayload: props.payload,
			dialogOpen: props.initialDialogOpen === true,
			displayKeyInput: props.payload.displayKey || getPayloadKey(props.payload) || 'C',
			displayKeyMode: getInitialDisplayKeyMode(props.payload),
			editMode: getInitialEditMode(props.initialEditMode, props.payload),
			formatDialogOpen: false,
			playbackState: 'idle',
			selected: false,
			sessionUnavailable: false,
			actions: getDefaultEmbedActions('idle', props.payload),
			fitPreviewWidth: false,
		};

		this.state = initialState;
		this.dialogSnapshot = props.initialDialogOpen === true ? cloneDialogSnapshot(initialState) : null;
		this.formatDialogSnapshot = null;
		this.removeOnCancel = props.initialDialogOpen === true;
		this.embedSession = null;
		this.embedSessionListener = null;
		this.sessionUnavailableReported = false;
		this.contentRef = createRef();
		this.lastAppliedPayload = props.payload;
		this.resizeDraftActive = false;
		this.tableCellNode = null;
	}

	/**
	 * Attaches this presentation component to the music-object controller session.
	 *
	 * @returns {void}
	 */
	componentDidMount() {
		this.attachEmbedSession();
		this.attachEmbedSelectionListener();
		this.syncEmbedNodeSize();
	}

	/**
	 * Keeps the outer Quill blot size aligned with draft presentation state.
	 *
	 * @returns {void}
	 */
	componentDidUpdate() {
		this.syncEmbedNodeSize();
	}

	/**
	 * Stops playback when the embed view is removed.
	 *
	 * @returns {void}
	 */
	componentWillUnmount() {
		this.clearTableCellFitClass();
		this.detachEmbedSession();
		this.detachEmbedSelectionListener();
	}

	/**
	 * Attaches a controller-owned embed session when one is available.
	 *
	 * @returns {void}
	 */
	attachEmbedSession() {
		const registry = this.context?.registry || null;
		const controller = registry?.subscribe?.('music-object-controller');

		if (!controller?.attachEmbed) {
			if (registry) {
				this.reportSessionUnavailable();
				this.setState({
					actions: [],
					sessionUnavailable: true,
				});
			}

			return;
		}

		this.embedSession = controller.attachEmbed({
			getValue: () => this.state.currentPayload,
			id: this.state.currentPayload.id,
			initialDialogOpen: this.props.initialDialogOpen === true,
			onOpenFormatDialog: this.prepareFormatDialogOpen,
			onOpenDialog: this.prepareDialogOpen,
			type: 'music-object',
		});
		this.embedSessionListener = this.embedSession.listen?.('changed', (sessionState) => {
			this.setState({
				actions: sessionState.actions || getDefaultEmbedActions(sessionState.playbackState, this.state.currentPayload),
				dialogOpen: sessionState.dialogOpen === true,
				playbackState: sessionState.playbackState || 'idle',
				selected: sessionState.selected === true,
			});
		});

		const sessionState = this.embedSession.getState?.();

		if (sessionState) {
			this.setState({
				actions: sessionState.actions || getDefaultEmbedActions(sessionState.playbackState, this.state.currentPayload),
				dialogOpen: sessionState.dialogOpen === true,
				playbackState: sessionState.playbackState || 'idle',
				selected: sessionState.selected === true,
			});
		}
	}

	reportSessionUnavailable() {
		if (this.sessionUnavailableReported) {
			return;
		}

		this.sessionUnavailableReported = true;
		console.error('MusicEmbedView could not attach music-object-controller session. Rendering preview without interactive controls.');
	}

	/**
	 * Listens for transient selection state reported by the Quill editor page.
	 *
	 * @returns {void}
	 */
	attachEmbedSelectionListener() {
		const node = this.contentRef.current?.closest?.('.music-keyboard-embed');

		if (!node) {
			return;
		}

		this.embedSelectionNode = node;
		node.addEventListener('music-keyboard-selection-change', this.handleEmbedSelectionChange);
	}

	/**
	 * Stops listening for editor selection state.
	 *
	 * @returns {void}
	 */
	detachEmbedSelectionListener() {
		if (this.embedSelectionNode) {
			this.embedSelectionNode.removeEventListener('music-keyboard-selection-change', this.handleEmbedSelectionChange);
		}

		this.embedSelectionNode = null;
	}

	/**
	 * Detaches from the controller-owned embed session.
	 *
	 * @returns {void}
	 */
	detachEmbedSession() {
		if (this.embedSession?.unlisten && this.embedSessionListener) {
			this.embedSession.unlisten('changed', this.embedSessionListener);
		}

		this.embedSession?.detach?.();
		this.embedSession = null;
		this.embedSessionListener = null;
	}

	/**
	 * Applies draft dimensions to the enclosing Quill blot without committing the payload.
	 *
	 * @returns {void}
	 */
	syncEmbedNodeSize() {
		const node = this.contentRef.current?.closest?.('.music-keyboard-embed');
		const { currentPayload } = this.state;

		if (!node || !currentPayload) {
			return;
		}

		const fitPreviewWidth = isInsideTableCell(node);
		const fittedPayload = fitPreviewWidth
			? this.getTableCellFittedPayload(node, currentPayload)
			: currentPayload;

		applyMusicEmbedSizingStyles(node, fittedPayload);
		applyEmbedFormatClassNames(node, fittedPayload.format);
		node.classList.toggle('music-keyboard-embed--fit-table-cell', fitPreviewWidth);
		this.syncTableCellFitClass(node, fittedPayload);

		if (fitPreviewWidth !== this.state.fitPreviewWidth) {
			this.setState({ fitPreviewWidth });
		}
	}

	/**
	 * Gets a transient keyboard payload sized to the owning table cell.
	 *
	 * @param {HTMLElement} node
	 * @param {KeyboardPayload} payload
	 * @returns {KeyboardPayload}
	 */
	getTableCellFittedPayload(node, payload) {
		if (payload.displayMode === 'staff') {
			return payload;
		}

		const cell = getOwningTableCell(node);
		const cellRect = cell?.getBoundingClientRect?.();
		const width = Math.floor(Number(cellRect?.width || cell?.clientWidth || 0));

		if (!Number.isFinite(width) || width <= 0) {
			return payload;
		}

		return {
			...payload,
			height: getKeyboardEmbedHeight(payload, width),
			scale: 1,
			width,
		};
	}

	/**
	 * Marks keyboard-owning table cells so TableUp gives the cell a fillable width.
	 *
	 * @param {HTMLElement} node
	 * @param {KeyboardPayload} payload
	 * @returns {void}
	 */
	syncTableCellFitClass(node, payload) {
		const tableCellNode = payload.displayMode === 'staff'
			? null
			: getOwningTableCell(node);

		if (tableCellNode === this.tableCellNode) {
			return;
		}

		this.clearTableCellFitClass();
		this.tableCellNode = tableCellNode;
		this.tableCellNode?.classList.add('music-keyboard-embed-cell--fit-width');
	}

	/**
	 * Clears the keyboard table-cell width class.
	 *
	 * @returns {void}
	 */
	clearTableCellFitClass() {
		this.tableCellNode?.classList.remove('music-keyboard-embed-cell--fit-width');
		this.tableCellNode = null;
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

		if (this.embedSession?.performAction?.('edit')) {
			return;
		}

		this.prepareDialogOpen();
		this.setState({ dialogOpen: true });
	};

	/**
	 * Opens the music-object format dialog.
	 *
	 * @returns {void}
	 */
	prepareFormatDialogOpen = () => {
		this.formatDialogSnapshot = cloneKeyboardPayload(this.state.currentPayload);
		this.setState({ formatDialogOpen: true });
	};

	/**
	 * Captures rollback state before a controller opens the edit dialog.
	 *
	 * @returns {void}
	 */
	prepareDialogOpen = () => {
		this.dialogSnapshot = cloneDialogSnapshot(this.state);
		this.removeOnCancel = false;
	};

	/**
	 * Commits the current music-object edit dialog state.
	 *
	 * @returns {void}
	 */
	handleDialogCommit = () => {
		const payload = this.lastAppliedPayload || this.state.currentPayload;

		this.dialogSnapshot = null;
		this.removeOnCancel = false;

		if (this.embedSession?.closeDialog) {
			this.embedSession.closeDialog();
			this.props.onPayloadChange?.(payload, { commit: true });
			return;
		}

		this.setState({ dialogOpen: false }, () => {
			this.props.onPayloadChange?.(payload, { commit: true });
		});
	};

	/**
	 * Cancels the current music-object edit dialog state.
	 *
	 * @returns {void}
	 */
	handleDialogCancel = () => {
		if (this.removeOnCancel) {
			const objectId = this.state.currentPayload.id;

			this.dialogSnapshot = null;
			this.removeOnCancel = false;
			this.closeDialog(() => {
				const ownerWindow = this.contentRef.current?.ownerDocument?.defaultView || window;

				ownerWindow.setTimeout(() => {
					this.props.onRemove?.(objectId);
				}, 0);
			});
			return;
		}

		if (!this.dialogSnapshot) {
			this.closeDialog();
			return;
		}

		const restoredPayload = cloneKeyboardPayload(this.dialogSnapshot.currentPayload);

		this.setState({
			currentPayload: restoredPayload,
			dialogOpen: false,
			displayKeyInput: this.dialogSnapshot.displayKeyInput,
			displayKeyMode: this.dialogSnapshot.displayKeyMode,
			editMode: this.dialogSnapshot.editMode,
		});
		this.props.onPayloadChange?.(restoredPayload);
		this.dialogSnapshot = null;
		this.removeOnCancel = false;
		this.embedSession?.closeDialog?.();
	};

	/**
	 * Commits the current music-object format dialog state.
	 *
	 * @returns {void}
	 */
	handleFormatDialogCommit = () => {
		const payload = this.lastAppliedPayload || this.state.currentPayload;

		this.formatDialogSnapshot = null;
		this.setState({ formatDialogOpen: false }, () => {
			this.props.onPayloadChange?.(payload, { commit: true });
		});
	};

	/**
	 * Cancels the current music-object format dialog state.
	 *
	 * @returns {void}
	 */
	handleFormatDialogCancel = () => {
		const restoredPayload = this.formatDialogSnapshot
			? cloneKeyboardPayload(this.formatDialogSnapshot)
			: this.state.currentPayload;

		this.formatDialogSnapshot = null;
		this.setState({
			currentPayload: restoredPayload,
			formatDialogOpen: false,
		});
		this.props.onPayloadChange?.(restoredPayload);
	};

	/**
	 * Closes the controller-owned dialog state, falling back to local state.
	 *
	 * @returns {void}
	 */
	closeDialog(afterClose) {
		if (this.embedSession?.closeDialog) {
			this.embedSession.closeDialog();
			this.setState({ dialogOpen: false }, afterClose);
			return;
		}

		this.setState({ dialogOpen: false }, afterClose);
	}

	/**
	 * Handles playback button activation.
	 *
	 * @param {React.MouseEvent<HTMLElement>} event - Triggering click event.
	 * @returns {void}
	 */
	handlePlaybackButtonClick = (event) => {
		event.stopPropagation();

		if (!this.embedSession?.performAction?.('playback')) {
			this.reportSessionUnavailable();
			this.setState({
				actions: [],
				sessionUnavailable: true,
			});
		}
	};

	/**
	 * Handles controller-provided embed toolbar actions.
	 *
	 * @param {string} actionId
	 * @param {React.MouseEvent<HTMLElement>} event
	 * @returns {void}
	 */
	handleActionButtonClick = (actionId, event) => {
		event.stopPropagation();

		if (this.embedSession?.performAction?.(actionId)) {
			return;
		}

		if (actionId === 'playback') {
			this.handlePlaybackButtonClick(event);
			return;
		}

		if (actionId === 'edit') {
			this.handleEditButtonClick(event);
			return;
		}

		if (actionId === 'format') {
			this.prepareFormatDialogOpen();
		}
	};

	/**
	 * Reports embed hover state to the controller-owned session.
	 *
	 * @returns {void}
	 */
	handleEmbedMouseEnter = () => {
		this.embedSession?.setHovered?.(true);
	};

	/**
	 * Reports embed hover exit to the controller-owned session.
	 *
	 * @returns {void}
	 */
	handleEmbedMouseLeave = () => {
		this.embedSession?.setHovered?.(false);
	};

	/**
	 * Applies transient selected state without writing to the embed payload.
	 *
	 * @param {CustomEvent<{selected: boolean}>} event
	 * @returns {void}
	 */
	handleEmbedSelectionChange = (event) => {
		const selected = event.detail?.selected === true;

		if (this.embedSession?.setSelected) {
			this.embedSession.setSelected(selected);
			return;
		}

		this.setState({ selected });
	};

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
	 * Updates the embed display mode.
	 *
	 * @param {KeyboardDisplayMode} displayMode
	 * @returns {void}
	 */
	updateDisplayMode = (displayMode) => {
		const { currentPayload } = this.state;
		const nextPayload = {
			...currentPayload,
			displayMode,
			staffOctave: currentPayload.staffOctave ?? 4,
		};

		this.applyKeyboardPayload({
			...nextPayload,
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
	 * Updates the user-authored caption template.
	 *
	 * @param {string} captionTemplate
	 * @returns {void}
	 */
	updateCaptionTemplate = (captionTemplate) => {
		const template = String(captionTemplate || '');

		this.applyKeyboardPayload({
			...this.state.currentPayload,
			caption: template
				? { template }
				: null,
		});
	};

	/**
	 * Updates object and caption formatting.
	 *
	 * @param {MusicEmbedFormat} format
	 * @returns {void}
	 */
	updateEmbedFormat = (format) => {
		this.applyKeyboardPayload({
			...this.state.currentPayload,
			format: normalizeMusicEmbedFormat(format),
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
		const { currentPayload } = this.state;
		const nominalWidth = clampMusicEmbedWidth(currentPayload.width || 456);
		const minimumWidthScale = MUSIC_EMBED_MIN_WIDTH / nominalWidth;
		const widthScale = Math.max(Number(width) / nominalWidth, minimumWidthScale);
		const nextScale = clampMusicEmbedScale(widthScale, currentPayload.scale || 1);

		this.applyKeyboardPayload({
			...currentPayload,
			width: nominalWidth,
			height: currentPayload.height,
			scale: nextScale,
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
		const sizing = normalizeMusicEmbedSizing(currentPayload);
		const startX = event.clientX;
		const startY = event.clientY;
		const startWidth = sizing.layoutWidth;
		const startHeight = sizing.layoutHeight;

		this.resizeDraftActive = true;

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
			this.resizeDraftActive = false;
			this.props.onPayloadChange?.(this.lastAppliedPayload || this.state.currentPayload, { commit: true });
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

		const sizing = normalizeMusicEmbedSizing(this.state.currentPayload);

		this.updateEmbedSize(
			sizing.layoutWidth + horizontalStep,
			sizing.layoutHeight + verticalStep,
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

		if (editMode === 'scale' && key) {
			this.applyKeyboardPayload({
				...buildKeyboardScalePayload({
					key: getEffectiveKeyName(key, currentPayload),
					keyMode: displayKeyMode,
				}).payload,
				displayKey: key,
			});
			return;
		}

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
		const nextKeyMode = normalizeKeyQuality(keyMode);

		this.setState({ displayKeyMode: nextKeyMode });

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

		if (editMode === 'scale') {
			const key = getEffectiveKeyName(normalizeKeyName(displayKeyInput) || getPayloadKey(currentPayload) || 'C', currentPayload);

			this.applyKeyboardPayload({
				...buildKeyboardScalePayload({ key, keyMode: nextKeyMode }).payload,
				displayKey: this.getSelectedDisplayKey(),
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
				...buildKeyboardScalePayload({ key, keyMode: displayKeyMode }).payload,
				displayKey: this.getSelectedDisplayKey(),
			});
		}

		if (nextEditMode === 'chord') {
			this.applyKeyboardPayload(buildKeyboardChordPayload(getInitialChordValue(currentPayload)).payload);
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
			notes: [...(payload.notes || this.state.currentPayload.notes || [])],
		};

		if (Object.prototype.hasOwnProperty.call(payload, 'caption') && !payload.caption) {
			delete nextPayload.caption;
		}

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

		if (nextPayload.displayKeyMode === 'major') {
			delete nextPayload.displayKeyMode;
		}

		if (nextPayload.useEnharmonicKey !== false) {
			delete nextPayload.useEnharmonicKey;
		}

		if (Object.prototype.hasOwnProperty.call(payload, 'displayKey') && !payload.displayKey) {
			delete nextPayload.displayKey;
		}

		const sizing = normalizeMusicEmbedSizing(nextPayload);

		nextPayload.width = sizing.width;
		nextPayload.height = sizing.height;

		if (sizing.scale === 1) {
			delete nextPayload.scale;
		} else {
			nextPayload.scale = sizing.scale;
		}

		this.setState({ currentPayload: nextPayload });
		this.lastAppliedPayload = nextPayload;

		if (!this.isEditingDialog() && !this.resizeDraftActive) {
			this.props.onPayloadChange?.(nextPayload);
		}
	}

	/**
	 * Checks whether payload changes are currently draft dialog edits.
	 *
	 * @returns {boolean}
	 */
	isEditingDialog() {
		return Boolean(this.dialogSnapshot || this.formatDialogSnapshot || this.state.dialogOpen || this.state.formatDialogOpen);
	}

	/**
	 * Renders the music object toolbar.
	 *
	 * @returns {React.ReactElement}
	 */
	renderToolbar() {
		const { actions, currentPayload, sessionUnavailable } = this.state;

		if (sessionUnavailable) {
			return null;
		}

		const toolbarActions = getVisibleEmbedActions(
			actions || getDefaultEmbedActions(this.state.playbackState, currentPayload),
			currentPayload,
		);

		return (
			<div className="music-embed-toolbar music-embed-hover-toolbar" aria-label="Music object actions">
				{toolbarActions.map((action) => this.renderToolbarAction(action))}
			</div>
		);
	}

	/**
	 * Renders a non-interactive warning when behavior services are unavailable.
	 *
	 * @returns {React.ReactElement | null}
	 */
	renderSessionErrorIndicator() {
		if (this.state.sessionUnavailable !== true) {
			return null;
		}

		return (
			<LocalizedTooltip phrase="music.object.error_loading" labelChild>
				<span
					className="music-embed-session-error"
					role="img"
					tabIndex={0}
				>
					<ErrorOutlinedIcon aria-hidden="true" fontSize="small" />
				</span>
			</LocalizedTooltip>
		);
	}

	/**
	 * Renders one controller-provided toolbar action.
	 *
	 * @param {MusicEmbedAction} action
	 * @returns {React.ReactElement}
	 */
	renderToolbarAction(action) {
		const labelText = this.context?.localize?.translate?.(action.labelKey) || action.fallback || action.id;

		return (
			<LocalizedTooltip key={action.id} phrase={action.labelKey}>
				<IconButton
					aria-label={labelText}
					aria-disabled={action.disabled ? 'true' : undefined}
					aria-pressed={action.pressed === undefined ? undefined : String(action.pressed)}
					className={`mn-editor-toolbar__button ${action.className || ''}`.trim()}
					disabled={action.disabled === true}
					onClick={(event) => this.handleActionButtonClick(action.id, event)}
					size="small"
					type="button"
				>
					{this.renderActionIcon(action)}
					<span className="mn-screen-reader-only">
						<LocaleString phrase={action.labelKey} />
					</span>
				</IconButton>
			</LocalizedTooltip>
		);
	}

	/**
	 * Renders a controller-provided action icon from the app action registry.
	 *
	 * @param {MusicEmbedAction} action
	 * @returns {React.ReactElement}
	 */
	renderActionIcon(action) {
		const Icon = action.iconComponent;

		if (!Icon) {
			return <span aria-hidden="true" className="mn-editor-toolbar__fallback-icon" />;
		}

		return <Icon aria-hidden="true" fontSize="small" size={18} stroke={1.8} />;
	}

	/**
	 * Renders the resize handle.
	 *
	 * @returns {React.ReactElement}
	 */
	renderResizeHandle() {
		if (this.state.sessionUnavailable) {
			return null;
		}

		if (this.state.fitPreviewWidth) {
			return null;
		}

		return (
			<button
				className="music-embed-resize-handle"
				onClick={(event) => event.stopPropagation()}
				onKeyDown={this.handleResizeKeyDown}
				onPointerDown={this.handleResizePointerDown}
				type="button"
			>
				<span className="music-embed-resize-label">
					<LocaleString phrase="music.controls.resize_object" />
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
		if (this.state.sessionUnavailable) {
			return null;
		}

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
				onChordChange={this.updateChordFromBuilder}
				onCaptionTemplateChange={this.updateCaptionTemplate}
				onCancel={this.handleDialogCancel}
				onCommit={this.handleDialogCommit}
				onDisplayKeyChange={this.updateDisplayKey}
				onDisplayKeyModeChange={this.updateDisplayKeyMode}
				onEditModeChange={this.updateEditMode}
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
	 * Renders the music-object format dialog.
	 *
	 * @returns {React.ReactElement}
	 */
	renderFormatDialog() {
		if (this.state.sessionUnavailable) {
			return null;
		}

		return (
			<MusicEmbedFormatDialog
				documentStyles={this.embedSession?.getDocumentStyles?.() || []}
				format={this.state.currentPayload.format}
				onCancel={this.handleFormatDialogCancel}
				onChange={this.updateEmbedFormat}
				onCommit={this.handleFormatDialogCommit}
				open={this.state.formatDialogOpen}
			/>
		);
	}

	/**
	 * Renders the playable and editable music embed.
	 *
	 * @returns {React.ReactElement}
	 */
	render() {
		const { currentPayload, fitPreviewWidth, selected } = this.state;
		const captionText = getCaptionText(currentPayload);
		const embedFormat = normalizeMusicEmbedFormat(currentPayload.format);
		const contentClassName = [
			'music-keyboard-embed-content',
			captionText ? 'music-keyboard-embed-content-has-caption' : '',
			selected ? 'music-keyboard-embed-content--selected' : '',
		].filter(Boolean).join(' ');

		return (
			<div
				className={contentClassName}
				onMouseEnter={this.handleEmbedMouseEnter}
				onMouseLeave={this.handleEmbedMouseLeave}
				ref={this.contentRef}
			>
				{this.renderToolbar()}
				{this.renderSessionErrorIndicator()}
				<MusicPreview fitWidth={fitPreviewWidth} payload={currentPayload} />
				{captionText ? (
					<div className="music-embed-caption" style={getCaptionStyle(embedFormat.caption)}>
						{captionText}
					</div>
				) : null}
				{this.renderResizeHandle()}
				{this.renderDialog()}
				{this.renderFormatDialog()}
			</div>
		);
	}
}

/**
 * Clones the dialog-relevant state so cancel can restore the prior embed setup.
 *
 * @param {MusicEmbedViewState} state
 * @returns {{currentPayload: KeyboardPayload, displayKeyInput: string, displayKeyMode: KeyMode, editMode: MusicEmbedEditMode}}
 */
function cloneDialogSnapshot(state) {
	return {
		currentPayload: cloneKeyboardPayload(state.currentPayload),
		displayKeyInput: state.displayKeyInput,
		displayKeyMode: state.displayKeyMode,
		editMode: state.editMode,
	};
}

/**
 * Clones payload arrays before they are kept as rollback state.
 *
 * @param {KeyboardPayload} payload
 * @returns {KeyboardPayload}
 */
function cloneKeyboardPayload(payload) {
	const clone = {
		...payload,
		notes: [...(payload.notes || [])],
	};

	if (payload.highlightedNotes) {
		clone.highlightedNotes = [...payload.highlightedNotes];
	}

	if (payload.format) {
		clone.format = {
			...payload.format,
			caption: {
				...(payload.format.caption || {}),
			},
		};
	}

	return clone;
}

/**
 * Builds fallback toolbar actions when the controller session is unavailable.
 *
 * @param {MusicEmbedPlaybackState} playbackState
 * @returns {MusicEmbedAction[]}
 */
function getDefaultEmbedActions(playbackState = 'idle', payload = null) {
	const isPlaying = playbackState === 'playing';
	const actions = [
		{
			id: 'edit',
			className: 'music-keyboard-edit-button',
			fallback: 'Edit',
			iconId: 'music-object.edit',
			labelKey: 'music.controls.edit',
		},
		{
			id: 'format',
			className: 'music-keyboard-format-button',
			fallback: 'Format',
			iconId: 'music-object.format',
			labelKey: 'music.controls.format',
		},
	];

	if (!isPayloadPlayable(payload)) {
		return actions;
	}

	return [
		{
			id: 'playback',
			className: 'music-keyboard-play-button',
			disabled: playbackState === 'loading',
			fallback: isPlaying ? 'Stop' : 'Play',
			iconId: isPlaying ? 'music-object.stop' : 'music-object.play',
			labelKey: isPlaying ? 'music.controls.stop' : 'music.controls.play',
			pressed: isPlaying,
		},
		...actions,
	];
}

function getVisibleEmbedActions(actions, payload) {
	if (isPayloadPlayable(payload)) {
		return actions;
	}

	return (actions || []).filter((action) => action.id !== 'playback');
}

function isPayloadPlayable(payload) {
	return Array.isArray(payload?.notes) && payload.notes.length > 0;
}

function getCaptionStyle(captionFormat) {
	return {
		fontSize: `${captionFormat.fontSize}px`,
		fontStyle: captionFormat.italic ? 'italic' : undefined,
		fontWeight: captionFormat.bold ? 700 : undefined,
		textAlign: captionFormat.alignment,
		textDecoration: captionFormat.underline ? 'underline' : undefined,
	};
}

function applyEmbedFormatClassNames(node, format) {
	const normalizedFormat = normalizeMusicEmbedFormat(format);
	const classNames = [
		'music-keyboard-embed--align-left',
		'music-keyboard-embed--align-center',
		'music-keyboard-embed--align-right',
	];

	node.classList.remove(...classNames);

	node.classList.add(`music-keyboard-embed--align-${normalizedFormat.alignment}`);
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

function isInsideTableCell(node) {
	return Boolean(node?.closest?.('.ql-table-cell, .ql-table-cell-inner, .table-up-cell, .table-up-cell-inner'));
}

function getOwningTableCell(node) {
	return node?.closest?.('.ql-table-cell-inner, .table-up-cell-inner, .ql-table-cell, .table-up-cell, td, th') || null;
}

/**
 * Gets the initial chord value for the chord editor.
 *
 * @param {KeyboardPayload} payload
 * @returns {string}
 */
function getInitialChordValue(payload) {
	if (payload.progressionInput) {
		return payload.progressionInput;
	}

	const progressionMatch = /^typed:[^:]+:(.+)$/.exec(String(payload.progressionId || ''));

	if (progressionMatch) {
		return progressionMatch[1];
	}

	if (payload.sourceChordSymbol) {
		return payload.sourceChordSymbol;
	}

	if (payload.chordId && !payload.progressionId) {
		return payload.label;
	}

	return 'C';
}

/**
 * Gets the initial edit panel shown by the dialog.
 *
 * @param {MusicEmbedEditMode} editMode
 * @param {KeyboardPayload} payload
 * @returns {MusicEmbedEditMode}
 */
function getInitialEditMode(editMode, payload = {}) {
	if (editMode === 'none' || editMode === 'scale' || editMode === 'chord') {
		return editMode;
	}

	if (payload.scaleId) {
		return 'scale';
	}

	if (!Array.isArray(payload.notes) || payload.notes.length === 0) {
		return 'none';
	}

	return 'chord';
}

/**
 * Gets the initial key quality from stored payloads, including older scale payloads.
 *
 * @param {KeyboardPayload} payload
 * @returns {KeyMode}
 */
function getInitialDisplayKeyMode(payload) {
	const scaleQuality = getScaleNameFromId(payload.scaleId)
		.replace(/^[A-Ga-g](?:#|b)?\s+/, '')
		.replace(/\s+/g, '-');

	return normalizeKeyQuality(payload.displayKeyMode || scaleQuality);
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
		return `${key} ${normalizeKeyQuality(keyMode)} key`;
	}

	return `${key} ${normalizeKeyQuality(keyMode)}`;
}

/**
 * Resolves the user-authored caption template for display.
 *
 * @param {KeyboardPayload} payload
 * @returns {string}
 */
function getCaptionText(payload) {
	const template = String(payload.caption?.template || '');

	if (!template.trim()) {
		return '';
	}

	const tokenValues = {
		key: getCaptionKeyLabel(payload),
		long: getCaptionLongLabel(payload),
		short: getCaptionShortLabel(payload),
	};
	const caption = template.replace(
		/\{\{\s*(key|short|long)\s*\}\}/g,
		(match, token) => tokenValues[token] || '',
	);

	return caption.trim() ? caption : '';
}

/**
 * Gets the short context-aware caption label.
 *
 * @param {KeyboardPayload} payload
 * @returns {string}
 */
function getCaptionShortLabel(payload) {
	if (payload.sourceChordSymbol) {
		return payload.sourceChordSymbol;
	}

	if (payload.progressionInput && payload.progressionId) {
		return payload.progressionInput;
	}

	if (payload.chordId || payload.progressionId) {
		return payload.label || '';
	}

	return getCaptionKeyOrScaleLabel(payload);
}

/**
 * Gets the long context-aware caption label.
 *
 * @param {KeyboardPayload} payload
 * @returns {string}
 */
function getCaptionLongLabel(payload) {
	return payload.label || getCaptionShortLabel(payload);
}

/**
 * Gets the caption label for the current key or scale context.
 *
 * @param {KeyboardPayload} payload
 * @returns {string}
 */
function getCaptionKeyOrScaleLabel(payload) {
	const scaleName = getScaleNameFromId(payload.scaleId);

	if (scaleName) {
		return scaleName;
	}

	const key = getEffectiveKeyName(
		normalizeKeyName(payload.displayKey || getPayloadKey(payload)) || '',
		payload,
	);

	if (!key) {
		return '';
	}

	return `${key} ${normalizeKeyQuality(payload.displayKeyMode)}`;
}

/**
 * Gets the caption label for the selected key context.
 *
 * @param {KeyboardPayload} payload
 * @returns {string}
 */
function getCaptionKeyLabel(payload) {
	const key = getEffectiveKeyName(
		normalizeKeyName(payload.displayKey || getPayloadKey(payload)) || '',
		payload,
	);

	if (!key) {
		return '';
	}

	return `${key} ${normalizeKeyQuality(payload.displayKeyMode)}`;
}

/**
 * Extracts a display scale name from the serialized scale id.
 *
 * @param {string | undefined} scaleId
 * @returns {string}
 */
function getScaleNameFromId(scaleId) {
	const match = /^typed:(.+)$/.exec(String(scaleId || ''));

	return match?.[1] || '';
}
