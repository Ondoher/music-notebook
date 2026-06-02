/// <reference path="./types/DocumentNameDialog.d.ts" />

import React from 'react';

import BaseDialog from '../../../components/BaseDialog.jsx';
import FormMessage from '../../../components/FormMessage.jsx';
import TextInput from '../../../components/TextInput.jsx';
import DocumentList from './DocumentList.jsx';

/** Prompts for a document name while showing existing documents for conflict help. */
export default class DocumentNameDialog extends React.Component {
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
		return props.documentController?.getNameDialogState?.() || {
			conflictConfirmed: false,
			conflictDocument: null,
			documents: [],
			errorReason: '',
			mode: '',
			name: '',
			open: false,
			pending: false,
		};
	}

	subscribeToController() {
		if (!this.props.documentController?.listen) {
			return;
		}

		this.nameDialogChangedListener = this.props.documentController.listen(
			'name-dialog-changed',
			this.onNameDialogChanged.bind(this),
		);
	}

	unsubscribeFromController() {
		if (this.props.documentController?.unlisten && this.nameDialogChangedListener) {
			this.props.documentController.unlisten('name-dialog-changed', this.nameDialogChangedListener);
		}

		this.nameDialogChangedListener = null;
	}

	onNameDialogChanged(state) {
		this.setState(state || this.stateFromService(this.props));
	}

	updateName(name) {
		this.props.documentController?.updateNameDialogName?.(name);
	}

	getModeConfig() {
		return this.props.documentController?.getNameDialogModeConfig?.(this.state.mode) || {};
	}

	getButtons() {
		const config = this.getModeConfig();

		return [
			{
				id: 'cancel',
				labelKey: config.cancelLabel || 'common.cancel',
				priority: 'secondary',
			},
			{
				id: 'submit',
				labelKey: config.submitLabel || 'common.save',
				priority: 'primary',
				enabled: !this.state.pending,
			},
		];
	}

	handleAction(buttonId) {
		if (buttonId === 'close' || buttonId === 'cancel') {
			this.props.documentController?.closeNameDialog?.();
			return;
		}

		if (buttonId === 'submit') {
			this.props.documentController?.submitNameDialog?.();
		}
	}

	renderStatus() {
		if (this.state.errorReason) {
			return (
				<FormMessage
					className="document-name-dialog__status"
					message={this.state.errorReason}
					type="error"
				/>
			);
		}

		if (this.state.conflictConfirmed && this.state.conflictDocument) {
			const config = this.getModeConfig();

			return (
				<FormMessage
					className="document-name-dialog__status"
					message={config.conflictMessage || 'document.name.conflict'}
					type="warning"
				/>
			);
		}

		return null;
	}

	render() {
		if (!this.state.open) {
			return null;
		}

		const config = this.getModeConfig();

		return (
			<BaseDialog
				buttons={this.getButtons()}
				className="document-name-dialog"
				maxWidth="sm"
				onButtonPress={this.handleAction.bind(this)}
				open={this.state.open}
				resetToken={`document-name-${this.state.mode}-${this.state.open ? 'open' : 'closed'}`}
				showClose
				titleKey={config.title || 'document.name.dialog.title'}
				descriptionKey={config.description || 'document.name.dialog.description'}
			>
				<div className="document-name-dialog__body">
					{this.renderStatus()}
					<DocumentList
						className="document-name-dialog__list"
						documents={this.state.documents}
						onSelect={(document) => this.updateName(document.name)}
						selectedDocumentId={this.state.conflictConfirmed ? this.state.conflictDocument?.id || '' : ''}
					/>
					<TextInput
						autoComplete="off"
						className="document-name-dialog__name"
						disabled={this.state.pending}
						label="document.name.field"
						labelFallback="Document name"
						name="document-name"
						onChange={(event) => this.updateName(event.target.value)}
						required
						size="small"
						value={this.state.name}
					/>
				</div>
			</BaseDialog>
		);
	}
}
