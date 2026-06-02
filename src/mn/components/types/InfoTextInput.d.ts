/** Props for a text input with contextual information dialog support. */
type InfoTextInputProps = TextInputProps & {
	/** Localized info dialog content phrase or markdown document name. */
	content?: LocalizedText;
	/** Where the information affordance should be rendered. */
	infoPlacement?: 'end' | 'top-right';
	/** Whether info content identifies a localized markdown document. */
	markdown?: boolean;
	/** Replacement values applied to info content. */
	replacements?: Record<string, LocalizedReplacementValue>;
	/** Localized info dialog title phrase key. */
	title?: string;
};

/** State for a text input with contextual information dialog support. */
type InfoTextInputState = {
	/** Whether the information dialog is open. */
	showDialog: boolean;
};
