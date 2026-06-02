/** Callback fired when the selected option changes. */
type BaseSelectChangeHandler<Value extends SelectOptionValue = string> = (
	/** Newly selected option value. */
	value: Value,
	/** MUI or native select change event. */
	event: React.ChangeEvent<HTMLInputElement> | Event,
	/** Rendered selected child supplied by MUI. */
	child: React.ReactNode,
) => void;

/** Props for the localized MUI Select wrapper. */
type BaseSelectProps<Value extends SelectOptionValue = string> =
	Omit<BaseMuiFormControlProps, 'variant'> & {
		/** CSS class name for the rendered form control. */
		className?: string;
		/** Whether the select should render error styles. */
		error?: boolean;
		/** Helper text shown below the select. */
		helperText?: LocalizedText;
		/** DOM id used to connect label, select, and helper text. */
		id?: string;
		/** Visible select label. */
		label: LocalizedText;
		/** Fallback label text when localization is unavailable. */
		labelFallback?: string;
		/** Whether option labels should be localized. */
		localizeOptions?: boolean;
		/** Called with the selected value, event, and selected child. */
		onChange?: BaseSelectChangeHandler<Value>;
		/** Options shown in the select menu. */
		options?: Array<SelectOption<Value>>;
		/** Extra props forwarded to the underlying MUI Select. */
		selectProps?: Partial<BaseMuiSelectProps<Value>>;
		/** MUI select size. */
		size?: MuiSize;
		/** Controlled selected value. */
		value?: Value;
		/** MUI form-control variant. */
		variant?: MuiVariant;
	};
