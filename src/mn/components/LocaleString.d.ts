/** Props for rendering a localized phrase or literal fallback text. */
type LocaleStringProps = LocalePhrase & {
	/** Translation key or full phrase request to render. */
	phrase?: LocalizedText;
};
