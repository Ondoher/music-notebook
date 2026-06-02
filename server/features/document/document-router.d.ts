/** Router service for document persistence routes. */
type DocumentRouterService = {
	/** Authenticates document API requests with a bearer token. */
	authenticate: (request: any, response: any, next: () => void) => Promise<any>;
	/** Adds document API routes to the app router. */
	routes: (express: any, router: any, app: any) => void;
};
