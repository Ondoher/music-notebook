import { Service } from "@polylith/core";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import AccountsDb from "./db/AccountsDb.js";
import AccountSessionsDb from "./db/AccountSessionsDb.js";

const ACCOUNT_VERSION = 1;
const DUPLICATE_KEY_ERROR = 11000;
const DEFAULT_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const DEFAULT_ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000;
const DEFAULT_SESSION_COOKIE_NAME = "mn_account_session";

/** Provides account creation, login, and password-salt behavior. */
export default class AccountsService extends Service {
	constructor(registry) {
		super("accounts", registry);

		this.implement([
			"ready",
			"getAccountsDb",
			"getAccountSessionsDb",
			"getSalt",
			"createAccount",
			"login",
			"session",
			"logout",
			"getAuthenticatedAccessToken",
			"sendUnauthorized",
			"setLastOpenDocument",
		]);
		this.accountsDb = null;
		this.accountSessionsDb = null;
		this.accessTokens = new Map();
	}

	/** Subscribes to account service dependencies. */
	ready() {
		/** @type {ConfigService} */
		this.config = this.registry.subscribe("config");
	}

	/**
	 * Gets the accounts database wrapper.
	 *
	 * @returns {AccountsDb} Returns the lazily created accounts database wrapper.
	 */
	getAccountsDb() {
		if (!this.accountsDb) {
			this.accountsDb = new AccountsDb({
				uri: this.config.get("mongo.uri", "mongodb://127.0.0.1:27017"),
				dbName: this.config.get("mongo.db", "music_notebook_dev"),
				collectionName: this.config.get(
					"mongo.collections.accounts",
					"accounts"
				),
				connectTimeoutMS: this.config.get(
					"mongo.connectTimeoutMS",
					5000
				),
				serverSelectionTimeoutMS: this.config.get(
					"mongo.serverSelectionTimeoutMS",
					5000
				),
			});
		}

		return this.accountsDb;
	}

	/**
	 * Gets the account sessions database wrapper.
	 *
	 * @returns {AccountSessionsDb} Returns the lazily created account sessions database wrapper.
	 */
	getAccountSessionsDb() {
		if (!this.accountSessionsDb) {
			this.accountSessionsDb = new AccountSessionsDb({
				uri: this.config.get("mongo.uri", "mongodb://127.0.0.1:27017"),
				dbName: this.config.get("mongo.db", "music_notebook_dev"),
				collectionName: this.config.get(
					"mongo.collections.accountSessions",
					"account_sessions"
				),
				connectTimeoutMS: this.config.get(
					"mongo.connectTimeoutMS",
					5000
				),
				serverSelectionTimeoutMS: this.config.get(
					"mongo.serverSelectionTimeoutMS",
					5000
				),
			});
		}

		return this.accountSessionsDb;
	}

	/**
	 * Normalizes a username for lookup.
	 *
	 * @param {unknown} username - Supplies the raw username candidate.
	 * @returns {string} Returns the trimmed, lower-case username.
	 */
	normalizeUsername(username) {
		return typeof username === "string"
			? username.trim().toLowerCase()
			: "";
	}

	/**
	 * Cleans a username for storage.
	 *
	 * @param {unknown} username - Supplies the raw username candidate.
	 * @returns {string} Returns the trimmed username.
	 */
	cleanUsername(username) {
		return typeof username === "string"
			? username.trim()
			: "";
	}

	/**
	 * Cleans an optional email address for storage.
	 *
	 * @param {unknown} email - Supplies the raw email candidate.
	 * @returns {string | null} Returns the trimmed email or null.
	 */
	cleanEmail(email) {
		if (typeof email !== "string") {
			return null;
		}

		let trimmed = email.trim();
		return trimmed ? trimmed : null;
	}

	/**
	 * Checks whether one password hash can be used for account operations.
	 *
	 * @param {unknown} passwordHash - Supplies the raw password hash candidate.
	 * @returns {boolean} Returns true when the password hash is a non-empty string.
	 */
	isUsablePasswordHash(passwordHash) {
		return typeof passwordHash === "string" && passwordHash.trim() !== "";
	}

	/**
	 * Builds the deterministic salt for one normalized username.
	 *
	 * @param {string} normalizedUsername - Identifies the normalized username.
	 * @returns {string} Returns the hexadecimal SHA-256 salt.
	 */
	buildSalt(normalizedUsername) {
		let saltSeed = this.config.get(
			"accounts.saltSeed",
			"music-notebook-dev-salt-seed"
		);

		return createHash("sha256")
			.update(`${normalizedUsername}:${saltSeed}`)
			.digest("hex");
	}

	/**
	 * Hashes one raw token for storage and lookup.
	 *
	 * @param {string} token - Supplies the raw token.
	 * @returns {string} Returns the hexadecimal SHA-256 token hash.
	 */
	hashToken(token) {
		return createHash("sha256").update(token).digest("hex");
	}

	/**
	 * Generates one raw token.
	 *
	 * @returns {string} Returns the raw token.
	 */
	generateToken() {
		return randomBytes(32).toString("base64url");
	}

	/**
	 * Generates one domain id.
	 *
	 * @returns {string} Returns the UUID.
	 */
	generateId() {
		return randomUUID();
	}

	/**
	 * Gets the configured session lifetime.
	 *
	 * @returns {number} Returns the lifetime in milliseconds.
	 */
	getSessionTtlMS() {
		return this.config.get("accounts.sessionTtlMS", DEFAULT_SESSION_TTL_MS);
	}

	/**
	 * Gets the configured short-lived access-token lifetime.
	 *
	 * @returns {number} Returns the lifetime in milliseconds.
	 */
	getAccessTokenTtlMS() {
		return this.config.get(
			"accounts.accessTokenTtlMS",
			DEFAULT_ACCESS_TOKEN_TTL_MS
		);
	}

	/**
	 * Gets the login-session cookie name.
	 *
	 * @returns {string} Returns the cookie name.
	 */
	getSessionCookieName() {
		return this.config.get(
			"accounts.sessionCookieName",
			DEFAULT_SESSION_COOKIE_NAME
		);
	}

	/**
	 * Gets the login-session cookie options.
	 *
	 * @returns {Record<string, any>} Returns Express cookie options.
	 */
	getSessionCookieOptions() {
		return {
			httpOnly: true,
			sameSite: "lax",
			secure: Boolean(this.config.get("accounts.sessionCookieSecure", false)),
			maxAge: this.getSessionTtlMS(),
			path: this.config.get("accounts.sessionCookiePath", "/"),
		};
	}

	/**
	 * Creates a durable login session for one account.
	 *
	 * @param {string} accountId - Identifies the account.
	 * @returns {Promise<string>} Returns the raw login-session token.
	 */
	async createSession(accountId) {
		let token = this.generateToken();
		let now = Date.now();

		await this.getAccountSessionsDb().createSession({
			tokenHash: this.hashToken(token),
			accountId,
			createdAt: now,
			expiresAt: now + this.getSessionTtlMS(),
			revokedAt: null,
			lastUsedAt: now,
		});

		return token;
	}

	/**
	 * Creates one short-lived access token in server memory.
	 *
	 * @param {string} accountId - Identifies the account.
	 * @param {string} sessionTokenHash - Identifies the backing login session.
	 * @returns {string} Returns the raw bearer token.
	 */
	createAccessToken(accountId, sessionTokenHash) {
		let token = this.generateToken();
		let tokenHash = this.hashToken(token);
		let now = Date.now();

		this.accessTokens.set(tokenHash, {
			accountId,
			sessionTokenHash,
			createdAt: now,
			expiresAt: now + this.getAccessTokenTtlMS(),
			lastUsedAt: now,
		});

		return token;
	}

	/**
	 * Removes expired in-memory access tokens.
	 *
	 * @param {number} [now] - Supplies the current time.
	 */
	cleanupAccessTokens(now = Date.now()) {
		for (let [tokenHash, token] of this.accessTokens.entries()) {
			if (token.expiresAt <= now) {
				this.accessTokens.delete(tokenHash);
			}
		}
	}

	/**
	 * Formats account data for API responses.
	 *
	 * @param {any} account - Supplies a stored account record.
	 * @param {string} [accountId] - Supplies a known account id.
	 * @returns {AccountResponseData} Returns client-safe account data.
	 */
	formatAccount(account, accountId = account.id) {
		return {
			id: accountId,
			username: account.username,
			email: account.email ?? null,
			lastOpenDocumentId: account.lastOpenDocumentId ?? null,
		};
	}

	/**
	 * Reads a bearer token from an Express request.
	 *
	 * @param {import("express").Request} request - Carries request headers.
	 * @returns {string} Returns the raw bearer token or an empty string.
	 */
	readBearerToken(request) {
		let authorization = request.get?.("authorization")
			|| request.headers?.authorization
			|| "";
		let match = String(authorization).match(/^Bearer\s+(.+)$/i);

		return match ? match[1].trim() : "";
	}

	/**
	 * Reads one cookie from an Express request without requiring cookie middleware.
	 *
	 * @param {import("express").Request} request - Carries request headers.
	 * @param {string} name - Identifies the cookie.
	 * @returns {string} Returns the decoded cookie value or an empty string.
	 */
	readCookie(request, name) {
		let header = request.get?.("cookie") || request.headers?.cookie || "";
		let cookies = String(header).split(/;\s*/);

		for (let cookie of cookies) {
			let separator = cookie.indexOf("=");

			if (separator < 0) {
				continue;
			}

			let cookieName = cookie.slice(0, separator);

			if (cookieName === name) {
				return decodeURIComponent(cookie.slice(separator + 1));
			}
		}

		return "";
	}

	/**
	 * Sets the durable login-session cookie.
	 *
	 * @param {import("express").Response} response - Receives the cookie.
	 * @param {string} token - Supplies the raw login-session token.
	 */
	setSessionCookie(response, token) {
		response.cookie?.(
			this.getSessionCookieName(),
			token,
			this.getSessionCookieOptions()
		);
	}

	/**
	 * Clears the durable login-session cookie.
	 *
	 * @param {import("express").Response} response - Receives the clear-cookie header.
	 */
	clearSessionCookie(response) {
		let options = {
			...this.getSessionCookieOptions(),
			maxAge: 0,
		};

		if (response.clearCookie) {
			response.clearCookie(this.getSessionCookieName(), options);
			return;
		}

		response.cookie?.(this.getSessionCookieName(), "", options);
	}

	/**
	 * Sends a generic unauthorized response.
	 *
	 * @param {import("express").Response} response - Receives the unauthorized response.
	 * @returns {import("express").Response} Returns the Express response.
	 */
	sendUnauthorized(response) {
		return response.status(401).json({
			success: false,
			reason: "unauthorized",
		});
	}

	/**
	 * Gets the active account and session for a durable login-session token.
	 *
	 * @param {string} sessionToken - Supplies the raw login-session token.
	 * @returns {Promise<AuthenticatedAccountSession | null>} Returns the active session context or null.
	 */
	async getAuthenticatedSessionToken(sessionToken) {
		if (!sessionToken) {
			return null;
		}

		let tokenHash = this.hashToken(sessionToken);
		let session = await this.getAccountSessionsDb().findByTokenHash(tokenHash);
		let now = Date.now();

		if (!session || session.revokedAt || session.expiresAt <= now) {
			return null;
		}

		let account = await this.getAccountsDb().findById(session.accountId);

		if (!account) {
			return null;
		}

		await this.getAccountSessionsDb().touchSession(tokenHash, now);

		return {
			account,
			session,
			tokenHash,
		};
	}

	/**
	 * Gets the active account and session for a cookie-backed request.
	 *
	 * @param {import("express").Request} request - Carries cookie headers.
	 * @returns {Promise<AuthenticatedAccountSession | null>} Returns the active session context or null.
	 */
	getAuthenticatedCookieSession(request) {
		return this.getAuthenticatedSessionToken(
			this.readCookie(request, this.getSessionCookieName())
		);
	}

	/**
	 * Gets the active account and session for a bearer-token request.
	 *
	 * @param {import("express").Request} request - Carries authorization headers.
	 * @returns {Promise<AuthenticatedAccountSession | null>} Returns the active session context or null.
	 */
	async getAuthenticatedAccessToken(request) {
		let token = this.readBearerToken(request);

		if (!token) {
			return null;
		}

		let tokenHash = this.hashToken(token);
		let accessToken = this.accessTokens.get(tokenHash);
		let now = Date.now();

		if (!accessToken || accessToken.expiresAt <= now) {
			this.accessTokens.delete(tokenHash);
			return null;
		}

		let session = await this.getAccountSessionsDb()
			.findByTokenHash(accessToken.sessionTokenHash);

		if (!session || session.revokedAt || session.expiresAt <= now) {
			this.accessTokens.delete(tokenHash);
			return null;
		}

		let account = await this.getAccountsDb().findById(accessToken.accountId);

		if (!account) {
			this.accessTokens.delete(tokenHash);
			return null;
		}

		accessToken.lastUsedAt = now;
		await this.getAccountSessionsDb().touchSession(
			accessToken.sessionTokenHash,
			now
		);

		return {
			account,
			session,
			tokenHash,
			sessionTokenHash: accessToken.sessionTokenHash,
		};
	}

	/**
	 * Revokes in-memory access tokens backed by one login session.
	 *
	 * @param {string} sessionTokenHash - Identifies the backing login session.
	 */
	revokeAccessTokensForSession(sessionTokenHash) {
		for (let [tokenHash, token] of this.accessTokens.entries()) {
			if (token.sessionTokenHash === sessionTokenHash) {
				this.accessTokens.delete(tokenHash);
			}
		}
	}

	/**
	 * Issues a durable session cookie and short-lived bearer token response.
	 *
	 * @param {import("express").Response} response - Receives the response.
	 * @param {any} account - Supplies a stored account record.
	 * @param {string} accountId - Identifies the account.
	 * @param {number} [statusCode] - Supplies an optional response status.
	 * @returns {Promise<import("express").Response>} Returns the Express response.
	 */
	async sendAuthenticated(response, account, accountId, statusCode = 200) {
		let sessionToken = await this.createSession(accountId);
		let sessionTokenHash = this.hashToken(sessionToken);
		let accessToken = this.createAccessToken(accountId, sessionTokenHash);

		this.setSessionCookie(response, sessionToken);

		return response.status(statusCode).json({
			success: true,
			token: accessToken,
			account: this.formatAccount(account, accountId),
		});
	}

	/**
	 * Sends a generic login failure response.
	 *
	 * @param {import("express").Response} response - Receives the login failure response.
	 * @returns {import("express").Response} Returns the Express response.
	 */
	sendLoginFailed(response) {
		return response.status(401).json({
			success: false,
			reason: "login_failed",
		});
	}

	/**
	 * Handles a request for a deterministic username salt.
	 *
	 * @param {import("express").Request} request - Carries the username.
	 * @param {import("express").Response} response - Receives the salt response.
	 * @returns {import("express").Response} Returns the Express response.
	 */
	getSalt(request, response) {
		let normalizedUsername = this.normalizeUsername(request.body?.username);

		if (!normalizedUsername) {
			return response.status(400).json({
				success: false,
				reason: "accounts.invalid_username",
			});
		}

		return response.json({
			success: true,
			salt: this.buildSalt(normalizedUsername),
		});
	}

	/**
	 * Builds an account record for storage.
	 *
	 * @param {AccountRecordInput} input - Supplies accepted account fields.
	 * @returns {AccountRecord} Returns the account record.
	 */
	buildAccountRecord({username, normalizedUsername, passwordHash, email}) {
		let now = Date.now();

		return {
			id: this.generateId(),
			username,
			normalizedUsername,
			version: ACCOUNT_VERSION,
			passwordHash,
			email,
			lastOpenDocumentId: null,
			createdAt: now,
			updatedAt: now,
		};
	}

	/**
	 * Creates an account from a request payload.
	 *
	 * @param {import("express").Request} request - Carries account creation fields.
	 * @param {import("express").Response} response - Receives the create-account response.
	 * @returns {Promise<import("express").Response>} Returns the Express response.
	 */
	async createAccount(request, response) {
		let username = this.cleanUsername(request.body?.username);
		let normalizedUsername = this.normalizeUsername(username);
		let passwordHash = request.body?.passwordHash;

		if (!username || !normalizedUsername) {
			return response.status(400).json({
				success: false,
				reason: "accounts.invalid_username",
			});
		}

		if (!this.isUsablePasswordHash(passwordHash)) {
			return response.status(400).json({
				success: false,
				reason: "accounts.invalid_password_hash",
			});
		}

		let account = this.buildAccountRecord({
			username,
			normalizedUsername,
			passwordHash,
			email: this.cleanEmail(request.body?.email),
		});

		try {
			let accountId = await this.getAccountsDb().createAccount(account);

			return this.sendAuthenticated(
				response,
				account,
				accountId,
				201
			);

		} catch (error) {
			if (error?.code === DUPLICATE_KEY_ERROR) {
				return response.status(409).json({
					success: false,
					reason: "accounts.username_unavailable",
				});
			}

			console.error("Unable to create account");
			console.error(error);

			return response.status(500).json({
				success: false,
				reason: "accounts.create_failed",
			});
		}
	}

	/**
	 * Logs a user in from a request payload.
	 *
	 * @param {import("express").Request} request - Carries login fields.
	 * @param {import("express").Response} response - Receives the login response.
	 * @returns {Promise<import("express").Response>} Returns the Express response.
	 */
	async login(request, response) {
		let normalizedUsername = this.normalizeUsername(request.body?.username);
		let passwordHash = request.body?.passwordHash;

		if (!normalizedUsername || !this.isUsablePasswordHash(passwordHash)) {
			return this.sendLoginFailed(response);
		}

		try {
			let account = await this.getAccountsDb()
				.findByNormalizedUsername(normalizedUsername);

			if (!account || account.passwordHash !== passwordHash) {
				return this.sendLoginFailed(response);
			}

			return this.sendAuthenticated(
				response,
				account,
				account.id
			);

		} catch (error) {
			console.error("Unable to log in");
			console.error(error);

			return this.sendLoginFailed(response);
		}
	}

	/**
	 * Exchanges the durable login-session cookie for a fresh bearer token.
	 *
	 * @param {import("express").Request} request - Carries the login-session cookie.
	 * @param {import("express").Response} response - Receives the session response.
	 * @returns {Promise<import("express").Response>} Returns the Express response.
	 */
	async session(request, response) {
		try {
			let authenticated = await this.getAuthenticatedCookieSession(request);

			if (!authenticated) {
				return this.sendUnauthorized(response);
			}

			let accessToken = this.createAccessToken(
				authenticated.session.accountId,
				authenticated.tokenHash
			);

			return response.json({
				success: true,
				token: accessToken,
				account: this.formatAccount(authenticated.account),
			});

		} catch (error) {
			console.error("Unable to read account session");
			console.error(error);

			return this.sendUnauthorized(response);
		}
	}

	/**
	 * Logs out the current login session.
	 *
	 * @param {import("express").Request} request - Carries the session cookie or bearer token.
	 * @param {import("express").Response} response - Receives the logout response.
	 * @returns {Promise<import("express").Response>} Returns the Express response.
	 */
	async logout(request, response) {
		try {
			let authenticated = await this.getAuthenticatedCookieSession(request)
				|| await this.getAuthenticatedAccessToken(request);

			if (!authenticated) {
				this.clearSessionCookie(response);
				return this.sendUnauthorized(response);
			}

			await this.getAccountSessionsDb().revokeByTokenHash(
				authenticated.sessionTokenHash || authenticated.tokenHash,
				Date.now()
			);
			this.revokeAccessTokensForSession(
				authenticated.sessionTokenHash || authenticated.tokenHash
			);
			this.clearSessionCookie(response);

			return response.json({
				success: true,
			});

		} catch (error) {
			console.error("Unable to log out");
			console.error(error);

			return this.sendUnauthorized(response);
		}
	}

	/**
	 * Stores the last open document id for the authenticated account.
	 *
	 * @param {import("express").Request} request - Carries account metadata fields.
	 * @param {import("express").Response} response - Receives the update response.
	 * @returns {Promise<import("express").Response>} Returns the Express response.
	 */
	async setLastOpenDocument(request, response) {
		try {
			let authenticated = await this.getAuthenticatedAccessToken(request);

			if (!authenticated) {
				return this.sendUnauthorized(response);
			}

			let rawDocumentId = request.body?.documentId;
			let lastOpenDocumentId = typeof rawDocumentId === "string" && rawDocumentId.trim()
				? rawDocumentId.trim()
				: null;
			let account = await this.getAccountsDb().updateAccount(
				authenticated.account.id,
				{
					lastOpenDocumentId,
					updatedAt: Date.now(),
				}
			);

			return response.json({
				success: true,
				account: this.formatAccount(account),
			});

		} catch (error) {
			console.error("Unable to update last open document");
			console.error(error);

			return response.status(500).json({
				success: false,
				reason: "accounts.update_failed",
			});
		}
	}
}

new AccountsService();
