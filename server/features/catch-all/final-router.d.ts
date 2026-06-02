/** Router service for the final app-shell fallback route. */
type FinalRouterService = {
	/** Adds the app-shell fallback route. */
	routes: (express: any, router: any, app: any) => void;
};
