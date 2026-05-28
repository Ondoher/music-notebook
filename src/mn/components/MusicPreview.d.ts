/** Props for a music embed preview switcher. */
type MusicPreviewProps = {
	/** Music embed payload to preview. */
	payload: KeyboardPayload;
};

/** Props for a staff music preview. */
type StaffPreviewProps = {
	/** Music embed payload to render as notation. */
	payload: KeyboardPayload;
};

/** Props for a piano keyboard music preview. */
type KeyboardPreviewProps = {
	/** Music embed payload to render as a keyboard. */
	payload: KeyboardPayload;
};

/** Internal keyboard preview state derived from a payload. */
type KeyboardPreviewModel = {
	/** First MIDI note shown on the keyboard. */
	firstNote: number;
	/** Whether any notes are highlighted. */
	hasHighlights: boolean;
	/** MIDI notes to visually highlight. */
	highlightedNotes: number[];
	/** Key-signature labels by MIDI number. */
	keyLabelsByMidi: Map<number, string>;
	/** Last MIDI note shown on the keyboard. */
	lastNote: number;
	/** Root MIDI note for root highlighting. */
	rootNote: number | null;
	/** Whether keyboard note labels are visible. */
	showNoteNames: boolean;
	/** Explicit note spellings by MIDI number. */
	spelledLabelsByMidi: Map<number, string>;
};

export default class MusicPreview extends React.Component<MusicPreviewProps> {}
