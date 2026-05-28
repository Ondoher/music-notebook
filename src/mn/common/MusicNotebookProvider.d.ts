/** Props for MusicNotebookProvider. */
type MusicNotebookProviderProps = {
	/** Context value to provide to the child React tree. */
	contextValue: Partial<MusicNotebookContextValue>;
	/** Child content rendered inside the provider. */
	children?: React.ReactNode;
};

/** State for MusicNotebookProvider. */
type MusicNotebookProviderState = {
	/** Active locale from watched app data. */
	locale: string;
};
