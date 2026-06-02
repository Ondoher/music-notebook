import { Service } from '@polylith/core';

/**
 * Lets features opt into editor/Quill DOM interactions without owning listeners.
 *
 * @extends {Service}
 */
export default class EditorInteractionsService extends Service {
	constructor(registry) {
		super('editor-interactions', registry);
		this.implement(['start', 'registerHandler', 'unregisterHandler', 'getHandlers', 'dispatch']);
	}

	start() {
		this.handlers = [];
	}

	registerHandler(handler = {}) {
		if (!handler.id || typeof handler.handle !== 'function') {
			console.warn('Cannot register editor interaction handler without an id and handle function.');
			return () => null;
		}

		const normalized = {
			events: Array.isArray(handler.events) ? handler.events : [],
			handle: handler.handle,
			id: handler.id,
			priority: Number.isFinite(Number(handler.priority)) ? Number(handler.priority) : 0,
		};

		this.unregisterHandler(normalized.id);
		this.handlers.push(normalized);
		this.handlers.sort((first, second) => second.priority - first.priority);
		return () => this.unregisterHandler(normalized.id);
	}

	unregisterHandler(id) {
		const before = this.handlers.length;

		this.handlers = this.handlers.filter((handler) => handler.id !== id);
		return this.handlers.length !== before;
	}

	getHandlers(eventName = '') {
		return this.handlers.filter((handler) => (
			!eventName || handler.events.includes(eventName)
		));
	}

	dispatch(eventName, event, context = {}) {
		const handlers = this.getHandlers(eventName);

		for (const handler of handlers) {
			const result = handler.handle(event, {
				...context,
				eventName,
			});

			if (result === true || result?.handled === true) {
				return {
					handled: true,
					handlerId: handler.id,
					result,
				};
			}
		}

		return {
			handled: false,
		};
	}
}

new EditorInteractionsService();
