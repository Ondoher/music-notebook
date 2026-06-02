import { Service } from '@polylith/core';

const PASSWORD_HASH_VERSION = 1;

/** Manages client-side account creation, login, and authenticated account state. */
export default class AccountModelService extends Service {
	constructor(registry) {
		super('account-model', registry);
		this.implement([
			'ready',
			'getAccount',
			'getToken',
			'isAuthenticated',
			'clearSession',
			'restoreSession',
			'refreshAccessToken',
			'setLastOpenDocument',
			'getSalt',
			'hashPassword',
			'createAccount',
			'login',
			'logout',
		]);
		this.account = null;
		this.token = '';
		this.refreshPromise = null;
	}

	/** Subscribes to account model dependencies. */
	ready() {
		/** @type {IoService} */
		this.io = this.registry.subscribe('io');
		this.io.setAuthRefreshHandler?.(this.refreshAccessToken.bind(this));
		this.restoreSession();
	}

	/**
	 * Gets the currently authenticated account.
	 *
	 * @returns {AccountModelAccount | null} Returns the current account or null.
	 */
	getAccount() {
		return this.account ? {...this.account} : null;
	}

	/**
	 * Gets the current bearer token.
	 *
	 * @returns {string} Returns the raw bearer token.
	 */
	getToken() {
		return this.token;
	}

	/**
	 * Reports whether a bearer token is available.
	 *
	 * @returns {boolean} Returns true when the model has a token.
	 */
	isAuthenticated() {
		return Boolean(this.token);
	}

	/** Clears the current local account session. */
	clearSession() {
		this.account = null;
		this.token = '';
		this.io.clearBearerToken();
		this.fire('account-session-cleared');
	}

	/**
	 * Reads the public deterministic salt for a username.
	 *
	 * @param {string} username - Identifies the account username.
	 * @returns {Promise<string>} Returns the salt, or an empty string on failure.
	 */
	async getSalt(username) {
		let result = await this.io.post('api/accounts/salt', {username}, {auth: false});

		if (result.success && result.data?.success && result.data?.salt) {
			return result.data.salt;
		}

		return '';
	}

	/**
	 * Hashes one string with SHA-256.
	 *
	 * @param {string} value - Supplies the string to hash.
	 * @returns {Promise<string>} Returns the hexadecimal digest.
	 */
	async hashString(value) {
		let bytes = new TextEncoder().encode(value);
		let digest = await crypto.subtle.digest('SHA-256', bytes);

		return [...new Uint8Array(digest)]
			.map((byte) => byte.toString(16).padStart(2, '0'))
			.join('');
	}

	/**
	 * Builds the password hash sent to the server.
	 *
	 * @param {string} password - Supplies the user password.
	 * @param {string} salt - Supplies the server-provided salt.
	 * @returns {Promise<string>} Returns the password hash.
	 */
	async hashPassword(password, salt) {
		return this.hashString(`${PASSWORD_HASH_VERSION}:${salt}:${password}`);
	}

	/**
	 * Applies account state returned by the server.
	 *
	 * @param {AccountModelServerData} data - Supplies server response data.
	 * @returns {AccountModelAccount | null} Returns the applied account or null.
	 */
	applySession(data = {}) {
		if (!data.account) {
			return null;
		}

		this.account = {...data.account};
		this.token = typeof data.token === 'string' ? data.token : '';

		if (this.token) {
			this.io.setBearerToken(this.token);
		}

		this.fire('account-session-changed', {
			account: this.getAccount(),
			token: this.token,
		});
		return this.getAccount();
	}

	/**
	 * Restores account state from the durable server session cookie.
	 *
	 * @returns {Promise<IoResult>} Returns the session result.
	 */
	async restoreSession() {
		let result = await this.io.get('api/accounts/session', {
			auth: false,
			skipAuthRefresh: true,
		});

		if (result.success && result.data?.success) {
			this.applySession(result.data);
		} else {
			this.clearSession();
		}

		return result;
	}

	/**
	 * Refreshes the in-memory bearer token from the durable server session cookie.
	 *
	 * @returns {Promise<boolean>} Returns true when a fresh bearer token was applied.
	 */
	async refreshAccessToken() {
		if (this.refreshPromise) {
			return this.refreshPromise;
		}

		this.refreshPromise = this.restoreSession()
			.then((result) => Boolean(
				result.success
				&& result.data?.success
				&& result.data?.token
			))
			.finally(() => {
				this.refreshPromise = null;
			});

		return this.refreshPromise;
	}

	/**
	 * Stores the last open document id on the authenticated account.
	 *
	 * @param {string | null} documentId - Supplies the document id, or null to clear it.
	 * @returns {Promise<IoResult>} Returns the normalized HTTP result.
	 */
	async setLastOpenDocument(documentId) {
		let result = await this.io.send({
			method: 'PATCH',
			url: 'api/accounts/last-open-document',
			body: {
				documentId,
			},
		});

		if (result.success && result.data?.success && result.data.account) {
			this.account = {...result.data.account};
			this.fire('account-changed', {
				account: this.getAccount(),
			});
		}

		return result;
	}

	/**
	 * Creates an account using a password-derived hash.
	 *
	 * @param {AccountModelCredentials} credentials - Supplies account creation fields.
	 * @returns {Promise<IoResult>} Returns the normalized HTTP result.
	 */
	async createAccount({username, password, email = null}) {
		let salt = await this.getSalt(username);

		if (!salt) {
			return {
				success: false,
				reason: 'accounts.salt_failed',
			};
		}

		let passwordHash = await this.hashPassword(password, salt);
		let result = await this.io.post('api/accounts/create', {
			username,
			email,
			passwordHash,
		}, {auth: false});

		if (result.success && result.data?.success) {
			this.applySession(result.data);
		}

		return result;
	}

	/**
	 * Logs in using a password-derived hash.
	 *
	 * @param {AccountModelCredentials} credentials - Supplies login fields.
	 * @returns {Promise<IoResult>} Returns the normalized HTTP result.
	 */
	async login({username, password}) {
		let salt = await this.getSalt(username);

		if (!salt) {
			return {
				success: false,
				reason: 'accounts.salt_failed',
			};
		}

		let passwordHash = await this.hashPassword(password, salt);
		let result = await this.io.post('api/accounts/login', {
			username,
			passwordHash,
		}, {auth: false});

		if (result.success && result.data?.success) {
			this.applySession(result.data);
		}

		return result;
	}

	/**
	 * Logs out from the server session and clears local account state.
	 *
	 * @returns {Promise<IoResult>} Returns the normalized logout result.
	 */
	async logout() {
		let result = await this.io.post('api/accounts/logout', {});

		this.clearSession();
		return result;
	}
}

new AccountModelService();
