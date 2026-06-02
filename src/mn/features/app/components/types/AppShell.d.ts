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
	/** Document-model service that owns notebook tabs. */
	documentModel?: DocumentModelService | null;
	/** Feature-owned components rendered under the normal app root. */
	featureComponents?: React.ReactNode;
	/** Main-menu service used to render the app command surface. */
	mainMenu?: MainMenuService | null;
	/** Initial or controlled active page component. */
	pageComponent?: React.ReactElement | null;
	/** Initial or controlled page list. */
	pages?: AppShellPage[];
};

/** Internal app-shell state. */
type AppShellState = {
	/** Active page identifier. */
	activePageId: string;
	/** Component rendered for the active page. */
	pageComponent: React.ReactElement | null;
	/** Pages available to the shell. */
	pages: AppShellPage[];
};

declare class AppShell extends React.Component<AppShellProps, AppShellState> {}
