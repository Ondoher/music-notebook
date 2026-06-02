/// <reference path="./types/AccountDialog.d.ts" />

import React from 'react';

import BaseDialog from '../../../components/BaseDialog.jsx';
import FormMessage from '../../../components/FormMessage.jsx';
import PasswordInput from '../../../components/PasswordInput.jsx';
import TextInput from '../../../components/TextInput.jsx';

const EMPTY_FORM = {
	password: '',
	username: '',
};

/**
 * Renders the login dialog.
 *
 * @extends {React.Component<AccountDialogComponentProps, LoginAccountDialogState>}
 */
export default class LoginAccountDialog extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			...EMPTY_FORM,
			validationError: '',
		};
	}

	updateField(field, value) {
		this.setState({
			[field]: value,
			validationError: '',
		});
	}

	getButtons() {
		return [
			{
				id: 'cancel',
				labelKey: 'common.cancel',
				priority: 'secondary',
			},
			{
				id: 'login',
				labelKey: 'accounts.login.submit',
				priority: 'primary',
			},
		];
	}

	validate() {
		if (!this.state.username.trim()) {
			return 'accounts.error.username_required';
		}

		if (!this.state.password) {
			return 'accounts.error.password_required';
		}

		return '';
	}

	async submit() {
		const validationError = this.validate();

		if (validationError) {
			this.setState({validationError});
			return {
				success: false,
				reason: validationError,
			};
		}

		return this.props.accounts?.login?.({
			password: this.state.password,
			username: this.state.username,
		});
	}

	handleAction(buttonId) {
		if (buttonId === 'cancel' || buttonId === 'close') {
			this.props.accounts?.closeDialog?.();
			return null;
		}

		if (buttonId === 'login') {
			return this.submit();
		}

		return null;
	}

	renderStatus() {
		const helperText = this.state.validationError || this.props.dialogState.errorReason;

		if (!helperText) {
			return null;
		}

		return (
			<FormMessage
				className="accounts-dialog__status"
				message={helperText}
				type="error"
			/>
		);
	}

	render() {
		return (
			<BaseDialog
				buttons={this.getButtons()}
				className="accounts-dialog"
				maxWidth="xs"
				onButtonPress={this.handleAction.bind(this)}
				open={this.props.dialogState.open}
				resetToken={`login-account-${this.props.dialogState.open ? 'open' : 'closed'}`}
				showClose
				titleKey="accounts.login.dialog.title"
				descriptionKey="accounts.login.dialog.description"
			>
				<div className="accounts-dialog__body">
					{this.renderStatus()}
					<TextInput
						autoComplete="username"
						className="accounts-text-input"
						label="accounts.username"
						labelFallback="Username"
						name="username"
						onChange={(event) => this.updateField('username', event.target.value)}
						required
						size="small"
						value={this.state.username}
					/>
					<PasswordInput
						autoComplete="current-password"
						label="accounts.password"
						labelFallback="Password"
						name="password"
						onChange={(event) => this.updateField('password', event.target.value)}
						size="small"
						value={this.state.password}
					/>
				</div>
			</BaseDialog>
		);
	}
}
