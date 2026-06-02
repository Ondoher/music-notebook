/** Current account dialog mode. */
type AccountDialogMode = '' | 'create' | 'login' | 'create-result';

/** Credentials submitted by the account dialog. */
type AccountDialogCredentials = {
	/** Username supplied by the user. */
	username: string;
	/** Password supplied by the user before client-side hashing. */
	password: string;
	/** Optional email address used during account creation. */
	email?: string | null;
};

/** Account dialog state exposed by the account controller. */
type AccountsDialogServiceState = {
	/** Current error reason or phrase key. */
	errorReason: string;
	/** Current dialog mode. */
	mode: AccountDialogMode;
	/** Whether the dialog is open. */
	open: boolean;
	/** Whether an account operation is in progress. */
	pending: boolean;
	/** Optional result reason or phrase key. */
	resultReason: string;
	/** Whether the current result dialog reports success. */
	resultSuccess: boolean;
};

/** Cancellable intent emitted before logout is finalized. */
type AccountLogoutIntent = {
	/** Account being logged out. */
	account: AccountModelAccount | null;
	/** Optional phrase key explaining why logout was cancelled. */
	cancelReason: string;
	/** Whether a listener cancelled the logout. */
	cancelled: boolean;
	/** Intent type. */
	type: 'logout';
	/** Cancels the pending logout. */
	cancel: (reason?: string) => void;
};

/** Controller service for account creation and login UI. */
type AccountsController = {
	/** Gets the current account dialog state. */
	getDialogState: () => AccountsDialogServiceState;
	/** Opens the create-account dialog. */
	openCreateAccountDialog: () => AccountsDialogServiceState;
	/** Opens the login dialog. */
	openLoginDialog: () => AccountsDialogServiceState;
	/** Opens the create-account result dialog. */
	openCreateResultDialog: (success: boolean, reason?: string) => AccountsDialogServiceState;
	/** Closes the account dialog. */
	closeDialog: () => AccountsDialogServiceState;
	/** Creates a cancellable logout intent. */
	createLogoutIntent: () => AccountLogoutIntent;
	/** Creates an account through the account model. */
	createAccount: (credentials: AccountDialogCredentials) => Promise<IoResult>;
	/** Logs in through the account model. */
	login: (credentials: AccountDialogCredentials) => Promise<IoResult>;
	/** Logs out of the local account session after confirmation. */
	logout: () => Promise<IoResult>;
	/** Gets the currently authenticated account. */
	getAccount: () => AccountModelAccount | null;
	/** Gets the account status and dialog host component for the app shell. */
	getComponent: () => React.ReactElement;
	/** Subscribes to account controller events. */
	listen?: (eventName: string, listener: (...args: any[]) => void) => unknown;
	/** Removes an account controller event subscription. */
	unlisten?: (eventName: string, listener: unknown) => void;
};
