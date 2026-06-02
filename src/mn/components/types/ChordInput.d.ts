/** Props for the grouped chord editor input. */
type ChordInputProps = {
	/** CSS class name applied to the arpeggiate checkbox field. */
	checkboxClassName?: string;
	/** CSS class name applied to each field control. */
	fieldClassName?: string;
	/** CSS class name applied to helper text. */
	helperClassName?: string;
	/** Whether playback should arpeggiate notes when the input mounts. */
	initialArpeggiate?: boolean;
	/** Initial numeric inversion index. */
	initialInversion?: number;
	/** Initial key used when resolving chord degrees. */
	initialKey?: string;
	/** Initial major/minor mode used when resolving numeric degrees. */
	initialKeyMode?: KeyMode;
	/** Initial chord text value. */
	initialValue?: string;
	/** Localized group label. */
	label?: LocalizedText;
	/** CSS class name applied to the group label. */
	labelClassName?: string;
	/** Called whenever the chord input resolves or becomes invalid. */
	onChordInputChange?: (change: ChordTextChange) => void;
	/** Called whenever the chord input resolves or becomes invalid. */
	onResultChange?: (result: MusicBuildResult) => void;
	/** Externally selected key used when local key editing is hidden. */
	selectedKey?: string;
	/** Externally selected key mode used when local key editing is hidden. */
	selectedKeyMode?: KeyMode;
	/** CSS class name applied to the root form control. */
	rootClassName?: string;
	/** Whether key controls should be shown. */
	showKey?: boolean;
	/** Whether the major/minor mode field should be shown with the key controls. */
	showKeyMode?: boolean;
	/** MUI control size used by fields in the grouped input. */
	size?: MuiSize;
	/** Controlled chord text value. */
	value?: string;
};
