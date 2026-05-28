/** Application metadata made available through MusicNotebookContext. */
type MusicNotebookAppContext = {
	/** Stable application id. */
	id?: string;
	/** Additional app-level metadata. */
	[key: string]: unknown;
};

/** Localization service contract available through MusicNotebookContext. */
type LocalizeService = {
	/** Returns the currently active locale code. */
	getLocale: () => string;
	/** Subscribes to localization events. */
	listen?: (eventName: string, listener: (...args: any[]) => void) => unknown;
	/** Removes a localization event subscription. */
	unlisten?: (eventName: string, listener: unknown) => void;
	/** Translates a phrase in the active locale. */
	t?: (phrase: string, replacements?: Record<string, LocalizedReplacementValue>, cardinal?: number) => string;
	/** Translates a phrase in a specific locale. */
	t_locale?: (locale: string, phrase: string, replacements?: Record<string, LocalizedReplacementValue>, cardinal?: number) => string;
};

/** Watched app data service shared across independent React roots. */
interface AppDataService {
	/** Returns an existing watched value or stores the supplied default. */
	watch(name: string, defaultValue?: unknown): unknown;
	/** Returns the watched value, or the supplied default when it is not set. */
	get(name: string, defaultValue?: unknown): unknown;
	/** Updates a watched value and notifies subscribers. */
	update(name: string, value: unknown): void;
	/** Returns all watched values as a shallow object snapshot. */
	getSnapshot?(): Record<string, unknown>;
	/** Subscribes to watched-data events. */
	listen?: (eventName: string, listener: (...args: any[]) => void) => unknown;
	/** Removes a watched-data event subscription. */
	unlisten?: (eventName: string, listener: unknown) => void;
}

/** Service registry contract available through MusicNotebookContext. */
type RegistryService = {
	/** Returns the requested named service. */
	subscribe: (serviceName: string) => any;
};

/** React context value shared across Music Notebook presentation components. */
type MusicNotebookContextValue = {
	/** Application metadata. */
	app: MusicNotebookAppContext;
	/** Watched app data service, when one is available. */
	appData?: AppDataService | null;
	/** Localization service, when one is available. */
	localize: LocalizeService | null;
	/** Active locale code. */
	locale: string;
	/** Runtime service registry, when one is available. */
	registry: RegistryService | null;
};
