/**
 * Playback lifecycle state for the music embed view.
 *
 * - **idle** - No playback is active.
 * - **loading** - Playback resources are being prepared.
 * - **playing** - Notes are currently playing.
 */
type MusicEmbedPlaybackState = 'idle' | 'loading' | 'playing';

/** Toolbar action rendered by the music embed presentation. */
type MusicEmbedAction = MusicObjectEmbedAction;

/** Props for the rendered music embed and its edit dialog. */
type MusicEmbedViewProps = {
	/** Whether the edit dialog should start open. */
	initialDialogOpen?: boolean;
	/** Optional initial edit panel shown when the dialog first mounts. */
	initialEditMode?: MusicEmbedEditMode;
	/** Music embed payload to render and edit. */
	payload: KeyboardPayload;
	/** Called with an updated payload after edits. */
	onPayloadChange?: (payload: KeyboardPayload) => void;
	/** Called when a newly inserted object should be removed after cancel. */
	onRemove?: (objectId: string) => void;
};

/** Internal state used by the music embed view. */
type MusicEmbedViewState = {
	/** Current editable payload copy. */
	currentPayload: KeyboardPayload;
	/** Whether the edit dialog is open. */
	dialogOpen: boolean;
	/** Current key field value in the edit dialog. */
	displayKeyInput: string;
	/** Current major/minor key mode in the edit dialog. */
	displayKeyMode: KeyMode;
	/** Active edit panel in the dialog. */
	editMode: MusicEmbedEditMode;
	/** Whether the format dialog is open. */
	formatDialogOpen: boolean;
	/** Current playback lifecycle state. */
	playbackState: MusicEmbedPlaybackState;
	/** Whether Quill currently selects this embed. */
	selected: boolean;
	/** Controller-provided toolbar actions to render. */
	actions: MusicEmbedAction[];
	/** Whether this embed should fit the width of its containing table cell. */
	fitPreviewWidth: boolean;
};

/** MusicXML-ready note data for one staff note. */
type MusicXmlNote = StaffNote;

declare class MusicEmbedView extends React.Component<MusicEmbedViewProps, MusicEmbedViewState> {}
