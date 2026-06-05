/** Supported notebook page size id. */
type DocumentFormatSizeId = 'letter' | 'legal' | 'a4' | 'a5';

/** Supported notebook page orientation. */
type DocumentFormatOrientation = 'portrait' | 'landscape';

/** Page margins, stored in points. */
type DocumentFormatMargins = {
	/** Top margin in points. */
	top: number;
	/** Right margin in points. */
	right: number;
	/** Bottom margin in points. */
	bottom: number;
	/** Left margin in points. */
	left: number;
};

/** Document formatting settings for page geometry. */
type DocumentFormatSettings = {
	/** Page size id. */
	size: DocumentFormatSizeId;
	/** Page orientation. */
	orientation: DocumentFormatOrientation;
	/** Document default font size in pixels. */
	fontSize: number;
	/** Page margins in points. */
	margins: DocumentFormatMargins;
};

/** Page dimensions in inches. */
type DocumentFormatPageDimensions = {
	/** Page width in inches. */
	width: number;
	/** Page height in inches. */
	height: number;
};

/** Service for reusable document formatting rules and document-model updates. */
type DocumentFormatService = {
	/** Normalizes one margin value in points. */
	normalizeMargin: (value: unknown, fallback: number) => number;
	/** Normalizes one document default font-size value in pixels. */
	normalizeFontSize: (value: unknown, fallback?: number) => number;
	/** Normalizes document-format settings. */
	normalizeFormat: (format?: Partial<DocumentFormatSettings>) => DocumentFormatSettings;
	/** Returns the current document formatting settings. */
	getFormat: () => DocumentFormatSettings;
	/** Gets normalized page dimensions in inches. */
	getPageDimensions: (format?: Partial<DocumentFormatSettings>) => DocumentFormatPageDimensions;
	/** Gets the page content width between document margins in CSS pixels. */
	getContentWidth: (format?: Partial<DocumentFormatSettings>) => number | null;
	/** Applies document-format settings to the document model. */
	applyFormat: (format: Partial<DocumentFormatSettings>) => DocumentFormatSettings;
	/** Returns true when a document-format change can be undone. */
	canUndo: () => boolean;
	/** Returns true when a document-format change can be redone. */
	canRedo: () => boolean;
	/** Undoes the most recent document-format change. */
	undo: () => DocumentFormatSettings | null;
	/** Redoes the most recent undone document-format change. */
	redo: () => DocumentFormatSettings | null;
};
