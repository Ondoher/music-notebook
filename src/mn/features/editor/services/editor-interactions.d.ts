/** Result returned by a feature-owned editor interaction handler. */
type EditorInteractionHandlerResult = {
	/** Whether the handler consumed the editor interaction. */
	handled?: boolean;
	/** Whether EditorPage should capture pointer events for the same handler until the gesture ends. */
	capturePointer?: boolean;
	/** Whether EditorPage should call preventDefault on the source event. */
	preventDefault?: boolean;
	/** Whether EditorPage should call stopPropagation on the source event. */
	stopPropagation?: boolean;
	/** Whether EditorPage should mark the native event to suppress feature-owned native selection handlers. */
	suppressNativeSelection?: boolean;
	/** Optional CSS class for EditorPage to apply while the interaction state is active. */
	cursorClass?: string | null;
};

/** Registration for a service-owned editor interaction handler. */
type EditorInteractionHandlerRegistration = {
	/** Unique handler id. */
	id: string;
	/** Editor interaction event names handled by this registration. */
	events: string[];
	/** Registered service name that owns the handler. */
	serviceName: string;
	/** Whether this service should receive the pre-Quill editor-ready signal. */
	editorReady?: boolean;
	/** Priority used when more than one handler can receive the same event. */
	priority: number;
	/** Optional selector used by EditorPage when resolving event ownership. */
	selector?: string;
	/** Optional attribute name used by EditorPage to extract a target id. */
	idAttribute?: string;
	/** Whether this handler can own gutter line selection when its region is hit. */
	gutterSelectable?: boolean;
	/** Whether this handler can be resolved from pointer coordinates within the editor root. */
	pointSelectable?: boolean;
	/** Optional expanded hit area for point-based target resolution. */
	pointHitMargin?: {
		top?: number;
		right?: number;
		bottom?: number;
		left?: number;
	};
	/** Optional semantic role for matched targets. */
	role?: string;
};

/** Pre-Quill setup callbacks supplied by the editor surface before construction. */
type EditorReadyContext = {
	/** Quill constructor used by the editor surface. */
	Quill?: unknown;
	/** Registers a Quill module, blot, format, or other Quill path. */
	registerQuillModule?: (path: string, value: unknown, overwrite?: boolean) => boolean;
	/** Adds or replaces module options for the pending Quill constructor call. */
	addQuillModuleOptions?: (name: string, options: Record<string, unknown>) => boolean;
	/** Additional editor-owned setup context values. */
	[key: string]: unknown;
};

/** Result returned for one editor-ready handler notification. */
type EditorReadyNotificationResult = {
	handled: boolean;
	handlerId?: string;
	serviceName?: string;
	result?: unknown;
};

/** Generic editor gutter hit resolved from a margin pointer gesture. */
type EditorInteractionGutterHit = {
	/** Pointer coordinates for the gutter gesture. */
	point?: { clientX: number | null; clientY: number | null } | null;
	/** Quill range nearest to the gutter gesture. */
	range?: { index: number; length: number };
	/** Optional feature-neutral source element used for ownership resolution. */
	sourceElement?: Element | null;
};

/** Editor-owned context passed to feature interaction handlers. */
type EditorInteractionContext = {
	/** Editor interaction event name currently being dispatched. */
	eventName?: string;
	/** Active Quill instance. */
	quill?: unknown;
	/** Root editor DOM element. */
	editorRoot?: HTMLElement | null;
	/** Resolves a Quill blot from a DOM node. */
	findBlot?: (node: Node, bubble?: boolean) => unknown;
	/** Gets the current editor selection. */
	getSelection?: (focus?: boolean) => unknown;
	/** Sets the current editor selection. */
	setSelection?: (...args: unknown[]) => unknown;
	/** Sets the current editor selection while preserving scroll around an anchor. */
	setSelectionWithoutScroll?: (
		index: number,
		length?: number,
		source?: string,
		anchor?: Element | null,
	) => unknown;
	/** Gets a Quill line at a document index. */
	getLine?: (index: number) => unknown[];
	/** Gets a Quill leaf at a document index. */
	getLeaf?: (index: number) => unknown[];
	/** Gets the document index for a blot. */
	getIndex?: (blot: unknown) => number | undefined;
	/** Gets the document length. */
	getLength?: () => number;
	/** Gets an editor module by name. */
	getModule?: (name: string) => unknown;
	/** Gets the stable output content width, excluding transient editor overflow. */
	getContentWidth?: () => number | null;
	/** Pointer coordinates for pointer-like events. */
	point?: { clientX: number | null; clientY: number | null } | null;
	/** Gutter hit that started a routed gutter selection gesture. */
	anchorLineHit?: EditorInteractionGutterHit;
	/** Current gutter hit for routed gutter selection gestures. */
	lineHit?: EditorInteractionGutterHit;
	/** Resolved interaction target owner. */
	target?: EditorInteractionTarget | null;
	/** Target service name used to narrow dispatch. */
	targetServiceName?: string;
	/** Registration currently being dispatched. */
	handler?: EditorInteractionHandlerRegistration;
	/** Additional editor-owned context values. */
	[key: string]: unknown;
};

/** Result returned by editor interaction dispatch. */
type EditorInteractionDispatchResult = {
	/** Whether any handler consumed the event. */
	handled: boolean;
	/** Id of the handler that consumed the event. */
	handlerId?: string;
	/** Service that consumed the event. */
	serviceName?: string;
	/** Resolved target owner for the event. */
	target?: EditorInteractionTarget | null;
	/** Raw result returned by the handler. */
	result?: EditorInteractionHandlerResult | boolean | null;
};

/** Registry service for routing editor/Quill DOM interactions to feature services. */
type EditorInteractionsService = {
	/** Registers a service-owned editor interaction handler. */
	registerHandler: (handler?: Partial<EditorInteractionHandlerRegistration>) => () => boolean | null;
	/** Unregisters an editor interaction handler by id. */
	unregisterHandler: (id: string) => boolean;
	/** Gets registered handlers, optionally filtered by event name. */
	getHandlers: (eventName?: string, serviceName?: string) => EditorInteractionHandlerRegistration[];
	/** Notifies registered feature handlers that an editor is preparing to mount. */
	notifyEditorReady: (context?: EditorReadyContext) => EditorReadyNotificationResult[];
	/** Dispatches an editor interaction to registered service handlers by priority. */
	dispatch: (
		eventName: string,
		event: Event | KeyboardEvent | PointerEvent | unknown,
		context?: EditorInteractionContext,
	) => EditorInteractionDispatchResult;
	/** Subscribes to editor-interactions events. */
	listen?: (eventName: string, listener: (...args: any[]) => void) => unknown;
	/** Removes an editor-interactions event subscription. */
	unlisten?: (eventName: string, listener: unknown) => void;
};
