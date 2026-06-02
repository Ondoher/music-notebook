/// <reference path="./components/types/DocumentList.d.ts" />
/// <reference path="./components/types/DocumentNameDialog.d.ts" />
/// <reference path="./components/types/DocumentOpenDialog.d.ts" />

/** State for the document feature message dialog. */
type DocumentControllerDialogState = {
	/** Optional action buttons shown by the message dialog. */
	buttons?: BaseDialogButton[] | null;
	/** Whether the message dialog is open. */
	open: boolean;
	/** Dialog title phrase key. */
	title: string;
	/** Dialog content phrase key. */
	content: string;
};

/** State for the document naming dialog. */
type DocumentControllerNameDialogState = DocumentNameDialogState;

/** State for the document open dialog. */
type DocumentControllerOpenDialogState = DocumentOpenDialogState;

/** Frontend document feature controller. */
type DocumentController = {
	/** Gets the feature-owned component rendered by the app shell. */
	getComponent: () => React.ReactElement;
	/** Gets the current message dialog state. */
	getDialogState: () => DocumentControllerDialogState;
	/** Gets the current document name dialog state. */
	getNameDialogState: () => DocumentControllerNameDialogState;
	/** Gets the current document open dialog state. */
	getOpenDialogState: () => DocumentControllerOpenDialogState;
	/** Gets localized text config for one document name dialog mode. */
	getNameDialogModeConfig: (mode: DocumentNameDialogMode) => DocumentNameDialogModeConfig;
	/** Closes the current message dialog. */
	closeDialog: () => DocumentControllerDialogState;
	/** Closes the current document name dialog. */
	closeNameDialog: () => DocumentControllerNameDialogState;
	/** Closes the current document open dialog. */
	closeOpenDialog: () => DocumentControllerOpenDialogState;
	/** Updates the draft name in the document name dialog. */
	updateNameDialogName: (name: string) => DocumentControllerNameDialogState;
	/** Submits the current document name dialog action. */
	submitNameDialog: () => Promise<DocumentControllerNameDialogState>;
	/** Selects the persisted document to open. */
	selectOpenDialogDocument: (documentId: string) => DocumentControllerOpenDialogState;
	/** Opens the selected document from the open dialog. */
	submitOpenDialog: () => Promise<DocumentControllerOpenDialogState | IoResult>;
	/** Loads one persisted document into the document model. */
	loadDocument: (documentId: string, options?: {updateLastOpen?: boolean}) => Promise<IoResult>;
	/** Opens the account's last open document when startup state allows it. */
	openLastOpenDocument: (account?: AccountModelAccount | null) => Promise<IoResult | null>;
	/** Opens the persisted document rename dialog. */
	openRenameDialog: () => Promise<DocumentControllerNameDialogState> | DocumentControllerDialogState;
	/** Renames the current persisted document. */
	renameCurrentDocument: (name: string) => Promise<IoResult>;
	/** Clears the current document after logout when doing so will not discard unsaved changes. */
	clearDocumentAfterLogout: () => boolean;
	/** Handles a cancellable logout intent before the account session is cleared. */
	onLogoutIntent: (intent: AccountLogoutIntent) => Promise<void> | undefined;
	/** Handles a selected document message dialog action. */
	onDialogAction: (buttonId: string) => DocumentControllerDialogState | Promise<DocumentControllerDialogState | null> | null;
	/** Registers document menu items. */
	registerMenuItems: () => boolean;
};
