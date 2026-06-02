/** Props for rendering a localized phrase. Missing translations throw. */
type LocaleStringProps = Omit<LocalePhrase, 'fallback'> & {
	/** Translation key or full phrase request to render. */
	phrase?: LocalizedText;
};
