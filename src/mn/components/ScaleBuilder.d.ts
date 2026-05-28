/** Props for the scale-entry form used by music embed editing. */
type ScaleBuilderProps = {
	/** Initial key shown in the scale builder. */
	initialKey?: string;
	/** Initial mode value when building modal scales. */
	initialMode?: ScaleModeValue;
	/** Initial scale type selection. */
	initialScaleType?: ScaleTypeValue;
	/** Localized label for the scale controls. */
	label?: LocalizedText;
	/** Called whenever the scale input resolves or becomes invalid. */
	onScaleChange?: (result: MusicBuildResult) => void;
	/** Externally selected key used when the key field is hidden. */
	selectedKey?: string;
	/** Whether the key field should be rendered. */
	showKey?: boolean;
	/** MUI control size used by fields in the builder. */
	size?: MuiSize;
};
