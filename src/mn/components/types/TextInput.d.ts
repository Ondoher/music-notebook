/** Slot props accepted by the localized MUI text input wrapper. */
type TextInputSlotProps = {
	/** Props forwarded to the native HTML input slot. */
	htmlInput?: Record<string, unknown>;
	/** Additional MUI slot props. */
	[key: string]: unknown;
};

/** Props for the localized MUI TextField wrapper. */
type TextInputProps = BaseMuiTextFieldProps & {
	/** Accessible label override for the input. */
	ariaLabel?: LocalizedText;
	/** Browser autocomplete token. */
	autoComplete?: string;
	/** Legacy lowercase autocomplete token accepted by existing callers. */
	autocomplete?: string;
	/** CSS class name for the rendered text field. */
	className?: string;
	/** Helper text shown below the input. */
	helperText?: LocalizedText | React.ReactNode;
	/** Visible input label. */
	label: LocalizedText;
	/** Fallback label text when localization is unavailable. */
	labelFallback?: string;
	/** Whether helperText should be localized when it is phrase-like. */
	localizeHelperText?: boolean;
	/** Slot props forwarded to the underlying MUI TextField. */
	slotProps?: TextInputSlotProps;
	/** MUI text-field variant. */
	variant?: MuiVariant;
};
