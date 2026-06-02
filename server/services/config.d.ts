/** Service for reading server-local configuration. */
type ConfigService = {
	/** Reads a config value by dotted path. */
	get: (name: string, defaultValue?: any) => any;
};
