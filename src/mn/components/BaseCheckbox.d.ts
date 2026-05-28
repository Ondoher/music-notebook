/** Callback fired when the checkbox checked state changes. */
type BaseCheckboxChangeHandler = (
	/** New checked state. */
	checked: boolean,
	/** Native checkbox change event. */
	event: React.ChangeEvent<HTMLInputElement>,
) => void;

/** Props for the localized MUI checkbox wrapper. */
type BaseCheckboxProps = Omit<BaseMuiFormControlProps, BaseMuiWrappedControlProp> & {
	/** Accessible label override for the checkbox input. */
	ariaLabel?: LocalizedText;
	/** Controlled checked state. */
	checked?: boolean;
	/** Extra props forwarded to the underlying MUI Checkbox. */
	checkboxProps?: Partial<BaseMuiCheckboxProps> & {
		/** Slot-specific props forwarded to MUI. */
		slotProps?: {
			/** Props forwarded to the native input slot. */
			input?: Record<string, unknown>;
			/** Additional MUI slot props. */
			[key: string]: unknown;
		};
	};
	/** CSS class name for the rendered form control. */
	className?: string;
	/** Whether the checkbox should render error styles. */
	error?: boolean;
	/** Helper text shown below the checkbox. */
	helperText?: LocalizedText;
	/** DOM id used to connect label, input, and helper text. */
	id?: string;
	/** Visible checkbox label. */
	label: LocalizedText;
	/** Fallback label text when localization is unavailable. */
	labelFallback?: string;
	/** Called with the checked state and original event. */
	onChange?: BaseCheckboxChangeHandler;
	/** MUI checkbox size. */
	size?: MuiSize;
	/** MUI form-control variant. */
	variant?: MuiVariant;
};
