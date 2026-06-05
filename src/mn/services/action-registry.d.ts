/** Presentation component registered for use by app action surfaces. */
type ActionRegistryComponent = React.ComponentType<any>;

/** State-specific presentation registration for one action id. */
type ActionRegistryEntry = {
	/** Stable action id. */
	id: string;
	/** Presentation components keyed by state name. */
	states: Record<string, ActionRegistryComponent>;
	/** Optional hover text phrase keys keyed by state name. */
	hoverTextStringIds: Record<string, string>;
};

/** Payload emitted when an action presentation is registered or updated. */
type ActionRegistryRegisteredEvent = {
	/** Registered action id. */
	id: string;
	/** Registered action state. */
	state: string;
	/** Registered presentation component. */
	component: ActionRegistryComponent;
	/** Optional registered hover text phrase key. */
	hoverTextStringId: string;
	/** Current action entry. */
	entry: ActionRegistryEntry;
	/** Current full action registry snapshot. */
	actions: ActionRegistryEntry[];
};

/** Payload emitted when an action or action state is removed. */
type ActionRegistryRemovedEvent = {
	/** Removed action id. */
	id: string;
	/** Removed action state, or empty when the whole action id was removed. */
	state: string;
	/** Current full action registry snapshot. */
	actions: ActionRegistryEntry[];
};

/** App-wide registry for feature-provided action presentation components. */
type ActionRegistryService = {
	/** Registers an action presentation component for an id and optional state. */
	registerAction: (id: string, component: ActionRegistryComponent, state?: string, hoverTextStringId?: string) => ActionRegistryEntry | null;
	/** Gets an action presentation component by id and optional state, falling back to the default state. */
	getActionComponent: (id: string, state?: string) => ActionRegistryComponent | null;
	/** Gets an optional hover text phrase key by id and optional state. */
	getActionHoverTextStringId: (id: string, state?: string) => string;
	/** Gets all registered states for one action id. */
	getActionSet: (id: string) => ActionRegistryEntry | null;
	/** Gets the current sorted action registry snapshot. */
	getActions: () => ActionRegistryEntry[];
	/** Updates or clears the hover text phrase key for an action state. */
	updateActionHoverText: (id: string, hoverTextStringId: string, state?: string) => ActionRegistryEntry | null;
	/** Removes an action id or one state from an action id. */
	removeAction: (id: string, state?: string) => boolean;
	/** Subscribes to action-registry events. */
	listen?: (eventName: string, listener: (...args: any[]) => void) => unknown;
	/** Removes an action-registry event subscription. */
	unlisten?: (eventName: string, listener: unknown) => void;
};
