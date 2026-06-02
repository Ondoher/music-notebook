/** Callback fired when the font-size picker value changes. */
type FontSizePickerChangeHandler = (
	/** Next font size value. */
	value: number,
	/** Source event that caused the change. */
	event?: React.SyntheticEvent,
) => void;

/** Props for the localized font-size picker. */
type FontSizePickerProps = {
	/** CSS class name for the rendered picker. */
	className?: string;
	/** Label for the decrement button. */
	decrementLabel?: LocalizedText;
	/** Whether the picker is disabled. */
	disabled?: boolean;
	/** Helper text shown below the number field. */
	helperText?: LocalizedText | React.ReactNode;
	/** Label for the increment button. */
	incrementLabel?: LocalizedText;
	/** Visible number-field label. */
	label?: LocalizedText;
	/** Fallback label text when localization is unavailable. */
	labelFallback?: string;
	/** Maximum allowed font size. */
	max?: number;
	/** Minimum allowed font size. */
	min?: number;
	/** Called with the next font size after typing or button activation. */
	onChange?: FontSizePickerChangeHandler;
	/** Called when the number field loses focus. */
	onBlur?: (event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
	/** MUI control size. */
	size?: MuiSize;
	/** Step applied by the increment and decrement buttons. */
	step?: number;
	/** Current font size value. */
	value: number;
};

/** Internal state for the font-size picker. */
type FontSizePickerState = {
	/** Draft text shown in the number field while typing. */
	inputValue: string;
};

declare class FontSizePicker extends React.Component<FontSizePickerProps, FontSizePickerState> {}
