/** Defines Mongo connection settings for the accounts collection. */
type AccountsDbOptions = {
	/** Mongo connection URI. */
	uri: string;
	/** Mongo database name. */
	dbName: string;
	/** Mongo collection name. */
	collectionName: string;
	/** Milliseconds to wait while opening a socket connection. */
	connectTimeoutMS?: number;
	/** Milliseconds to wait while selecting a usable Mongo server. */
	serverSelectionTimeoutMS?: number;
};

/** Defines Mongo connection settings for the account sessions collection. */
type AccountSessionsDbOptions = AccountsDbOptions;

/** Stores one account record in Mongo. */
type AccountRecord = {
	/** Domain account id. */
	id: string;
	/** User-facing username. */
	username: string;
	/** Normalized username used for account lookup. */
	normalizedUsername: string;
	/** Account password/verifier format version. */
	version: number;
	/** Client-derived password hash. */
	passwordHash: string;
	/** Optional email address. */
	email: string | null;
	/** Last document id opened by this account, or null when none is known. */
	lastOpenDocumentId: string | null;
	/** Account creation time from Date.now(). */
	createdAt: number;
	/** Account update time from Date.now(). */
	updatedAt: number;
};

/** Stores one durable cookie-backed account session. */
type AccountSessionRecord = {
	/** SHA-256 hash of the raw session token. */
	tokenHash: string;
	/** Account id associated with the session. */
	accountId: string;
	/** Session creation time from Date.now(). */
	createdAt: number;
	/** Session expiration time from Date.now(). */
	expiresAt: number;
	/** Session revocation time from Date.now(), or null when active. */
	revokedAt: number | null;
	/** Last successful use time from Date.now(). */
	lastUsedAt: number;
};
