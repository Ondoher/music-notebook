import React from 'react';
import MusicNotebookContext from '../common/MusicNotebookContext.js';

export default class App extends React.Component {
	constructor(props) {
		super(props);
		this.registry = props.registry;
		this.localize = this.registry.subscribe('localize');
		this.state = {
			locale: this.localize.getLocale(),
		};
	}

	componentDidMount() {
		this.localeListener = this.localize.listen(
			'changeLocale',
			(locale) => this.setState({ locale }),
		);
	}

	componentWillUnmount() {
		if (this.localeListener) {
			this.localize.unlisten('changeLocale', this.localeListener);
		}
	}

	render() {
		const contextValue = {
			app: {
				id: 'mn',
			},
			localize: this.localize,
			locale: this.state.locale,
			registry: this.registry,
		};

		return (
			<MusicNotebookContext.Provider value={contextValue}>
				<div className="mn-app">
					{this.props.children}
				</div>
			</MusicNotebookContext.Provider>
		);
	}
}
