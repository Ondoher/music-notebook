/// <reference path="./types/DocumentMessageDialog.d.ts" />

import React from 'react';

import InfoDialog from '../../../components/InfoDialog.jsx';

/**
 * Hosts document feature informational messages.
 *
 * @extends {React.Component<DocumentMessageDialogProps, DocumentMessageDialogState>}
 */
export default class DocumentMessageDialog extends React.Component {
	constructor(props) {
		super(props);
		this.state = this.stateFromService(props);
	}

	componentDidMount() {
		this.subscribeToController();
	}

	componentWillUnmount() {
		this.unsubscribeFromController();
	}

	stateFromService(props) {
		return props.documentController?.getDialogState?.() || {
			content: '',
			open: false,
			title: '',
		};
	}

	subscribeToController() {
		if (!this.props.documentController?.listen) {
			return;
		}

		this.dialogChangedListener = this.props.documentController.listen(
			'dialog-changed',
			this.onDialogChanged.bind(this),
		);
	}

	unsubscribeFromController() {
		if (this.props.documentController?.unlisten && this.dialogChangedListener) {
			this.props.documentController.unlisten('dialog-changed', this.dialogChangedListener);
		}

		this.dialogChangedListener = null;
	}

	onDialogChanged(state) {
		this.setState(state || this.stateFromService(this.props));
	}

	render() {
		if (!this.state.open) {
			return null;
		}

		return (
			<InfoDialog
				content={this.state.content}
				buttons={this.state.buttons}
				maxWidth="xs"
				onAction={(buttonId) => this.props.documentController?.onDialogAction?.(buttonId)}
				onClose={() => this.props.documentController?.closeDialog?.()}
				open={this.state.open}
				title={this.state.title}
			/>
		);
	}
}
