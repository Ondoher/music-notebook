/** Props for the grouped scale editor input. */
type ScaleInputProps = {
	/** CSS class name applied to each field control. */
	fieldClassName?: string;
	/** CSS class name applied to helper text. */
	helperClassName?: string;
	/** Initial key shown in the scale input. */
	initialKey?: string;
	/** Initial mode value when building modal scales. */
	initialMode?: ScaleModeValue;
	/** Initial scale type selection. */
	initialScaleType?: ScaleTypeValue;
	/** Localized group label. */
	label?: LocalizedText;
	/** CSS class name applied to the group label. */
	labelClassName?: string;
	/** Called whenever the scale input resolves or becomes invalid. */
	onResultChange?: (result: MusicBuildResult) => void;
	/** Externally selected key used when local key editing is hidden. */
	selectedKey?: string;
	/** CSS class name applied to the root form control. */
	rootClassName?: string;
	/** Whether key controls should be shown. */
	showKey?: boolean;
	/** MUI control size used by fields in the grouped input. */
	size?: MuiSize;
};
