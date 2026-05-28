/** Props for the auto-detecting chord text input. */
type ChordTextProps = {
	/** Id of helper text that describes the input. */
	ariaDescribedBy?: string;
	/** CSS class name applied to the rendered text input. */
	className?: string;
	/** Key used to resolve Roman numeral or numeric chord degrees. */
	keyName?: string;
	/** Major/minor key mode used to resolve numeric chord degrees. */
	keyMode?: KeyMode;
	/** Visible input label. */
	label?: LocalizedText;
	/** Called when the input loses focus. */
	onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
	/** Called when the chord text changes with its resolved result. */
	onChange?: (change: ChordTextChange, event?: React.ChangeEvent<HTMLInputElement>) => void;
	/** Called when the input receives focus. */
	onFocus?: (event: React.FocusEvent<HTMLInputElement>) => void;
	/** Called when props or local value changes produce a resolved result. */
	onResolve?: (change: ChordTextChange) => void;
	/** Options used while resolving the chord text. */
	resolveOptions?: ChordTextResolveOptions;
	/** MUI text input size. */
	size?: MuiSize;
	/** Controlled chord text value. */
	value?: string;
};
