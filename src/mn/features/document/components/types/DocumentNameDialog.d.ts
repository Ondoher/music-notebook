/** Dialog mode for document naming flows. */
type DocumentNameDialogMode = '' | 'save-new' | 'save-as' | 'rename';

/** Configured localized text for one name dialog mode. */
type DocumentNameDialogModeConfig = {
	/** Dialog title phrase key. */
	title: string;
	/** Dialog description phrase key. */
	description: string;
	/** Submit button phrase key. */
	submitLabel: string;
	/** Cancel button phrase key. */
	cancelLabel: string;
	/** Optional conflict warning phrase key. */
	conflictMessage?: string;
};

/** State for the document name dialog. */
type DocumentNameDialogState = {
	/** Whether the current name conflict has been confirmed by an attempted submit. */
	conflictConfirmed: boolean;
	/** Existing document with a matching name, when detected by the UI. */
	conflictDocument: DocumentListItem | null;
	/** Documents shown for name comparison and selection. */
	documents: DocumentListItem[];
	/** Current validation or save error phrase key. */
	errorReason: string;
	/** Current dialog mode. */
	mode: DocumentNameDialogMode;
	/** Draft document name. */
	name: string;
	/** Whether the dialog is open. */
	open: boolean;
	/** Whether a save operation is in progress. */
	pending: boolean;
};

/** Props for the document name dialog. */
type DocumentNameDialogProps = {
	/** Document feature controller. */
	documentController: DocumentController;
};
