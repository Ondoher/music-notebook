/** Account data returned to the client after account creation or login. */
type AccountModelAccount = {
	/** Stored account id. */
	id: string;
	/** User-facing username. */
	username: string;
	/** Optional email address. */
	email: string | null;
	/** Last document id opened by this account, or null when none is known. */
	lastOpenDocumentId?: string | null;
};

/** Credentials accepted by the client account model. */
type AccountModelCredentials = {
	/** User-facing username. */
	username: string;
	/** Plain password before client-side hashing. */
	password: string;
	/** Optional email address for account creation. */
	email?: string | null;
};

/** Account response body returned by the server. */
type AccountModelServerData = {
	/** Whether the server-side operation succeeded. */
	success?: boolean;
	/** Bearer token returned after authenticated operations. */
	token?: string;
	/** Authenticated account data. */
	account?: AccountModelAccount;
};

/** Client-side account model service. */
type AccountModelService = {
	/** Gets the currently authenticated account. */
	getAccount: () => AccountModelAccount | null;
	/** Gets the current bearer token. */
	getToken: () => string;
	/** Reports whether a bearer token is available. */
	isAuthenticated: () => boolean;
	/** Clears the current local account session. */
	clearSession: () => void;
	/** Restores account state from the durable server session cookie. */
	restoreSession: () => Promise<IoResult>;
	/** Refreshes the in-memory bearer token from the durable server session cookie. */
	refreshAccessToken: () => Promise<boolean>;
	/** Stores the last open document id on the authenticated account. */
	setLastOpenDocument: (documentId: string | null) => Promise<IoResult>;
	/** Reads the public deterministic salt for a username. */
	getSalt: (username: string) => Promise<string>;
	/** Builds the password hash sent to the server. */
	hashPassword: (password: string, salt: string) => Promise<string>;
	/** Creates an account using a password-derived hash. */
	createAccount: (credentials: AccountModelCredentials) => Promise<IoResult>;
	/** Logs in using a password-derived hash. */
	login: (credentials: AccountModelCredentials) => Promise<IoResult>;
	/** Logs out from the server session and clears local account state. */
	logout: () => Promise<IoResult>;
	/** Subscribes to account-model events. */
	listen?: (eventName: string, listener: (...args: any[]) => void) => unknown;
	/** Removes an account-model event subscription. */
	unlisten?: (eventName: string, listener: unknown) => void;
};
