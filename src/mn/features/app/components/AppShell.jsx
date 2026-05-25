import React from 'react';
import LocaleString from '../../../components/LocaleString.jsx';

export default class AppShell extends React.Component {
	constructor(props) {
		super(props);

		this.state = {
			activePageId: props.activePageId || '',
			pageComponent: props.pageComponent || null,
			pages: props.pages || [],
		};
	}

	componentDidMount() {
		if (!this.props.appView) {
			return;
		}

		this.pagesUpdatedListener = this.props.appView.listen(
			'pages-updated',
			this.onPagesUpdated.bind(this),
		);
		this.pageMountedListener = this.props.appView.listen(
			'page-mounted',
			this.onPageMounted.bind(this),
		);
		this.syncFromView();
	}

	componentWillUnmount() {
		if (this.props.appView && this.pagesUpdatedListener) {
			this.props.appView.unlisten('pages-updated', this.pagesUpdatedListener);
		}

		if (this.props.appView && this.pageMountedListener) {
			this.props.appView.unlisten('page-mounted', this.pageMountedListener);
		}
	}

	onPagesUpdated(pages) {
		this.setState({ pages });
	}

	onPageMounted({ component, page }) {
		this.setState({
			activePageId: page.id,
			pageComponent: component,
		});
	}

	syncFromView() {
		const shellState = this.props.appView?.getShellState?.();

		if (!shellState) {
			return;
		}

		this.setState({
			activePageId: shellState.activePageId || '',
			pageComponent: shellState.pageComponent || null,
			pages: shellState.pages || [],
		});
	}

	renderPageRegion() {
		if (this.state.pageComponent) {
			return React.cloneElement(this.state.pageComponent, {
				key: this.state.activePageId,
			});
		}

		return (
			<section className="mn-empty-editor">
				<h1><LocaleString phrase="app.empty_editor.title" /></h1>
				<p><LocaleString phrase="app.empty_editor.message" /></p>
			</section>
		);
	}

	render() {
		return (
			<div className="mn-shell">
				<main className="mn-shell-editor" aria-label={this.props.appTitle || 'Music Notebook'}>
					{this.renderPageRegion()}
				</main>
			</div>
		);
	}
}
