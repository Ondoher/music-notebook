/** Snapshot returned by the editor page-view service. */
type EditorPageStateSnapshot = {
	/** Current Quill document or serialized document source. */
	document?: unknown;
	/** Editor placeholder text. */
	placeholder?: string;
	/** Whether the editor should display non-printing white-space hints. */
	seeWhiteSpace?: boolean;
};

/** Page-view service contract consumed by the editor page. */
type PageViewService = {
	/** Returns the current editor page state snapshot. */
	getState?: () => EditorPageStateSnapshot;
	/** Subscribes to editor page-view state changes. */
	listen?: (eventName: string, listener: (state: EditorPageStateSnapshot) => void) => unknown;
	/** Removes an editor page-view event subscription. */
	unlisten?: (eventName: string, listener: unknown) => void;
};

/** Props for the editor page component. */
type EditorPageProps = {
	/** Page-view service that can drive editor state. */
	pageView?: PageViewService;
	/** Editor toolbar service used to render and handle toolbar selections. */
	editorToolbar?: EditorToolbarService | null;
	/** Editor surface service used to expose editor operations. */
	editorSurface?: EditorSurfaceService | null;
	/** Editor layout service used to resolve feature-owned layout contributions. */
	editorLayout?: EditorLayoutService | null;
	/** Action registry used to resolve toolbar item presentation components. */
	actionRegistry?: ActionRegistryService | null;
	/** Document model used to load active tab content and update embedded object state. */
	documentModel?: DocumentModelService | null;
	/** Object type registry used to map document objects to editor embeds. */
	objectTypes?: ObjectTypeRegistryService | null;
};

/** Internal editor page state. */
type EditorPageState = EditorPageStateSnapshot;

declare class EditorPage extends React.Component<EditorPageProps, EditorPageState> {}
