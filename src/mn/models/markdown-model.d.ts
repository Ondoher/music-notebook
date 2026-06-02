/** Client-side service for loading localized markdown documents. */
type MarkdownModelService = {
	/** Loads one localized markdown document by name. */
	get: (name: string) => Promise<string>;
};
