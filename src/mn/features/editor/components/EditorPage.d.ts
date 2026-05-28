/** Snapshot returned by the editor page-view service. */
type EditorPageStateSnapshot = {
	/** Label used when showing the debug document payload. */
	debugDocumentLabel?: string;
	/** Current Quill document or serialized document source. */
	document?: unknown;
	/** Toolbar label for inserting a keyboard object. */
	insertKeyboardObjectLabel?: string;
	/** Toolbar label for inserting a staff object. */
	insertStaffObjectLabel?: string;
	/** Editor placeholder text. */
	placeholder?: string;
	/** Editor status text. */
	status?: string;
	/** Editor page title. */
	title?: string;
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
};

/** Internal editor page state. */
type EditorPageState = EditorPageStateSnapshot & {
	/** Pretty-printed document JSON shown in the debug area. */
	documentJson: string;
};

export default class EditorPage extends React.Component<EditorPageProps, EditorPageState> {}
