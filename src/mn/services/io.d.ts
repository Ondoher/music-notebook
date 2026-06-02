/** Options for one shared HTTP request. */
type IoSendOptions = {
	/** Request URL. */
	url?: string;
	/** HTTP request method. */
	method?: string;
	/** Request-specific headers. */
	headers?: Record<string, string>;
	/** Request body. */
	body?: any;
	/** Whether to add the bearer token when one is available. */
	auth?: boolean;
	/** Whether to skip automatic auth refresh handling for this request. */
	skipAuthRefresh?: boolean;
	/** Fetch credential behavior. */
	credentials?: RequestCredentials;
};

/** Normalized shared HTTP result. */
type IoResult = {
	/** Whether the request completed with a successful HTTP status. */
	success: boolean;
	/** HTTP response status when available. */
	status?: number;
	/** Parsed response body when available. */
	data?: any;
	/** Response headers when available. */
	headers?: Headers;
	/** Failure mode for non-HTTP failures. */
	failureMode?: string;
	/** Error message for non-HTTP failures. */
	message?: string;
	/** Original caught error for non-HTTP failures. */
	error?: any;
};

/** Service for shared client/server HTTP communication. */
type IoService = {
	/** Sets the app namespace sent with server requests. */
	setAppId: (appId: string) => void;
	/** Gets the app namespace sent with server requests. */
	getAppId: () => string;
	/** Sets the bearer token used for authenticated requests. */
	setBearerToken: (token: string) => void;
	/** Clears the bearer token used for authenticated requests. */
	clearBearerToken: () => void;
	/** Gets the current bearer token. */
	getBearerToken: () => string;
	/** Sets the handler used to refresh expired bearer tokens. */
	setAuthRefreshHandler: (handler: (() => Promise<boolean>) | null) => void;
	/** Adds standard headers to one request. */
	addStandardHeaders: (headers?: Record<string, string>, options?: IoSendOptions) => Record<string, string>;
	/** Sends one HTTP request. */
	send: (options: IoSendOptions) => Promise<IoResult>;
	/** Sends one GET request. */
	get: (url: string, options?: IoSendOptions) => Promise<IoResult>;
	/** Sends one JSON POST request. */
	post: (url: string, body: any, options?: IoSendOptions) => Promise<IoResult>;
};
