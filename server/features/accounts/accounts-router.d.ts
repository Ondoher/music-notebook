/** Router service for account API routes. */
type AccountsRouterService = {
	/** Authenticates account metadata routes with a bearer token. */
	authenticate: (request: any, response: any, next: () => void) => Promise<any>;
	/** Adds account API routes to the app router. */
	routes: (express: any, router: any, app: any) => void;
};
