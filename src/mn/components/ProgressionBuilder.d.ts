/** Props for the Roman numeral or numeric progression-entry form. */
type ProgressionBuilderProps = {
	/** Initial arpeggiation setting when the builder mounts. */
	initialArpeggiate?: boolean;
	/** Initial key used to resolve the progression. */
	initialKey?: string;
	/** Initial major/minor mode used for numeric degrees. */
	initialKeyMode?: KeyMode;
	/** Initial Roman numeral or numeric degree input. */
	initialRomanNumeral?: string;
	/** Localized label for the progression input. */
	label?: LocalizedText;
	/** Called whenever the progression input resolves or becomes invalid. */
	onProgressionChange?: (result: MusicBuildResult) => void;
	/** Externally selected key used when the key field is hidden. */
	selectedKey?: string;
	/** Externally selected key mode used when the key mode field is hidden. */
	selectedKeyMode?: KeyMode;
	/** Whether the key and mode fields should be rendered. */
	showKey?: boolean;
	/** MUI control size used by fields in the builder. */
	size?: MuiSize;
};
