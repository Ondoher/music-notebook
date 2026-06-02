/// <reference path="./types/AccountDialog.d.ts" />

import React from 'react';

import BaseDialog from '../../../components/BaseDialog.jsx';
import FormMessage from '../../../components/FormMessage.jsx';
import InfoDialog from '../../../components/InfoDialog.jsx';
import PasswordInput from '../../../components/PasswordInput.jsx';
import TextInput from '../../../components/TextInput.jsx';

const EMPTY_FORM = {
	confirmPassword: '',
	email: '',
	password: '',
	passwordValid: false,
	username: '',
};

const PASSWORD_RULES = [
	{
		name: 'length',
		label: 'accounts.password.rule.length',
		fallback: 'At least 8 characters',
		pattern: /.{8,}/,
	},
	{
		name: 'number',
		label: 'accounts.password.rule.number',
		fallback: 'Includes a number',
		pattern: /\d/,
	},
];

/**
 * Renders the create-account dialog and create success result.
 *
 * @extends {React.Component<AccountDialogComponentProps, CreateAccountDialogState>}
 */
export default class CreateAccountDialog extends React.Component {
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

	isResultMode() {
		return this.props.dialogState.mode === 'create-result';
	}

	getButtons() {
		if (this.isResultMode()) {
			return [
				{
					id: 'done',
					labelKey: 'common.close',
					priority: 'primary',
				},
			];
		}

		return [
			{
				id: 'cancel',
				labelKey: 'common.cancel',
				priority: 'secondary',
			},
			{
				id: 'create',
				labelKey: 'accounts.create.submit',
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

		if (!this.state.passwordValid) {
			return 'accounts.error.password_rules';
		}

		if (this.state.password !== this.state.confirmPassword) {
			return 'accounts.error.password_mismatch';
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

		return this.props.accounts?.createAccount?.({
			email: this.state.email.trim() || null,
			password: this.state.password,
			username: this.state.username,
		});
	}

	handleAction(buttonId) {
		if (buttonId === 'cancel' || buttonId === 'close' || buttonId === 'done') {
			this.props.accounts?.closeDialog?.();
			return null;
		}

		if (buttonId === 'create') {
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

	renderResult() {
		return (
			<InfoDialog
				className="accounts-dialog"
				content="accounts.create.result.success.description"
				maxWidth="xs"
				onClose={() => this.props.accounts?.closeDialog?.()}
				open={this.props.dialogState.open}
				title="accounts.create.result.success.title"
			/>
		);
	}

	renderForm() {
		return (
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
				<TextInput
					autoComplete="email"
					className="accounts-text-input"
					label="accounts.email"
					labelFallback="Email"
					name="email"
					onChange={(event) => this.updateField('email', event.target.value)}
					size="small"
					value={this.state.email}
				/>
				<PasswordInput
					autoComplete="new-password"
					label="accounts.password"
					labelFallback="Password"
					name="password"
					onChange={(event) => this.updateField('password', event.target.value)}
					onValidityChange={(passwordValid) => this.setState({passwordValid})}
					rules={PASSWORD_RULES}
					size="small"
					value={this.state.password}
				/>
				<PasswordInput
					autoComplete="new-password"
					label="accounts.confirm_password"
					labelFallback="Confirm password"
					name="confirmPassword"
					onChange={(event) => this.updateField('confirmPassword', event.target.value)}
					size="small"
					value={this.state.confirmPassword}
				/>
			</div>
		);
	}

	render() {
		if (this.isResultMode()) {
			return this.renderResult();
		}

		return (
			<BaseDialog
				buttons={this.getButtons()}
				className="accounts-dialog"
				maxWidth="xs"
				onButtonPress={this.handleAction.bind(this)}
				open={this.props.dialogState.open}
				resetToken={`create-account-${this.props.dialogState.mode}-${this.props.dialogState.open ? 'open' : 'closed'}`}
				showClose
				titleKey="accounts.create.dialog.title"
				descriptionKey="accounts.create.dialog.description"
			>
				{this.renderForm()}
			</BaseDialog>
		);
	}
}
