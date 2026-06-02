/** Service for collecting server route services in registration order. */
type RoutersService = {
	/** Adds one route service before the final router. */
	add: (name: string) => void;
	/** Gets route service names in application order. */
	get: () => string[];
	/** Sets the route service that should run last. */
	setLast: (name: string) => void;
};
