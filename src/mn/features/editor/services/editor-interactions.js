import { Service } from '@polylith/core';

/**
 * Lets features opt into editor/Quill DOM interactions without owning listeners.
 *
 * @extends {Service}
 */
export default class EditorInteractionsService extends Service {
	constructor(registry) {
		super('editor-interactions', registry);
		this.implement([
			'start',
			'registerHandler',
			'unregisterHandler',
			'getHandlers',
			'notifyEditorReady',
			'dispatch',
		]);
	}

	/**
	 * Initializes the registered editor interaction handlers.
	 *
	 * @returns {void}
	 */
	start() {
		/** @type {EditorInteractionHandlerRegistration[]} */
		this.handlers = [];
	}

	/**
	 * Registers a service-owned editor interaction handler.
	 *
	 * The handler stores ownership and event metadata for a service that
	 * implements `handleEditorEvent`.
	 *
	 * @param {Partial<EditorInteractionHandlerRegistration>} handler - Handler registration details.
	 * @returns {() => boolean | null} Function that unregisters the handler.
	 */
	registerHandler(handler = {}) {
		if (!handler.id || !handler.serviceName || !Array.isArray(handler.events)) {
			console.warn('Cannot register editor interaction handler without an id, serviceName, and events.');
			return () => null;
		}

		const normalized = {
			events: handler.events,
			editorReady: handler.editorReady === true,
			gutterSelectable: handler.gutterSelectable === true,
			id: handler.id,
			idAttribute: handler.idAttribute || '',
			pointHitMargin: {
				bottom: Number.isFinite(Number(handler.pointHitMargin?.bottom)) ? Number(handler.pointHitMargin.bottom) : 0,
				left: Number.isFinite(Number(handler.pointHitMargin?.left)) ? Number(handler.pointHitMargin.left) : 0,
				right: Number.isFinite(Number(handler.pointHitMargin?.right)) ? Number(handler.pointHitMargin.right) : 0,
				top: Number.isFinite(Number(handler.pointHitMargin?.top)) ? Number(handler.pointHitMargin.top) : 0,
			},
			pointSelectable: handler.pointSelectable === true,
			priority: Number.isFinite(Number(handler.priority)) ? Number(handler.priority) : 0,
			role: handler.role || '',
			selector: handler.selector || '',
			serviceName: handler.serviceName,
		};

		this.unregisterHandler(normalized.id);
		this.handlers.push(normalized);
		this.handlers.sort((first, second) => second.priority - first.priority);
		return () => this.unregisterHandler(normalized.id);
	}

	/**
	 * Unregisters an editor interaction handler by id.
	 *
	 * @param {string} id - Registered handler id.
	 * @returns {boolean} Whether a handler was removed.
	 */
	unregisterHandler(id) {
		const before = this.handlers.length;

		this.handlers = this.handlers.filter((handler) => handler.id !== id);
		return this.handlers.length !== before;
	}

	/**
	 * Gets registered handlers, optionally filtered by event name.
	 *
	 * @param {string} eventName - Optional editor interaction event name.
	 * @param {string} serviceName - Optional target service name.
	 * @returns {EditorInteractionHandlerRegistration[]} Matching handler registrations.
	 */
	getHandlers(eventName = '', serviceName = '') {
		return this.handlers.filter((handler) => (
			!eventName || handler.events.includes(eventName)
		) && (
			!serviceName || handler.serviceName === serviceName
		));
	}

	/**
	 * Notifies registered feature handlers that an editor is preparing to mount.
	 *
	 * This pre-Quill-construction signal lets features push Quill setup through
	 * editor-owned callbacks after service ready/start has completed, without
	 * imposing service startup ordering.
	 *
	 * @param {EditorReadyContext} context - Editor setup callbacks and metadata.
	 * @returns {EditorReadyNotificationResult[]} Results returned by feature handlers.
	 */
	notifyEditorReady(context = {}) {
		return this.handlers
			.filter((handler) => handler.editorReady === true)
			.map((handler) => this.invokeEditorReadyHandler(handler, context));
	}

	/**
	 * Dispatches an editor interaction to registered service handlers by priority.
	 *
	 * @param {string} eventName - Editor interaction event name.
	 * @param {Event | KeyboardEvent | PointerEvent | unknown} event - Source event object.
	 * @param {EditorInteractionContext} context - Editor-owned context for the interaction.
	 * @returns {EditorInteractionDispatchResult} Dispatch result and first handled response.
	 */
	dispatch(eventName, event, context = {}) {
		const handlers = this.getHandlers(eventName, context.targetServiceName || '');

		for (const handler of handlers) {
			const result = this.invokeHandler(handler, eventName, event, {
				...context,
				eventName,
			});

			if (result === true || result?.handled === true) {
				return {
					handled: true,
					handlerId: handler.id,
					result,
					serviceName: handler.serviceName,
				};
			}
		}

		return {
			handled: false,
		};
	}

	/**
	 * Invokes a registered handler through its service method.
	 *
	 * @param {EditorInteractionHandlerRegistration} handler - Handler registration to invoke.
	 * @param {string} eventName - Editor interaction event name.
	 * @param {Event | KeyboardEvent | PointerEvent | unknown} event - Source event object.
	 * @param {EditorInteractionContext} context - Editor-owned context for the interaction.
	 * @returns {EditorInteractionHandlerResult | boolean | null} Handler result.
	 */
	invokeHandler(handler, eventName, event, context) {
		const service = this.registry.subscribe(handler.serviceName);
		const method = service?.handleEditorEvent;

		if (typeof method !== 'function') {
			console.warn(`Cannot dispatch editor interaction to ${handler.serviceName}.handleEditorEvent.`);
			return false;
		}

		return method(eventName, event, {
			...context,
			handler,
		});
	}

	/**
	 * Invokes a registered service's editor-ready hook.
	 *
	 * @param {EditorInteractionHandlerRegistration} handler - Handler registration to invoke.
	 * @param {EditorReadyContext} context - Editor setup callbacks and metadata.
	 * @returns {EditorReadyNotificationResult}
	 */
	invokeEditorReadyHandler(handler, context) {
		const service = this.registry.subscribe(handler.serviceName);
		const method = service?.handleEditorReady;

		if (typeof method !== 'function') {
			console.warn(`Cannot notify ${handler.serviceName}.handleEditorReady because it is not implemented.`);
			return {
				handled: false,
				handlerId: handler.id,
				serviceName: handler.serviceName,
			};
		}

		return {
			handled: true,
			handlerId: handler.id,
			result: method.call(service, {
				...context,
				handler,
			}),
			serviceName: handler.serviceName,
		};
	}
}

new EditorInteractionsService();
