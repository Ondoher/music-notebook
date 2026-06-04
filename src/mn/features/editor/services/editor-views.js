import { Service } from '@polylith/core';

/**
 * Registry and render request queue for feature-owned views mounted by EditorPage.
 *
 * @extends {Service}
 */
export default class EditorViewsService extends Service {
	constructor(registry) {
		super('editor-views', registry);
		this.implement([
			'start',
			'registerView',
			'unregisterView',
			'requestView',
			'closeView',
			'getRequestedViews',
			'getComponent',
		]);
	}

	/**
	 * Initializes registered editor views and active render requests.
	 *
	 * @returns {void}
	 */
	start() {
		/** @type {Map<string, EditorViewProvider>} */
		this.views = new Map();
		/** @type {Map<string, EditorViewRequest>} */
		this.requests = new Map();
	}

	/**
	 * Registers a named editor view provider.
	 *
	 * @param {string} name - Unique editor view name.
	 * @param {EditorViewProvider} view - Provider that returns a renderable component.
	 * @returns {() => boolean | null} Function that unregisters the view.
	 */
	registerView(name, view) {
		if (!name || typeof view?.getComponent !== 'function') {
			console.warn('Cannot register an editor view without a name and getComponent function.');
			return () => null;
		}

		this.views.set(name, view);
		this.fireUpdated();
		return () => this.unregisterView(name);
	}

	/**
	 * Unregisters a named editor view provider and any matching active request.
	 *
	 * @param {string} name - Editor view name.
	 * @returns {boolean} Whether a registered view was removed.
	 */
	unregisterView(name) {
		const removed = this.views.delete(name);

		if (this.requests.delete(name) || removed) {
			this.fireUpdated();
		}

		return removed;
	}

	/**
	 * Requests that a registered editor view be mounted by EditorPage.
	 *
	 * @param {string} name - Editor view name.
	 * @param {Record<string, unknown>} props - Props to pass to the view provider.
	 * @returns {boolean} Whether the request was accepted.
	 */
	requestView(name, props = {}) {
		if (!name) {
			return false;
		}

		this.requests.set(name, {
			name,
			props,
		});
		this.fireUpdated();
		return true;
	}

	/**
	 * Closes an active editor view request.
	 *
	 * @param {string} name - Editor view name.
	 * @returns {boolean} Whether an active request was removed.
	 */
	closeView(name) {
		const removed = this.requests.delete(name);

		if (removed) {
			this.fireUpdated();
		}

		return removed;
	}

	/**
	 * Gets the current editor view requests in mount order.
	 *
	 * @returns {EditorViewRequest[]} Active editor view requests.
	 */
	getRequestedViews() {
		return Array.from(this.requests.values());
	}

	/**
	 * Gets a renderable component for a request and editor context.
	 *
	 * @param {EditorViewRequest | string} request - Active request or view name.
	 * @param {EditorViewContext} editorContext - Editor-owned context for the view.
	 * @returns {unknown | null} Renderable component or null when no provider exists.
	 */
	getComponent(request, editorContext = {}) {
		const normalizedRequest = typeof request === 'string'
			? this.requests.get(request)
			: request;
		const view = this.views.get(normalizedRequest?.name);

		if (!view) {
			return null;
		}

		return view.getComponent({
			...(normalizedRequest.props || {}),
			editorContext,
			viewName: normalizedRequest.name,
		});
	}

	/**
	 * Fires the updated event with the current requested views.
	 *
	 * @returns {void}
	 */
	fireUpdated() {
		this.fire?.('updated', this.getRequestedViews());
	}
}

new EditorViewsService();
