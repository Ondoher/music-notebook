/** Props for the document tab strip. */
type DocumentTabsProps = {
	/** Document-model service that owns tab metadata and active tab state. */
	documentModel?: DocumentModelService | null;
};

/** Internal document tab strip state. */
type DocumentTabsState = {
	/** Active tab id. */
	activeTabId: string;
	/** Tab currently being renamed. */
	editingTabId: string;
	/** Draft tab title for inline rename. */
	editingTitle: string;
	/** Absolute input position over the tab strip. */
	editorStyle: React.CSSProperties | null;
	/** Sorted document tabs. */
	tabs: NotebookTab[];
};

/** Props for one sortable tab helper. */
type SortableDocumentTabProps = {
	/** Resolved visible tab label. */
	label: string;
	/** Tab represented by this MUI tab. */
	tab: NotebookTab;
};

/** Props for the hook-based sortable tab region helper. */
type SortableDocumentTabsRegionProps = {
	/** Active tab id. */
	activeTabId: string;
	/** Resolves the visible label for a tab. */
	getTabLabel: (tab: NotebookTab, index: number) => string;
	/** Handles dnd-kit drag completion. */
	onDragEnd: (event: unknown) => void;
	/** Handles MUI tab selection. */
	onSelectTab: (event: React.SyntheticEvent, tabId: string) => void;
	/** Sorted document tabs. */
	tabs: NotebookTab[];
};

declare class DocumentTabs extends React.Component<DocumentTabsProps, DocumentTabsState> {}
