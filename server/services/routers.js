import { Service } from "@polylith/core";

export default class RoutersService extends Service {
	constructor(registry) {
		super('routers', registry);

		this.implement(['start', 'add', 'get', 'setLast']);
	}

	/** Initializes the router list. */
	start() {
		this.serviceNames = [];
	}

	/**
	 * Adds one route service before the final router.
	 *
	 * @param {string} name - Identifies the route service to add.
	 */
	add(name) {
		this.serviceNames.push(name);
	}

	/**
	 * Gets route service names in application order.
	 *
	 * @returns {string[]} Returns normal route services followed by the final router.
	 */
	get() {
		let routes = this.serviceNames.slice();

		if (this.lastRouter) {
			routes.push(this.lastRouter);
		}
		return routes;
	}

	/**
	 * Sets the route service that should run last.
	 *
	 * @param {string} name - Identifies the final route service.
	 */
	setLast(name) {
		this.lastRouter = name;
	}
}

new RoutersService();
