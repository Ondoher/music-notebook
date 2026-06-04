/** Props for rendering a localized phrase. Missing translations throw. */
type LocaleStringProps = Omit<LocalizedPhrase, 'fallback' | 'phrase'> & {
	/** Translation key or full phrase request to render. */
	phrase?: LocalizedText;
	/** Whether the translated output may contain trusted HTML. */
	html?: boolean;
	/** Whether an empty translation should suppress rendering. */
	hideEmpty?: boolean;
	/** CSS class name applied to the rendered localized element. */
	className?: string;
	/** DOM id applied to the rendered localized element. */
	id?: string;
	/** Whether the phrase should render inside a div instead of inline text. */
	div?: boolean;
};
