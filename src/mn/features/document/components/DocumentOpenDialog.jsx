/// <reference path="./types/DocumentOpenDialog.d.ts" />

import React from 'react';

import BaseDialog from '../../../components/BaseDialog.jsx';
import FormMessage from '../../../components/FormMessage.jsx';
import DocumentList from './DocumentList.jsx';

/** Shows the user's saved documents and opens the selected document. */
export default class DocumentOpenDialog extends React.Component {
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
		return props.documentController?.getOpenDialogState?.() || {
			documents: [],
			errorReason: '',
			open: false,
			pending: false,
			selectedDocumentId: '',
		};
	}

	subscribeToController() {
		if (!this.props.documentController?.listen) {
			return;
		}

		this.openDialogChangedListener = this.props.documentController.listen(
			'open-dialog-changed',
			this.onOpenDialogChanged.bind(this),
		);
	}

	unsubscribeFromController() {
		if (this.props.documentController?.unlisten && this.openDialogChangedListener) {
			this.props.documentController.unlisten('open-dialog-changed', this.openDialogChangedListener);
		}

		this.openDialogChangedListener = null;
	}

	onOpenDialogChanged(state) {
		this.setState(state || this.stateFromService(this.props));
	}

	getButtons() {
		return [
			{
				id: 'cancel',
				labelKey: 'common.cancel',
				priority: 'secondary',
			},
			{
				id: 'open',
				labelKey: 'document.open.submit',
				priority: 'primary',
				enabled: Boolean(this.state.selectedDocumentId) && !this.state.pending,
			},
		];
	}

	handleAction(buttonId) {
		if (buttonId === 'close' || buttonId === 'cancel') {
			this.props.documentController?.closeOpenDialog?.();
			return;
		}

		if (buttonId === 'open') {
			this.props.documentController?.submitOpenDialog?.();
		}
	}

	renderStatus() {
		if (!this.state.errorReason) {
			return null;
		}

		return (
			<FormMessage
				className="document-open-dialog__status"
				message={this.state.errorReason}
				type="error"
			/>
		);
	}

	render() {
		if (!this.state.open) {
			return null;
		}

		return (
			<BaseDialog
				buttons={this.getButtons()}
				className="document-open-dialog"
				maxWidth="md"
				onButtonPress={this.handleAction.bind(this)}
				open={this.state.open}
				resetToken={`document-open-${this.state.open ? 'open' : 'closed'}`}
				showClose
				titleKey="document.open.dialog.title"
				descriptionKey="document.open.dialog.description"
			>
				<div className="document-open-dialog__body">
					{this.renderStatus()}
					<DocumentList
						className="document-open-dialog__list"
						documents={this.state.documents}
						onSelect={(document) => this.props.documentController?.selectOpenDialogDocument?.(document.id)}
						selectedDocumentId={this.state.selectedDocumentId}
					/>
				</div>
			</BaseDialog>
		);
	}
}
