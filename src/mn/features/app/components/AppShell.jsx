import React from 'react';
import LocaleString from '../../../components/LocaleString.jsx';
import DocumentTabs from './DocumentTabs.jsx';
import MainMenu from './MainMenu.jsx';

/**
 * Renders the app shell around the active page supplied by the app-view service.
 *
 * @extends {React.Component<AppShellProps, AppShellState>}
 */
export default class AppShell extends React.Component {
	/**
	 * Initializes app shell state from props.
	 *
	 * @param {AppShellProps} props
	 */
	constructor(props) {
		super(props);

		this.state = {
			activePageId: props.activePageId || '',
			documentTabs: props.documentTabs || { activeTabId: '', tabs: [] },
			pageComponent: props.pageComponent || null,
			pages: props.pages || [],
		};
	}

	/**
	 * Subscribes to app-view updates after mount.
	 *
	 * @returns {void}
	 */
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
		this.documentTabsUpdatedListener = this.props.appView.listen(
			'document-tabs-updated',
			this.onDocumentTabsUpdated.bind(this),
		);
		this.syncFromView();
	}

	componentDidUpdate(prevProps) {
		if (prevProps.documentTabs !== this.props.documentTabs) {
			this.setState({
				documentTabs: this.props.documentTabs || { activeTabId: '', tabs: [] },
			});
		}
	}

	/**
	 * Removes app-view subscriptions before unmount.
	 *
	 * @returns {void}
	 */
	componentWillUnmount() {
		if (this.props.appView && this.pagesUpdatedListener) {
			this.props.appView.unlisten('pages-updated', this.pagesUpdatedListener);
		}

		if (this.props.appView && this.pageMountedListener) {
			this.props.appView.unlisten('page-mounted', this.pageMountedListener);
		}

		if (this.props.appView && this.documentTabsUpdatedListener) {
			this.props.appView.unlisten('document-tabs-updated', this.documentTabsUpdatedListener);
		}
	}

	/**
	 * Updates the shell page list from the app-view service.
	 *
	 * @param {AppShellPage[]} pages
	 * @returns {void}
	 */
	onPagesUpdated(pages) {
		this.setState({ pages });
	}

	/**
	 * Stores the active mounted page from the app-view event.
	 *
	 * @param {PageMountedEvent} event
	 * @returns {void}
	 */
	onPageMounted({ component, page }) {
		this.setState({
			activePageId: page.id,
			pageComponent: component,
		});
	}

	onDocumentTabsUpdated(documentTabs) {
		this.setState({
			documentTabs: documentTabs || { activeTabId: '', tabs: [] },
		});
	}

	/**
	 * Synchronizes shell state from the app-view snapshot.
	 *
	 * @returns {void}
	 */
	syncFromView() {
		const shellState = this.props.appView?.getShellState?.();

		if (!shellState) {
			return;
		}

		this.setState({
			activePageId: shellState.activePageId || '',
			documentTabs: shellState.documentTabs || { activeTabId: '', tabs: [] },
			pageComponent: shellState.pageComponent || null,
			pages: shellState.pages || [],
		});
	}

	/**
	 * Renders the active page or the empty editor state.
	 *
	 * @returns {React.ReactElement}
	 */
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

	/**
	 * Renders the app shell layout.
	 *
	 * @returns {React.ReactElement}
	 */
	render() {
		return (
			<div className="mn-shell">
				<header className="mn-shell-topbar">
					<MainMenu
						appTitle={this.props.appTitle}
						mainMenu={this.props.mainMenu}
					/>
					<div className="mn-shell-account">
						{this.props.accountComponent || null}
					</div>
				</header>
				<main className="mn-shell-editor" aria-label={this.props.appTitle || 'Music Notebook'}>
					{this.renderPageRegion()}
				</main>
				<DocumentTabs
					activeTabId={this.state.documentTabs.activeTabId}
					onAddTab={this.props.onAddDocumentTab}
					onMoveTab={this.props.onMoveDocumentTab}
					onRenameTab={this.props.onRenameDocumentTab}
					onSelectTab={this.props.onSelectDocumentTab}
					tabs={this.state.documentTabs.tabs}
				/>
				{this.props.featureComponents || null}
			</div>
		);
	}
}
