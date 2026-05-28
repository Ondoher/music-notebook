import { Service } from '@polylith/core';

/**
 * Stores small app-level values that must update across independent React roots.
 */
export default class AppDataService extends Service {
	constructor(registry) {
		super('app-data', registry);
		this.implement(['start', 'watch', 'get', 'update', 'getSnapshot']);
		this.values = {};
	}

	/**
	 * Initializes the watched value store.
	 *
	 * @returns {void}
	 */
	start() {
		this.values = {};
	}

	/**
	 * Registers a watched value and returns its current value.
	 *
	 * @param {string} name
	 * @param {unknown} defaultValue
	 * @returns {unknown}
	 */
	watch(name, defaultValue = undefined) {
		if (this.values[name] === undefined) {
			this.values[name] = defaultValue;
		}

		return this.values[name];
	}

	/**
	 * Returns a watched value.
	 *
	 * @param {string} name
	 * @param {unknown} defaultValue
	 * @returns {unknown}
	 */
	get(name, defaultValue = undefined) {
		if (this.values[name] === undefined) {
			return defaultValue;
		}

		return this.values[name];
	}

	/**
	 * Updates a watched value and notifies subscribers.
	 *
	 * @param {string} name
	 * @param {unknown} value
	 * @returns {void}
	 */
	update(name, value) {
		if (this.values[name] === value) {
			return;
		}

		this.values[name] = value;
		this.fire('updated', name, value);
		this.fire(`updated:${name}`, value);
	}

	/**
	 * Returns a shallow snapshot of all watched values.
	 *
	 * @returns {Record<string, unknown>}
	 */
	getSnapshot() {
		return { ...this.values };
	}
}

new AppDataService();
