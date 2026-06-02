/** Props for the chord-entry form used by music embed editing. */
type ChordBuilderProps = {
	/** Initial arpeggiation setting when the builder mounts. */
	initialArpeggiate?: boolean;
	/** Initial chord inversion index. */
	initialInversion?: number;
	/** Initial key used when numeric or Roman chord degrees are entered. */
	initialKey?: string;
	/** Initial major/minor mode used when numeric chord degrees are entered. */
	initialKeyMode?: KeyMode;
	/** Initial chord symbol shown in the input. */
	initialValue?: string;
	/** Localized label for the chord input. */
	label?: LocalizedText;
	/** Called whenever the chord input resolves or becomes invalid. */
	onChordChange?: (result: MusicBuildResult) => void;
	/** Current shared key used when numeric or Roman chord degrees are entered. */
	selectedKey?: string;
	/** Current shared major/minor mode used when numeric chord degrees are entered. */
	selectedKeyMode?: KeyMode;
	/** MUI control size used by fields in the builder. */
	size?: MuiSize;
	/** Controlled chord symbol value. */
	value?: string;
};
