/** Application metadata made available through MusicNotebookContext. */
type MusicNotebookAppContext = {
	/** Stable application id. */
	id?: string;
	/** Additional app-level metadata. */
	[key: string]: unknown;
};

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
