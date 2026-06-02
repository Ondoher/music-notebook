import React from 'react';
import MusicNotebookContext from './MusicNotebookContext.js';
import { createDefaultLocalize } from './default-localize.js';

/**
 * Provides Music Notebook context and refreshes it from watched app data.
 *
 * @extends {React.Component<MusicNotebookProviderProps, MusicNotebookProviderState>}
 */
export default class MusicNotebookProvider extends React.Component {
	/**
	 * Initializes provider state from the context value.
	 *
	 * @param {MusicNotebookProviderProps} props
	 */
	constructor(props) {
		super(props);
		this.defaultLocalize = createDefaultLocalize();
		this.state = {
			locale: this.getLocale(props.contextValue),
		};
		this.handleLocaleUpdated = this.handleLocaleUpdated.bind(this);
	}

	/**
	 * Subscribes to watched locale updates.
	 *
	 * @returns {void}
	 */
	componentDidMount() {
		this.subscribeToAppData();
	}

	/**
	 * Refreshes subscriptions when the context service set changes.
	 *
	 * @param {MusicNotebookProviderProps} prevProps
	 * @returns {void}
	 */
	componentDidUpdate(prevProps) {
		if (this.getAppData(prevProps.contextValue) !== this.getAppData(this.props.contextValue)) {
			this.unsubscribeFromAppData(prevProps.contextValue);
			this.subscribeToAppData();
		}

		const nextLocale = this.getLocale(this.props.contextValue);

		if (nextLocale !== this.state.locale) {
			this.setState({ locale: nextLocale });
		}
	}

	/**
	 * Removes watched locale subscriptions.
	 *
	 * @returns {void}
	 */
	componentWillUnmount() {
		this.unsubscribeFromAppData();
	}

	/**
	 * Gets the app-data service for a context value.
	 *
	 * @param {MusicNotebookContextValue} contextValue
	 * @returns {AppDataService | null}
	 */
	getAppData(contextValue = this.props.contextValue) {
		return contextValue.appData || contextValue.registry?.subscribe?.('app-data') || null;
	}

	/**
	 * Gets the active locale from watched data or localization.
	 *
	 * @param {MusicNotebookContextValue} contextValue
	 * @returns {string}
	 */
	getLocale(contextValue = this.props.contextValue) {
		const appData = this.getAppData(contextValue);
		const localize = contextValue.localize || this.defaultLocalize;
		const defaultLocale = contextValue.locale || localize.getLocale?.() || 'en-US-u-ms-ussystem';

		return /** @type {string} */ (appData?.watch?.('locale', defaultLocale) || defaultLocale);
	}

	/**
	 * Subscribes to app-data locale changes.
	 *
	 * @returns {void}
	 */
	subscribeToAppData() {
		const appData = this.getAppData();

		if (!appData?.listen) {
			return;
		}

		this.appData = appData;
		this.localeListener = appData.listen('updated:locale', this.handleLocaleUpdated);
	}

	/**
	 * Removes app-data locale subscriptions.
	 *
	 * @param {MusicNotebookContextValue} [contextValue]
	 * @returns {void}
	 */
	unsubscribeFromAppData(contextValue = this.props.contextValue) {
		const appData = this.appData || this.getAppData(contextValue);

		if (appData && this.localeListener) {
			appData.unlisten?.('updated:locale', this.localeListener);
		}

		this.appData = null;
		this.localeListener = null;
	}

	/**
	 * Handles watched locale updates.
	 *
	 * @param {string} locale
	 * @returns {void}
	 */
	handleLocaleUpdated(locale) {
		this.setState({ locale });
	}

	/**
	 * Renders the context provider.
	 *
	 * @returns {React.ReactElement}
	 */
	render() {
		const contextValue = {
			...this.props.contextValue,
			appData: this.getAppData(),
			localize: this.props.contextValue.localize || this.defaultLocalize,
			locale: this.state.locale,
		};

		return (
			<MusicNotebookContext.Provider value={contextValue}>
				{this.props.children}
			</MusicNotebookContext.Provider>
		);
	}
}
