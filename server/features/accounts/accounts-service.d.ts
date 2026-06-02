/** Supplies accepted account fields before storage metadata is added. */
type AccountRecordInput = {
	/** User-facing username. */
	username: string;
	/** Normalized username used for account lookup. */
	normalizedUsername: string;
	/** Client-derived password hash. */
	passwordHash: string;
	/** Optional email address. */
	email: string | null;
	/** Last document id opened by this account, or null when none is known. */
	lastOpenDocumentId?: string | null;
};

/** Stores one user account. */
type AccountRecord = AccountRecordInput & {
	/** Domain account id. */
	id: string;
	/** Account password/verifier format version. */
	version: number;
	/** Account creation time from Date.now(). */
	createdAt: number;
	/** Account update time from Date.now(). */
	updatedAt: number;
};

/** Account data returned to clients after create or login. */
type AccountResponseData = {
	/** Stored account id. */
	id: string;
	/** User-facing username. */
	username: string;
	/** Optional email address. */
	email: string | null;
	/** Last document id opened by this account, or null when none is known. */
	lastOpenDocumentId: string | null;
};

/** Authenticated account session context. */
type AuthenticatedAccountSession = {
	/** Stored account record. */
	account: any;
	/** Stored session record. */
	session: any;
	/** SHA-256 hash of the token used for this authentication check. */
	tokenHash: string;
	/** SHA-256 hash of the backing durable session token. */
	sessionTokenHash?: string;
};

/** Minimal request shape used by account route handlers. */
type AccountRequest = {
	/** Parsed request body. */
	body?: Record<string, any>;
	/** Parsed request headers. */
	headers?: Record<string, any>;
	/** Gets one request header. */
	get?: (name: string) => string | undefined;
};

/** Minimal response shape used by account route handlers. */
type AccountResponse = {
	/** Sets the HTTP response status. */
	status: (statusCode: number) => AccountResponse;
	/** Sends a JSON response body. */
	json: (body: any) => AccountResponse;
	/** Sets a response cookie. */
	cookie?: (name: string, value: string, options?: Record<string, any>) => AccountResponse;
	/** Clears a response cookie. */
	clearCookie?: (name: string, options?: Record<string, any>) => AccountResponse;
};

/** Database wrapper used by the accounts service. */
type AccountsDb = {
	/** Creates one account record. */
	createAccount: (account: AccountRecord) => Promise<string>;
	/** Finds one account by normalized username. */
	findByNormalizedUsername: (normalizedUsername: string) => Promise<any>;
	/** Finds one account by id. */
	findById: (accountId: string) => Promise<any>;
	/** Updates one account by id. */
	updateAccount: (accountId: string, patch: Partial<AccountRecord>) => Promise<any>;
};

/** Service for account creation, login, and password-salt behavior. */
type AccountsService = {
	/** Gets the accounts database wrapper. */
	getAccountsDb: () => AccountsDb;
	/** Gets the account sessions database wrapper. */
	getAccountSessionsDb: () => any;
	/** Gets the active account and session for a bearer-token request. */
	getAuthenticatedAccessToken: (request: AccountRequest) => Promise<AuthenticatedAccountSession | null>;
	/** Handles a request for a deterministic username salt. */
	getSalt: (request: AccountRequest, response: AccountResponse) => AccountResponse;
	/** Creates an account from a request payload. */
	createAccount: (request: AccountRequest, response: AccountResponse) => Promise<AccountResponse>;
	/** Logs a user in from a request payload. */
	login: (request: AccountRequest, response: AccountResponse) => Promise<AccountResponse>;
	/** Exchanges the durable login-session cookie for a fresh bearer token. */
	session: (request: AccountRequest, response: AccountResponse) => Promise<AccountResponse>;
	/** Logs out the current login session. */
	logout: (request: AccountRequest, response: AccountResponse) => Promise<AccountResponse>;
	/** Stores the last open document id for the authenticated account. */
	setLastOpenDocument: (request: AccountRequest, response: AccountResponse) => Promise<AccountResponse>;
};
