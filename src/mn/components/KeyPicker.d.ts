/** Props for the localized music-key picker. */
type KeyPickerProps = {
	/** CSS class name applied to the rendered picker. */
	className?: string;
	/** CSS class name applied to the optional enharmonic key checkbox. */
	enharmonicFieldClassName?: string;
	/** Optional enharmonic key spelling offered to the user. */
	enharmonicKey?: string;
	/** CSS class name applied to the key input field. */
	keyFieldClassName?: string;
	/** Localized label for the key field. */
	label?: LocalizedText;
	/** Controlled major/minor mode value. */
	mode?: KeyMode;
	/** CSS class name applied to the optional major/minor mode field. */
	modeFieldClassName?: string;
	/** Localized label for the optional major/minor mode field. */
	modeLabel?: LocalizedText;
	/** Called when the selected or typed key changes. */
	onKeyChange?: (key: string) => void;
	/** Called when the selected major/minor mode changes. */
	onModeChange?: (mode: KeyMode) => void;
	/** Called when the enharmonic key option changes. */
	onUseEnharmonicKeyChange?: (useEnharmonicKey: boolean) => void;
	/** Key options offered by the dropdown. */
	options?: string[];
	/** Whether the major/minor mode selector should be shown. */
	showMode?: boolean;
	/** MUI control size used by fields in the picker. */
	size?: MuiSize;
	/** Whether the optional enharmonic key spelling should be used. */
	useEnharmonicKey?: boolean;
	/** Controlled key value. */
	value?: string;
};
