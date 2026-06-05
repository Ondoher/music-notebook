/** A command item in the editor toolbar. */
type EditorToolbarItem = {
	/** Stable toolbar item id. */
	id: string;
	/** Section number used for grouping and divider placement. */
	sectionNumber: number;
	/** Sort priority within the section. */
	priority: number;
	/** Phrase key used for the accessible label. */
	stringId: string;
	/** Registered action presentation id resolved through the action-registry service. */
	iconId: string;
	/** Toolbar rendering control type. */
	controlType?: 'button' | 'font-size' | 'select';
	/** Semantic command id emitted when the item is selected. */
	commandId: string;
	/** Optional feature-owned command payload. */
	commandPayload?: unknown;
	/** Options used by select-style toolbar items. */
	options?: SelectOption[];
	/** Optional value used by control-style toolbar items. */
	value?: unknown;
	/** Feature or service namespace that owns this toolbar item. */
	ownerFeature?: string;
	/** Optional phrase key used for tooltip text. */
	tooltipStringId?: string;
	/** Whether activation should be allowed. Disabled toolbar items remain focusable. */
	enabled: boolean;
	/** Optional pressed state for toggle-like toolbar items. */
	pressed?: boolean;
	/** Whether the item should be rendered. */
	visible: boolean;
};

/** A rendered editor toolbar section. */
type EditorToolbarSection = {
	/** Section number used for ordering. */
	sectionNumber: number;
	/** Sorted visible toolbar items in this section. */
	items: EditorToolbarItem[];
};

/** Snapshot returned by the editor-toolbar service. */
type EditorToolbarSnapshot = EditorToolbarSection[];

/** Canonical section numbers used to group editor toolbar controls. */
export const EDITOR_TOOLBAR_SECTIONS: {
	TEXT: 10;
	STRUCTURE: 20;
	PARAGRAPH: 30;
	INSERT: 40;
};

/** Payload emitted when an editor toolbar item changes. */
type EditorToolbarItemEvent = {
	/** Toolbar item involved in the event. */
	item: EditorToolbarItem;
	/** Current toolbar snapshot. */
	toolbar: EditorToolbarSnapshot;
};

/** Payload emitted when an editor toolbar item is removed. */
type EditorToolbarItemRemovedEvent = {
	/** Removed toolbar item id. */
	id: string;
	/** Current toolbar snapshot. */
	toolbar: EditorToolbarSnapshot;
};

/** Registry service for editor toolbar commands. */
type EditorToolbarService = {
	/** Adds or updates a toolbar item. */
	addItem: (
		sectionNumber: number,
		priority: number,
		id: string,
		stringId: string,
		iconId: string,
		options?: Partial<Pick<
			EditorToolbarItem,
			'tooltipStringId' | 'enabled' | 'pressed' | 'visible' | 'commandId' | 'commandPayload' | 'controlType' | 'options' | 'value' | 'ownerFeature'
		>>,
	) => EditorToolbarItem;
	/** Updates an existing toolbar item. */
	updateItem: (id: string, patch: Partial<Omit<EditorToolbarItem, 'id'>>) => EditorToolbarItem | null;
	/** Removes a toolbar item. */
	removeItem: (id: string) => boolean;
	/** Selects a toolbar item and emits the item-selected event when enabled. */
	selectItem: (id: string, commandPayload?: unknown) => EditorToolbarItem | null;
	/** Returns the current sorted toolbar structure. */
	getToolbar: () => EditorToolbarSnapshot;
	/** Subscribes to editor-toolbar events. */
	listen?: (eventName: string, listener: (...args: any[]) => void) => unknown;
	/** Removes an editor-toolbar event subscription. */
	unlisten?: (eventName: string, listener: unknown) => void;
};
