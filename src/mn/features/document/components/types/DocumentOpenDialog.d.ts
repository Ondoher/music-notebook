/** State for the document open dialog. */
type DocumentOpenDialogState = {
	/** Documents available to open. */
	documents: DocumentListItem[];
	/** Current validation or load error phrase key. */
	errorReason: string;
	/** Whether the dialog is open. */
	open: boolean;
	/** Whether an open operation is in progress. */
	pending: boolean;
	/** Selected persisted document id. */
	selectedDocumentId: string;
};

/** Props for the document open dialog. */
type DocumentOpenDialogProps = {
	/** Document feature controller. */
	documentController: DocumentController;
};
