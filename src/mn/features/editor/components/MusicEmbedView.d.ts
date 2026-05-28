/**
 * Playback lifecycle state for the music embed view.
 *
 * - **idle** - No playback is active.
 * - **loading** - Playback resources are being prepared.
 * - **playing** - Notes are currently playing.
 */
type MusicEmbedPlaybackState = 'idle' | 'loading' | 'playing';

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
	/** Current playback lifecycle state. */
	playbackState: MusicEmbedPlaybackState;
};

/** MusicXML-ready note data for one staff note. */
type MusicXmlNote = StaffNote;

export default class MusicEmbedView extends React.Component<MusicEmbedViewProps, MusicEmbedViewState> {}
