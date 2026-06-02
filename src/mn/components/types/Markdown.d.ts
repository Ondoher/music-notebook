/** Props for the localized markdown renderer. */
type MarkdownProps = {
	/** CSS class name added to the markdown root. */
	className?: string;
	/** Markdown document name. */
	name: string;
	/** Replacement values applied through localization. */
	replacements?: Record<string, LocalizedReplacementValue>;
};

/** State for the localized markdown renderer. */
type MarkdownState = {
	/** Renderable markdown HTML. */
	content: string;
	/** Name of the markdown document currently loaded. */
	loadedName: string;
};
