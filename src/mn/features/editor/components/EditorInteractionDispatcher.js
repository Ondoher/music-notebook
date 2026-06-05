import Quill from 'quill';

/**
 * Coordinates editor-owned mechanics for dispatching editor interaction events.
 */
export default class EditorInteractionDispatcher {
	/**
	 * Initializes dispatcher dependencies.
	 *
	 * @param {EditorInteractionDispatcherOptions} options - Editor dependency accessors.
	 */
	constructor(options = {}) {
		this.getEditorInteractions = options.getEditorInteractions || (() => null);
		this.getEditorRoot = options.getEditorRoot || (() => null);
		this.getCursorRoot = options.getCursorRoot || this.getEditorRoot;
		this.getQuill = options.getQuill || (() => null);
		this.getContentWidth = options.getContentWidth || (() => null);
		this.setSelectionWithoutScroll = options.setSelectionWithoutScroll || null;
		this.cursorClass = null;
	}

	/**
	 * Dispatches an editor interaction event with resolved editor context.
	 *
	 * @param {string} eventName - Editor interaction event name.
	 * @param {Event | KeyboardEvent | PointerEvent | unknown} event - Source event object.
	 * @param {Partial<EditorInteractionContext>} extraContext - Additional context for this event.
	 * @returns {EditorInteractionDispatchResult} Dispatch result.
	 */
	dispatch(eventName, event, extraContext = {}) {
		const target = extraContext.target
			|| this.resolveTarget(event)
			|| this.resolvePointTarget(eventName, event)
			|| this.resolveSelectionTarget(eventName);
		const targetServiceName = extraContext.targetServiceName || target?.serviceName || '';

		if (!targetServiceName && this.requiresResolvedTarget(eventName) && extraContext.allowUnresolvedTarget !== true) {
			this.applyCursorClass(null);
			return {
				handled: false,
				target: null,
			};
		}

		const dispatchContext = this.getInteractionContext({
			...extraContext,
			point: extraContext.point || this.getPoint(event),
			target,
			targetServiceName,
		});
		const result = this.getEditorInteractions()?.dispatch?.(
			eventName,
			event,
			dispatchContext,
		) || { handled: false };

		this.applyResult(event, result);
		return {
			...result,
			target,
		};
	}

	/**
	 * Creates generic editor context for feature-owned interaction handlers.
	 *
	 * @param {Partial<EditorInteractionContext>} extraContext - Additional context values.
	 * @returns {EditorInteractionContext} Editor interaction context.
	 */
	getInteractionContext(extraContext = {}) {
		const quill = this.getQuill();

		return {
			editorRoot: this.getEditorRoot() || quill?.root || null,
			findBlot: (node, bubble = true) => Quill.find(node, bubble),
			getIndex: (blot) => quill?.getIndex?.(blot),
			getLeaf: (index) => quill?.getLeaf?.(index) || [],
			getLength: () => quill?.getLength?.() || 0,
			getLine: (index) => quill?.getLine?.(index) || [],
			getModule: (name) => quill?.getModule?.(name) || null,
			getContentWidth: () => this.getContentWidth(),
			getSelection: (focus = false) => quill?.getSelection?.(focus) || null,
			quill,
			setSelection: (...args) => quill?.setSelection?.(...args),
			setSelectionWithoutScroll: this.setSelectionWithoutScroll,
			...extraContext,
		};
	}

	/**
	 * Resolves the registered owner nearest to an event target.
	 *
	 * @param {Event | unknown} event - Source event object.
	 * @returns {EditorInteractionTarget | null} Resolved target owner.
	 */
	resolveTarget(event) {
		const node = this.getElementFromNode(event?.target);

		if (!node?.closest) {
			return null;
		}

		const candidates = this.getCandidateTargets(node);

		if (!candidates.length) {
			return null;
		}

		return this.pickTarget(node, candidates);
	}

	/**
	 * Gets registered owner candidates that match a DOM node.
	 *
	 * @param {Element} node - Event target node.
	 * @returns {EditorInteractionTarget[]} Matching owner targets.
	 */
	getCandidateTargets(node) {
		const handlers = this.getEditorInteractions()?.getHandlers?.() || [];

		return handlers
			.filter((handler) => handler.selector)
			.map((handler) => {
				const element = node.closest(handler.selector);

				if (!element) {
					return null;
				}

				return this.createTarget(element, handler);
			})
			.filter(Boolean);
	}

	/**
	 * Resolves an owner target from the current Quill selection.
	 *
	 * @param {string} eventName - Editor interaction event name.
	 * @returns {EditorInteractionTarget | null} Resolved target owner.
	 */
	resolveSelectionTarget(eventName) {
		const quill = this.getQuill();
		const range = quill?.getSelection?.();

		if (!range) {
			return null;
		}

		const [line] = quill.getLine?.(range.index) || [];
		const [leaf] = quill.getLeaf?.(range.index) || [];
		const nodes = [leaf?.domNode, line?.domNode].filter(Boolean);
		const handlers = this.getEditorInteractions()?.getHandlers?.(eventName) || [];

		for (const node of nodes) {
			const element = node.nodeType === 1 ? node : node.parentElement;

			if (!element?.closest) {
				continue;
			}

			const candidates = handlers
				.filter((handler) => handler.selector)
				.map((handler) => {
					const owner = element.closest(handler.selector);

					return owner ? this.createTarget(owner, handler) : null;
				})
				.filter(Boolean);

			if (candidates.length) {
				return this.pickTarget(element, candidates);
			}
		}

		return null;
	}

	/**
	 * Resolves an owner target from pointer coordinates within the editor root.
	 *
	 * @param {string} eventName - Editor interaction event name.
	 * @param {Event | unknown} event - Source event object.
	 * @returns {EditorInteractionTarget | null} Resolved target owner.
	 */
	resolvePointTarget(eventName, event) {
		const point = this.getPoint(event);
		const editorRoot = this.getEditorRoot();

		if (!point || !editorRoot) {
			return null;
		}

		const handlers = this.getEditorInteractions()?.getHandlers?.(eventName) || [];
		const candidates = handlers
			.filter((handler) => handler.pointSelectable === true && handler.selector)
			.flatMap((handler) => this.getPointTargetCandidates(editorRoot, handler, point));

		if (!candidates.length) {
			return null;
		}

		return candidates.sort((first, second) => (
			first.area - second.area
			|| Number(second.target.registration?.priority || 0) - Number(first.target.registration?.priority || 0)
		))[0].target;
	}

	/**
	 * Gets owner candidates whose expanded bounds contain a pointer point.
	 *
	 * @param {Element} editorRoot - Root editor element.
	 * @param {EditorInteractionHandlerRegistration} handler - Handler registration.
	 * @param {{clientX: number, clientY: number}} point - Pointer coordinates.
	 * @returns {{area: number, target: EditorInteractionTarget}[]} Candidate targets.
	 */
	getPointTargetCandidates(editorRoot, handler, point) {
		const elements = editorRoot.matches?.(handler.selector)
			? [editorRoot]
			: Array.from(editorRoot.querySelectorAll?.(handler.selector) || []);

		return elements
			.map((element) => this.getPointTargetCandidate(element, handler, point))
			.filter(Boolean);
	}

	/**
	 * Gets one point target candidate if the point is inside its expanded bounds.
	 *
	 * @param {Element} element - Candidate owner element.
	 * @param {EditorInteractionHandlerRegistration} handler - Handler registration.
	 * @param {{clientX: number, clientY: number}} point - Pointer coordinates.
	 * @returns {{area: number, target: EditorInteractionTarget} | null} Candidate target.
	 */
	getPointTargetCandidate(element, handler, point) {
		const rect = element.getBoundingClientRect?.();

		if (!rect || rect.width <= 0 || rect.height <= 0) {
			return null;
		}

		const margin = handler.pointHitMargin || {};
		const left = rect.left - (Number(margin.left) || 0);
		const right = rect.right + (Number(margin.right) || 0);
		const top = rect.top - (Number(margin.top) || 0);
		const bottom = rect.bottom + (Number(margin.bottom) || 0);

		if (
			point.clientX < left
			|| point.clientX > right
			|| point.clientY < top
			|| point.clientY > bottom
		) {
			return null;
		}

		return {
			area: Math.max((right - left) * (bottom - top), 0),
			target: this.createTarget(element, handler),
		};
	}

	/**
	 * Resolves the owner target for a gutter line-selection hit.
	 *
	 * @param {string} eventName - Editor interaction event name.
	 * @param {{index: number, sourceElement?: Element} | null} range - Hit range.
	 * @returns {EditorInteractionTarget | null} Resolved target owner.
	 */
	resolveGutterTarget(eventName, range) {
		const sourceElement = range?.sourceElement || this.getLineElement(range);

		if (!sourceElement) {
			return null;
		}

		const handlers = this.getEditorInteractions()?.getHandlers?.(eventName) || [];
		const candidates = handlers
			.filter((handler) => handler.gutterSelectable === true && handler.selector)
			.flatMap((handler) => this.getGutterTargetCandidates(sourceElement, handler));

		if (!candidates.length) {
			return null;
		}

		return candidates.sort((first, second) => (
			first.left - second.left
			|| Number(second.target.registration?.priority || 0) - Number(first.target.registration?.priority || 0)
		))[0].target;
	}

	/**
	 * Gets the rendered line element for a Quill range.
	 *
	 * @param {{index: number} | null} range - Quill range-like object.
	 * @returns {Element | null} Rendered line element.
	 */
	getLineElement(range) {
		if (!Number.isInteger(range?.index)) {
			return null;
		}

		const [line] = this.getQuill()?.getLine?.(range.index) || [];
		const node = line?.domNode || null;

		return node?.nodeType === 1 ? node : node?.parentElement || null;
	}

	/**
	 * Gets owner candidates from the element nearest a gutter interaction.
	 *
	 * @param {Element} sourceElement - Element near the gutter hit.
	 * @param {EditorInteractionHandlerRegistration} handler - Handler registration.
	 * @returns {{left: number, target: EditorInteractionTarget}[]} Candidate targets.
	 */
	getGutterTargetCandidates(sourceElement, handler) {
		const elements = new Set();
		const closest = sourceElement.closest?.(handler.selector);

		if (closest) {
			elements.add(closest);
		}

		if (sourceElement.matches?.(handler.selector)) {
			elements.add(sourceElement);
		}

		const descendants = sourceElement.querySelectorAll?.(handler.selector) || [];

		descendants.forEach((element) => elements.add(element));

		return Array.from(elements)
			.map((element) => {
				const rect = element.getBoundingClientRect?.();

				if (!rect || rect.width <= 0 || rect.height <= 0) {
					return null;
				}

				return {
					left: rect.left,
					target: this.createTarget(element, handler),
				};
			})
			.filter(Boolean);
	}

	/**
	 * Creates a target description from a matched owner element.
	 *
	 * @param {Element} element - Matched owner element.
	 * @param {EditorInteractionHandlerRegistration} handler - Handler registration.
	 * @returns {EditorInteractionTarget} Target description.
	 */
	createTarget(element, handler) {
		return {
			data: { ...element.dataset },
			element,
			handlerId: handler.id,
			id: handler.idAttribute ? element.getAttribute(handler.idAttribute) : '',
			registration: handler,
			role: handler.role || '',
			serviceName: handler.serviceName,
		};
	}

	/**
	 * Whether dispatch should be skipped when no target owner is resolved.
	 *
	 * @param {string} eventName - Editor interaction event name.
	 * @returns {boolean} Whether a target is required.
	 */
	requiresResolvedTarget(eventName) {
		if (eventName === 'selection-change') {
			return false;
		}

		const handlers = this.getEditorInteractions()?.getHandlers?.(eventName) || [];

		return handlers.some((handler) => handler.selector);
	}

	/**
	 * Picks the nearest owner target for a DOM node.
	 *
	 * @param {Element} node - Event target node.
	 * @param {EditorInteractionTarget[]} candidates - Matching owner targets.
	 * @returns {EditorInteractionTarget} Selected owner target.
	 */
	pickTarget(node, candidates) {
		return [...candidates].sort((first, second) => (
			this.getDistanceToAncestor(node, first.element) - this.getDistanceToAncestor(node, second.element)
			|| Number(second.registration?.priority || 0) - Number(first.registration?.priority || 0)
		))[0];
	}

	/**
	 * Gets the number of parent steps between a node and an ancestor.
	 *
	 * @param {Element} node - Starting node.
	 * @param {Element} ancestor - Candidate ancestor.
	 * @returns {number} Parent step count or Infinity when unrelated.
	 */
	getDistanceToAncestor(node, ancestor) {
		let distance = 0;
		let current = this.getElementFromNode(node);

		while (current) {
			if (current === ancestor) {
				return distance;
			}

			current = current.parentElement;
			distance += 1;
		}

		return Number.POSITIVE_INFINITY;
	}

	/**
	 * Gets an element from an event target or DOM node.
	 *
	 * @param {Node | Element | unknown} node - Source node.
	 * @returns {Element | null}
	 */
	getElementFromNode(node) {
		if (!node) {
			return null;
		}

		if (node.nodeType === getNodeType('ELEMENT_NODE')) {
			return node;
		}

		return node.parentElement || null;
	}

	/**
	 * Gets pointer coordinates from an event when available.
	 *
	 * @param {Event | PointerEvent | MouseEvent | unknown} event - Source event object.
	 * @returns {{clientX: number | null, clientY: number | null} | null} Pointer coordinates.
	 */
	getPoint(event) {
		if (!Number.isFinite(Number(event?.clientX)) || !Number.isFinite(Number(event?.clientY))) {
			return null;
		}

		return {
			clientX: Number(event.clientX),
			clientY: Number(event.clientY),
		};
	}

	/**
	 * Applies generic effects returned by an interaction handler.
	 *
	 * @param {Event | unknown} event - Source event object.
	 * @param {EditorInteractionDispatchResult} dispatchResult - Dispatch result.
	 * @returns {void}
	 */
	applyResult(event, dispatchResult) {
		const result = dispatchResult?.result;

		if (result?.preventDefault) {
			event?.preventDefault?.();
		}

		if (result?.stopPropagation) {
			event?.stopPropagation?.();
			event?.stopImmediatePropagation?.();
			event?.nativeEvent?.stopPropagation?.();
			event?.nativeEvent?.stopImmediatePropagation?.();
		}

		this.applyCursorClass(result?.cursorClass || null);
	}

	/**
	 * Applies the active interaction cursor class to the editor root.
	 *
	 * @param {string | null} cursorClass - Cursor class to apply.
	 * @returns {void}
	 */
	applyCursorClass(cursorClass) {
		const cursorRoot = this.getCursorRoot();

		if (this.cursorClass === cursorClass) {
			return;
		}

		if (this.cursorClass) {
			cursorRoot?.classList?.remove?.(this.cursorClass);
		}

		this.cursorClass = cursorClass || null;

		if (this.cursorClass) {
			cursorRoot?.classList?.add?.(this.cursorClass);
		}
	}
}

function getNodeType(name) {
	if (typeof Node !== 'undefined') {
		return Node[name];
	}

	return {
		ELEMENT_NODE: 1,
		TEXT_NODE: 3,
	}[name];
}
