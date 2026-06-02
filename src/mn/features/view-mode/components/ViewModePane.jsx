import React from 'react';
import PagedViewPreview from './PagedViewPreview.jsx';

/**
 * Hosts the read/view rendering surface.
 *
 * The editor currently mounts this in its split workspace, but the component is
 * owned by view-mode so a later read-mode route or app area can mount the same
 * surface without depending on editor internals.
 *
 * @extends {React.Component<ViewModePaneProps>}
 */
export default class ViewModePane extends React.Component {
	render() {
		return (
			<PagedViewPreview
				contentHtml={this.props.contentHtml}
				contentRoot={this.props.contentRoot}
				pageCss={this.props.pageCss}
				styleRules={this.props.styleRules}
				viewMode={this.props.viewMode}
			/>
		);
	}
}
