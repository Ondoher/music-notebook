/** Props for the document tab strip. */
type DocumentTabsProps = {
	/** Active tab id. */
	activeTabId?: string;
	/** Called when the user requests a tab after the active tab. */
	onAddTab?: (afterTabId: string) => void;
	/** Called when the user requests a tab move. */
	onMoveTab?: (tabId: string, targetIndex: number) => void;
	/** Called when the user commits a tab rename. */
	onRenameTab?: (tabId: string, title: string) => void;
	/** Called when the user selects a tab. */
	onSelectTab?: (tabId: string) => void;
	/** Sorted document tabs to render. */
	tabs?: NotebookTab[];
};

/** Internal document tab strip state. */
type DocumentTabsState = {
	/** Tab currently being renamed. */
	editingTabId: string;
	/** Draft tab title for inline rename. */
	editingTitle: string;
	/** Absolute input position over the tab strip. */
	editorStyle: React.CSSProperties | null;
};

/** Props for one sortable tab helper. */
type SortableDocumentTabProps = {
	/** Whether the MUI Tabs owner spans tabs to the full width. */
	fullWidth?: boolean;
	/** Resolved visible tab label. */
	label: string;
	/** Handles inline tab rename start. */
	onEdit: (tab: NotebookTab, tabElement: HTMLElement) => void;
	/** Handles MUI tab selection. */
	onChange?: (event: React.SyntheticEvent, value: number) => void;
	/** Whether this tab is selected. */
	selected?: boolean;
	/** Tab represented by this MUI tab. */
	tab: NotebookTab;
	/** MUI text color setting inherited from Tabs. */
	textColor?: 'secondary' | 'primary' | 'inherit';
	/** MUI-assigned tab value. */
	value?: number;
};

/** Props for the hook-based sortable tab region helper. */
type SortableDocumentTabsRegionProps = {
	/** Active tab id. */
	activeTabId: string;
	/** Resolves the visible label for a tab. */
	getTabLabel: (tab: NotebookTab, index: number) => string;
	/** Handles dnd-kit drag completion. */
	onDragEnd: (event: unknown) => void;
	/** Handles inline tab rename start. */
	onEdit: (tab: NotebookTab, tabElement: HTMLElement) => void;
	/** Handles MUI tab selection. */
	onSelectTab: (event: React.SyntheticEvent, tabIndex: number) => void;
	/** Sorted document tabs. */
	tabs: NotebookTab[];
};

declare class DocumentTabs extends React.Component<DocumentTabsProps, DocumentTabsState> {}
