/** Page descriptor shown by the app shell. */
type AppShellPage = {
	/** Stable page identifier. */
	id: string;
	/** Short navigation label. */
	label?: string;
	/** Page title shown in the shell. */
	title?: string;
	/** Additional page metadata supplied by the app-view service. */
	[key: string]: unknown;
};

/** Snapshot returned by the app-view service. */
type AppShellStateSnapshot = {
	/** Active page identifier. */
	activePageId?: string;
	/** Document tab strip state. */
	documentTabs?: DocumentTabsViewState;
	/** Component currently mounted for the active page. */
	pageComponent?: React.ReactElement | null;
	/** Pages available to the shell. */
	pages?: AppShellPage[];
};

/** App-view service contract consumed by the app shell. */
type AppViewService = {
	/** Returns the current shell state snapshot. */
	getShellState?: () => AppShellStateSnapshot | null;
	/** Subscribes to app-view events. */
	listen?: (eventName: string, listener: (...args: any[]) => void) => unknown;
	/** Removes an app-view event subscription. */
	unlisten?: (eventName: string, listener: unknown) => void;
};

/** Event payload emitted when a page component is mounted. */
type PageMountedEvent = {
	/** Mounted page component. */
	component: React.ReactElement;
	/** Page descriptor associated with the mounted component. */
	page: AppShellPage;
};

/** Document tab state supplied by the app controller. */
type DocumentTabsViewState = {
	/** Active tab id. */
	activeTabId: string;
	/** Sorted document tabs. */
	tabs: NotebookTab[];
};

/** Props for the application shell. */
type AppShellProps = {
	/** App-level account dialog component rendered under the normal app root. */
	accountComponent?: React.ReactElement | null;
	/** Initial or controlled active page identifier. */
	activePageId?: string;
	/** Application title shown by the shell. */
	appTitle?: string;
	/** App-view service that can drive shell state. */
	appView?: AppViewService;
	/** Document tab strip state. */
	documentTabs?: DocumentTabsViewState;
	/** Feature-owned components rendered under the normal app root. */
	featureComponents?: React.ReactNode;
	/** Main-menu service used to render the app command surface. */
	mainMenu?: MainMenuService | null;
	/** Initial or controlled active page component. */
	pageComponent?: React.ReactElement | null;
	/** Initial or controlled page list. */
	pages?: AppShellPage[];
	/** Called when the user requests a tab after the active tab. */
	onAddDocumentTab?: (afterTabId: string) => void;
	/** Called when the user requests a tab move. */
	onMoveDocumentTab?: (tabId: string, targetIndex: number) => void;
	/** Called when the user commits a tab rename. */
	onRenameDocumentTab?: (tabId: string, title: string) => void;
	/** Called when the user selects a tab. */
	onSelectDocumentTab?: (tabId: string) => void;
};

/** Internal app-shell state. */
type AppShellState = {
	/** Active page identifier. */
	activePageId: string;
	/** Document tab strip state. */
	documentTabs: DocumentTabsViewState;
	/** Component rendered for the active page. */
	pageComponent: React.ReactElement | null;
	/** Pages available to the shell. */
	pages: AppShellPage[];
};

declare class AppShell extends React.Component<AppShellProps, AppShellState> {}
