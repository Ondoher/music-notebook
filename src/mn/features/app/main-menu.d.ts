/** A top-level main menu entry. */
type MainMenuMainItem = {
	/** Stable top-level menu id. */
	id: string;
	/** Sort priority for top-level ordering. */
	priority: number;
	/** Phrase key used for the visible menu label. */
	stringId: string;
	/** Sorted item sections for this top-level menu. */
	sections: MainMenuSection[];
};

/** A menu section within a top-level main menu entry. */
type MainMenuSection = {
	/** Section number used for ordering and divider placement. */
	sectionNumber: number;
	/** Sorted menu items in this section. */
	items: MainMenuItem[];
};

/** A command item inside a main menu section. */
type MainMenuItem = {
	/** Stable item id, currently derived from the string id. */
	id: string;
	/** Whether the menu item can be selected. */
	enabled: boolean;
	/** Parent top-level menu id. */
	mainMenuId: string;
	/** Section number for grouping. */
	sectionNumber: number;
	/** Sort priority within the section. */
	priority: number;
	/** Phrase key used for the visible item label. */
	stringId: string;
};

/** Snapshot returned by the main-menu service. */
type MainMenuSnapshot = MainMenuMainItem[];

/** Payload emitted when a top-level menu item is added or updated. */
type MainMenuMainItemEvent = {
	/** Added or updated top-level menu item. */
	item: MainMenuMainItem;
	/** Current full menu snapshot. */
	menu: MainMenuSnapshot;
};

/** Payload emitted when a menu item is added. */
type MainMenuItemEvent = {
	/** Added menu item. */
	item: MainMenuItem;
	/** Current full menu snapshot. */
	menu: MainMenuSnapshot;
};

/** Payload emitted when a menu item is selected. */
type MainMenuItemSelectedEvent = {
	/** Selected menu item. */
	item: MainMenuItem;
	/** Current full menu snapshot. */
	menu: MainMenuSnapshot;
};

/** Main-menu registry service. */
type MainMenuService = {
	/** Adds or updates a top-level menu item. */
	addMainItem: (priority: number, id: string, stringId: string) => MainMenuMainItem;
	/** Adds an item under an existing top-level menu. */
	addItem: (
		mainMenuId: string,
		sectionNumber: number,
		priority: number,
		stringId: string,
		options?: Partial<Pick<MainMenuItem, 'enabled'>>,
	) => MainMenuItem | null;
	/** Selects an existing item and emits the item-selected event. */
	selectItem: (mainMenuId: string, itemId: string) => MainMenuItem | null;
	/** Returns the current sorted menu structure. */
	getMenu: () => MainMenuSnapshot;
	/** Subscribes to main-menu events. */
	listen?: (eventName: string, listener: (...args: any[]) => void) => unknown;
	/** Removes a main-menu event subscription. */
	unlisten?: (eventName: string, listener: unknown) => void;
};
