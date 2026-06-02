import { Service } from '@polylith/core';

/**
 * Registry and render request queue for feature-owned views mounted by EditorPage.
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

	start() {
		this.views = new Map();
		this.requests = new Map();
	}

	registerView(name, view) {
		if (!name || typeof view?.getComponent !== 'function') {
			console.warn('Cannot register an editor view without a name and getComponent function.');
			return () => null;
		}

		this.views.set(name, view);
		this.fireUpdated();
		return () => this.unregisterView(name);
	}

	unregisterView(name) {
		const removed = this.views.delete(name);

		if (this.requests.delete(name) || removed) {
			this.fireUpdated();
		}

		return removed;
	}

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

	closeView(name) {
		const removed = this.requests.delete(name);

		if (removed) {
			this.fireUpdated();
		}

		return removed;
	}

	getRequestedViews() {
		return Array.from(this.requests.values());
	}

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

	fireUpdated() {
		this.fire?.('updated', this.getRequestedViews());
	}
}

new EditorViewsService();
