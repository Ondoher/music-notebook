/** Options used to initialize the editor interaction dispatcher. */
type EditorInteractionDispatcherOptions = {
	/** Gets the active editor-interactions service. */
	getEditorInteractions?: () => EditorInteractionsService | null;
	/** Gets the active editor root element. */
	getEditorRoot?: () => HTMLElement | null;
	/** Gets the element that should receive transient interaction cursor classes. */
	getCursorRoot?: () => HTMLElement | null;
	/** Gets the active Quill instance. */
	getQuill?: () => unknown;
};

/** Registered editor target resolved from an event or selection. */
type EditorInteractionTarget = {
	/** Dataset copied from the matched owner element. */
	data: Record<string, string>;
	/** Matched owner element. */
	element: Element;
	/** Registration id that matched the target. */
	handlerId: string;
	/** Instance id extracted from the registration idAttribute. */
	id: string | null;
	/** Registration that matched the target. */
	registration: EditorInteractionHandlerRegistration;
	/** Optional semantic role from the registration. */
	role: string;
	/** Service that owns the target. */
	serviceName: string;
};
