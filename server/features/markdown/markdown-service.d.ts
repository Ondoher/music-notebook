/** Result returned when loading one localized markdown document. */
type MarkdownLoadResult = {
	/** Whether the markdown document was loaded. */
	success: boolean;
	/** Localized markdown text when loading succeeds. */
	data?: string;
	/** Failure reason phrase key when loading fails. */
	reason?: string;
};

/** Service for localized markdown document lookup. */
type MarkdownService = {
	/** Normalizes one request language into a markdown content folder name. */
	normalizeLanguage: (language?: string) => string;
	/** Normalizes one document name into a safe markdown basename. */
	normalizeName: (name?: string) => string;
	/** Gets candidate language folders in lookup order. */
	getLanguageCandidates: (language?: string) => string[];
	/** Loads one localized markdown document by name. */
	getMarkdown: (name: string, language?: string) => Promise<MarkdownLoadResult>;
};
