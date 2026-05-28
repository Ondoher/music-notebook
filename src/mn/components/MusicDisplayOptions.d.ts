/** Props for shared music embed display settings. */
type MusicDisplayOptionsProps = {
	/** Music embed payload currently being edited. */
	payload: KeyboardPayload;
	/** Called when the display mode changes. */
	onDisplayModeChange: (displayMode: KeyboardDisplayMode) => void;
	/** Called when keyboard note-name visibility changes. */
	onKeyboardShowNoteNamesChange: (showNoteNames: boolean) => void;
	/** Called when the staff octave field changes. */
	onStaffOctaveChange: (staffOctave: string) => void;
};

export default class MusicDisplayOptions extends React.Component<MusicDisplayOptionsProps> {}
