/** State for the document-format dialog. */
type DocumentFormatDialogState = {
	/** Whether the dialog is open. */
	open: boolean;
	/** Current document format snapshot. */
	format: Record<string, unknown>;
};

/** Controller service for the document-format feature. */
type DocumentFormatController = {
	/** Gets the feature-owned component rendered by the app shell. */
	getComponent: () => React.ReactElement;
	/** Gets the current document format. */
	getFormat: () => Record<string, unknown>;
	/** Gets the current dialog state. */
	getDialogState: () => DocumentFormatDialogState;
	/** Opens the dialog. */
	openDialog: () => DocumentFormatDialogState;
	/** Closes the dialog. */
	closeDialog: () => DocumentFormatDialogState;
	/** Applies a document format update. */
	applyFormat: (format?: Record<string, unknown>) => Record<string, unknown>;
	/** Subscribes to document-format controller events. */
	listen?: (eventName: string, listener: (...args: any[]) => void) => unknown;
	/** Removes a document-format controller event subscription. */
	unlisten?: (eventName: string, listener: unknown) => void;
};
