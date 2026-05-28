/** Props for the root React app wrapper. */
type AppProps = {
	/** Application content rendered inside the provider. */
	children?: React.ReactNode;
	/** Runtime service registry. */
	registry: RegistryService;
};

/** State tracked by the root React app wrapper. */
type AppState = {
	/** Current locale code. */
	locale: string;
};

export default class App extends React.Component<AppProps, AppState> {}
