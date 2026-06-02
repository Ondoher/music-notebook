/** Router service for localized markdown content routes. */
type MarkdownRouterService = {
	/** Adds markdown content API routes to the app router. */
	routes: (express: any, router: any, app: any) => void;
};
