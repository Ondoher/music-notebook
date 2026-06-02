/** Icon component registered for use by app surfaces. */
type IconRegistryIcon = React.ComponentType<any>;

/** State-specific icon registration for one icon id. */
type IconRegistryEntry = {
	/** Stable icon id. */
	id: string;
	/** Icon components keyed by state name. */
	states: Record<string, IconRegistryIcon>;
	/** Optional hover text phrase keys keyed by state name. */
	hoverTextStringIds: Record<string, string>;
};

/** Payload emitted when an icon is registered or updated. */
type IconRegistryRegisteredEvent = {
	/** Registered icon id. */
	id: string;
	/** Registered icon state. */
	state: string;
	/** Registered icon component. */
	icon: IconRegistryIcon;
	/** Optional registered hover text phrase key. */
	hoverTextStringId: string;
	/** Current icon entry. */
	entry: IconRegistryEntry;
	/** Current full icon registry snapshot. */
	icons: IconRegistryEntry[];
};

/** Payload emitted when an icon or icon state is removed. */
type IconRegistryRemovedEvent = {
	/** Removed icon id. */
	id: string;
	/** Removed icon state, or empty when the whole icon id was removed. */
	state: string;
	/** Current full icon registry snapshot. */
	icons: IconRegistryEntry[];
};

/** App-wide registry for feature-provided icons. */
type IconRegistryService = {
	/** Registers an icon component for an id and optional state. */
	registerIcon: (id: string, icon: IconRegistryIcon, state?: string, hoverTextStringId?: string) => IconRegistryEntry | null;
	/** Gets an icon component by id and optional state, falling back to the default state. */
	getIcon: (id: string, state?: string) => IconRegistryIcon | null;
	/** Gets an optional hover text phrase key by id and optional state. */
	getIconHoverTextStringId: (id: string, state?: string) => string;
	/** Gets all registered states for one icon id. */
	getIconSet: (id: string) => IconRegistryEntry | null;
	/** Gets the current sorted icon registry snapshot. */
	getIcons: () => IconRegistryEntry[];
	/** Updates or clears the hover text phrase key for an icon state. */
	updateIconHoverText: (id: string, hoverTextStringId: string, state?: string) => IconRegistryEntry | null;
	/** Removes an icon id or one state from an icon id. */
	removeIcon: (id: string, state?: string) => boolean;
	/** Subscribes to icon-registry events. */
	listen?: (eventName: string, listener: (...args: any[]) => void) => unknown;
	/** Removes an icon-registry event subscription. */
	unlisten?: (eventName: string, listener: unknown) => void;
};
