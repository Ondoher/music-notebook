/** Option descriptor for one localized radio choice. */
type BaseRadioButtonOption<Value extends string = string> = {
	/** Stable option value submitted by the radio group. */
	value: Value;
	/** Visible option label, localized when requested by the component. */
	label: LocalizedText;
	/** Fallback text used when the localized label is unavailable. */
	fallback?: string;
	/** Whether the option is unavailable for selection. */
	disabled?: boolean;
};

/** Callback fired when the selected radio value changes. */
type BaseRadioButtonsChangeHandler<Value extends string = string> = (
	/** Newly selected value. */
	value: Value,
	/** Native radio change event. */
	event: React.ChangeEvent<HTMLInputElement>,
) => void;

/** Props for the localized MUI radio-group wrapper. */
type BaseRadioButtonsProps<Value extends string = string> =
	Omit<BaseMuiFormControlProps, BaseMuiWrappedControlProp> & {
		/** CSS class name for the rendered form control. */
		className?: string;
		/** Whether the group should render error styles. */
		error?: boolean;
		/** Helper text shown below the radio group. */
		helperText?: LocalizedText;
		/** DOM id used to connect group label and helper text. */
		id?: string;
		/** Visible group label. */
		label: LocalizedText;
		/** Fallback label text when localization is unavailable. */
		labelFallback?: string;
		/** Called with the selected value and original event. */
		onChange?: BaseRadioButtonsChangeHandler<Value>;
		/** Radio options shown in the group. */
		options?: Array<BaseRadioButtonOption<Value>>;
		/** Extra props forwarded to each underlying MUI Radio. */
		radioProps?: Partial<BaseMuiRadioProps>;
		/** Whether options should be arranged horizontally. */
		row?: boolean;
		/** Controlled selected value. */
		value?: Value;
		/** MUI form-control variant. */
		variant?: MuiVariant;
	};
