/** Adapter attached by the active editor view. */
type EditorSurfaceAdapter = {
	/** Inserts a document object into the editor at the current selection. */
	insertObject?: (object: NotebookDocumentObject, options?: Record<string, unknown>) => unknown;
	/** Inserts a table into the editor at the current selection. */
	insertTable?: (rows?: number, columns?: number) => boolean;
	/** Inserts a manual page break at the current selection. */
	insertPageBreak?: () => boolean;
	/** Updates an object already known to the editor. */
	updateObject?: (objectId: string, patch?: Partial<NotebookDocumentObject>) => NotebookDocumentObject | null;
	/** Removes an object known to the editor. */
	removeObject?: (objectId: string) => boolean;
	/** Gets the current editable document content width in pixels. */
	getContentWidth?: () => number | null;
	/** Gets the current editor selection. */
	getSelection?: () => unknown;
	/** Gets paragraph formatting for the current selection. */
	getParagraphFormat?: () => ParagraphFormatSettings | null;
	/** Applies an editor formatting command. */
	format?: (commandId: string, value?: unknown) => unknown;
	/** Applies paragraph formatting to the current paragraph or selected paragraphs. */
	formatParagraph?: (format?: Partial<ParagraphFormatSettings>) => ParagraphFormatSettings | null;
	/** Undoes the most recent active editor change. */
	undo?: () => boolean;
	/** Redoes the most recent active editor change. */
	redo?: () => boolean;
};

/** Registry service exposing active editor operations without exposing Quill. */
type EditorSurfaceService = {
	/** Attaches the active editor surface adapter. */
	attachSurface: (surface: EditorSurfaceAdapter) => EditorSurfaceAdapter | null;
	/** Detaches the active editor surface adapter. */
	detachSurface: (surface?: EditorSurfaceAdapter) => boolean;
	/** Inserts a document object into the editor. */
	insertObject: (object: NotebookDocumentObject, options?: Record<string, unknown>) => unknown;
	/** Inserts a table into the editor. */
	insertTable: (rows?: number, columns?: number) => boolean;
	/** Inserts a manual page break into the editor. */
	insertPageBreak: () => boolean;
	/** Updates an object already known to the editor. */
	updateObject: (objectId: string, patch?: Partial<NotebookDocumentObject>) => NotebookDocumentObject | null;
	/** Removes an object known to the editor. */
	removeObject: (objectId: string) => boolean;
	/** Gets the active editor content width in pixels. */
	getContentWidth: () => number | null;
	/** Gets the active editor selection. */
	getSelection: () => unknown;
	/** Gets paragraph formatting for the current selection. */
	getParagraphFormat: () => ParagraphFormatSettings | null;
	/** Applies an editor formatting command. */
	format: (commandId: string, value?: unknown) => unknown;
	/** Applies paragraph formatting to the current paragraph or selected paragraphs. */
	formatParagraph: (format?: Partial<ParagraphFormatSettings>) => ParagraphFormatSettings | null;
	/** Undoes the most recent active editor change. */
	undo: () => boolean;
	/** Redoes the most recent active editor change. */
	redo: () => boolean;
	/** Subscribes to editor-surface events. */
	listen?: (eventName: string, listener: (...args: any[]) => void) => unknown;
	/** Removes an editor-surface event subscription. */
	unlisten?: (eventName: string, listener: unknown) => void;
};
