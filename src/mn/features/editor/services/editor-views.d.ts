/** Active request for a feature-owned editor view. */
type EditorViewRequest = {
	/** Registered editor view name. */
	name: string;
	/** Props supplied by the feature that requested the view. */
	props: Record<string, unknown>;
};

/** Editor-owned context passed when rendering an editor view. */
type EditorViewContext = {
	/** Active Quill instance. */
	quill?: unknown;
	/** Root editor DOM element. */
	editorRoot?: HTMLElement | null;
	/** Resolves a Quill blot from a DOM node. */
	findBlot?: (node: Node, bubble?: boolean) => unknown;
	/** Gets the current table cell inner, when the selection is in a table. */
	getCurrentTableCellInner?: () => HTMLElement | null;
	/** Gets the active table module from the editor. */
	getTableModule?: () => unknown;
	/** Gets the active TableUp selection module from the editor. */
	getTableSelectionModule?: () => unknown;
	/** Selects a table cell through editor-owned selection plumbing. */
	selectTableCell?: (cell: HTMLElement) => boolean;
	/** Additional editor-owned context values. */
	[key: string]: unknown;
};

/** Props passed by editor-views to a registered view provider. */
type EditorViewProviderProps = Record<string, unknown> & {
	/** Editor-owned context for the current render. */
	editorContext: EditorViewContext;
	/** Registered editor view name. */
	viewName: string;
};

/** Provider that returns a renderable editor view component. */
type EditorViewProvider = {
	/** Gets a renderable component for the editor view. */
	getComponent: (props?: EditorViewProviderProps) => unknown | null;
};

/** Registry service for feature-owned views mounted by EditorPage. */
type EditorViewsService = {
	/** Registers a named editor view provider. */
	registerView: (name: string, view: EditorViewProvider) => () => boolean | null;
	/** Unregisters a named editor view provider and any matching active request. */
	unregisterView: (name: string) => boolean;
	/** Requests that a registered editor view be mounted by EditorPage. */
	requestView: (name: string, props?: Record<string, unknown>) => boolean;
	/** Closes an active editor view request. */
	closeView: (name: string) => boolean;
	/** Gets the current editor view requests in mount order. */
	getRequestedViews: () => EditorViewRequest[];
	/** Gets a renderable component for a request and editor context. */
	getComponent: (request: EditorViewRequest | string, editorContext?: EditorViewContext) => unknown | null;
	/** Subscribes to editor-views events. */
	listen?: (eventName: string, listener: (...args: any[]) => void) => unknown;
	/** Removes an editor-views event subscription. */
	unlisten?: (eventName: string, listener: unknown) => void;
};
