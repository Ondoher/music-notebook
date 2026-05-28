import React from 'react';
import MusicNotebookProvider from '../common/MusicNotebookProvider.jsx';

/**
 * Provides Music Notebook application services and locale state to React.
 *
 * @extends {React.Component<AppProps, AppState>}
 */
export default class App extends React.Component {
	/**
	 * Initializes app services from the registry.
	 *
	 * @param {AppProps} props
	 */
	constructor(props) {
		super(props);
		this.registry = props.registry;
		this.localize = this.registry.subscribe('localize');
		this.appData = this.registry.subscribe('app-data');
		this.appData?.watch?.('locale', this.localize.getLocale());
	}

	/**
	 * Subscribes to locale changes after the app is mounted.
	 *
	 * @returns {void}
	 */
	componentDidMount() {
		this.localeListener = this.localize.listen(
			'changeLocale',
			(locale) => this.appData?.update?.('locale', locale),
		);
	}

	/**
	 * Removes locale listeners before the app unmounts.
	 *
	 * @returns {void}
	 */
	componentWillUnmount() {
		if (this.localeListener) {
			this.localize.unlisten('changeLocale', this.localeListener);
		}
	}

	/**
	 * Renders the app provider and children.
	 *
	 * @returns {React.ReactElement}
	 */
	render() {
		const contextValue = {
			app: {
				id: 'mn',
			},
			appData: this.appData,
			localize: this.localize,
			locale: this.appData?.get?.('locale', this.localize.getLocale()) || this.localize.getLocale(),
			registry: this.registry,
		};

		return (
			<MusicNotebookProvider contextValue={contextValue}>
				<div className="mn-app">
					{this.props.children}
				</div>
			</MusicNotebookProvider>
		);
	}
}
