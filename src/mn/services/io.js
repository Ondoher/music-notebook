import { Service } from '@polylith/core';

/** Provides shared HTTP communication behavior for Music Notebook. */
export default class IoService extends Service {
	constructor(registry) {
		super('io', registry);

		this.implement([
			'ready',
			'setAppId',
			'getAppId',
			'setBearerToken',
			'clearBearerToken',
			'getBearerToken',
			'setAuthRefreshHandler',
			'addStandardHeaders',
			'send',
			'get',
			'post',
		]);
		this.appId = 'mn';
		this.bearerToken = '';
		this.authRefreshHandler = null;
	}

	/** Subscribes to optional HTTP support services. */
	ready() {
		/** @type {LocalizeService} */
		this.localize = this.registry.subscribe('localize');
	}

	/**
	 * Sets the app namespace sent with server requests.
	 *
	 * @param {string} appId - Supplies the app namespace.
	 */
	setAppId(appId) {
		this.appId = typeof appId === 'string' && appId.trim()
			? appId.trim()
			: 'mn';
	}

	/**
	 * Gets the app namespace sent with server requests.
	 *
	 * @returns {string} Returns the app namespace.
	 */
	getAppId() {
		return this.appId;
	}

	/**
	 * Sets the bearer token used for authenticated requests.
	 *
	 * @param {string} token - Supplies the raw bearer token.
	 */
	setBearerToken(token) {
		this.bearerToken = typeof token === 'string' ? token : '';
	}

	/** Clears the bearer token used for authenticated requests. */
	clearBearerToken() {
		this.bearerToken = '';
	}

	/**
	 * Gets the current bearer token.
	 *
	 * @returns {string} Returns the raw bearer token.
	 */
	getBearerToken() {
		return this.bearerToken;
	}

	/**
	 * Sets the handler used to refresh expired bearer tokens.
	 *
	 * @param {(() => Promise<boolean>) | null} handler - Supplies the refresh handler.
	 */
	setAuthRefreshHandler(handler) {
		this.authRefreshHandler = typeof handler === 'function' ? handler : null;
	}

	/**
	 * Adds standard headers to one request.
	 *
	 * @param {Record<string, string>} [headers] - Supplies request-specific headers.
	 * @param {IoSendOptions} [options] - Supplies request options.
	 * @returns {Record<string, string>} Returns merged headers.
	 */
	addStandardHeaders(headers = {}, options = {}) {
		let moreHeaders = {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			'X-Music-Notebook-App-Id': this.getAppId(),
		};

		if (this.localize?.getLanguage) {
			moreHeaders['Accept-Language'] = this.localize.getLanguage();
		}

		if (options.auth !== false && this.bearerToken) {
			moreHeaders.Authorization = `Bearer ${this.bearerToken}`;
		}

		return {...moreHeaders, ...headers};
	}

	/**
	 * Reads a response body according to its content type.
	 *
	 * @param {Response} response - Supplies the fetch response.
	 * @returns {Promise<any>} Returns parsed JSON, text, or null.
	 */
	async readResponseBody(response) {
		let contentType = response.headers.get('content-type') || '';

		if (contentType.includes('application/json')) {
			return response.json();
		}

		let text = await response.text();
		return text || null;
	}

	/**
	 * Sends one HTTP request without auth refresh retry behavior.
	 *
	 * @param {IoSendOptions} options - Supplies request options.
	 * @returns {Promise<IoResult>} Returns the normalized HTTP result.
	 */
	async sendOnce(options) {
		let headers = this.addStandardHeaders(options.headers || {}, options);
		let fetchOptions = {
			method: options.method || 'GET',
			headers,
			credentials: options.credentials || 'same-origin',
		};

		if (options.body !== undefined) {
			fetchOptions.body = typeof options.body === 'string'
				? options.body
				: JSON.stringify(options.body);
		}

		try {
			let response = await fetch(options.url, fetchOptions);
			let data = await this.readResponseBody(response);
			let result = {
				success: response.ok,
				status: response.status,
				data,
				headers: response.headers,
			};

			if (response.ok) {
				this.fire('ioResult', options, result);
				return result;
			}

			return result;

		} catch (error) {
			let result = {
				success: false,
				failureMode: 'exception',
				message: error.message,
				error,
			};

			return result;
		}
	}

	/**
	 * Sends one HTTP request.
	 *
	 * @param {IoSendOptions} options - Supplies request options.
	 * @returns {Promise<IoResult>} Returns the normalized HTTP result.
	 */
	async send(options) {
		let result = await this.sendOnce(options);

		if (
			result.status === 401
			&& options.auth !== false
			&& !options.skipAuthRefresh
			&& this.authRefreshHandler
		) {
			let refreshed = await this.authRefreshHandler();

			if (refreshed) {
				return this.sendOnce({
					...options,
					skipAuthRefresh: true,
				});
			}
		}

		if (!result.success) {
			this.fire('ioError', result);
		}

		return result;
	}

	/**
	 * Sends one GET request.
	 *
	 * @param {string} url - Identifies the request URL.
	 * @param {IoSendOptions} [options] - Supplies request options.
	 * @returns {Promise<IoResult>} Returns the normalized HTTP result.
	 */
	get(url, options = {}) {
		return this.send({
			...options,
			url,
			method: 'GET',
		});
	}

	/**
	 * Sends one JSON POST request.
	 *
	 * @param {string} url - Identifies the request URL.
	 * @param {any} body - Supplies the JSON request body.
	 * @param {IoSendOptions} [options] - Supplies request options.
	 * @returns {Promise<IoResult>} Returns the normalized HTTP result.
	 */
	post(url, body, options = {}) {
		return this.send({
			...options,
			url,
			body,
			method: 'POST',
		});
	}
}

new IoService();
