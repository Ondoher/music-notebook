/** Props for a music embed preview switcher. */
type MusicPreviewProps = {
	/** Music embed payload to preview. */
	payload: KeyboardPayload;
	/** Whether keyboard previews should render to their available host width. */
	fitWidth?: boolean;
	/** Called with measured natural height after a generated preview is available. */
	onNaturalHeight?: (height: number) => void;
};

/** Props for a staff music preview. */
type StaffPreviewProps = {
	/** Music embed payload to render as notation. */
	payload: KeyboardPayload;
	/** Called with measured natural height after OSMD generates the SVG. */
	onNaturalHeight?: (height: number) => void;
};

/** Props for a piano keyboard music preview. */
type KeyboardPreviewProps = {
	/** Music embed payload to render as a keyboard. */
	payload: KeyboardPayload;
	/** Whether the keyboard should render to its available host width. */
	fitWidth?: boolean;
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

declare class MusicPreview extends React.Component<MusicPreviewProps> {}
