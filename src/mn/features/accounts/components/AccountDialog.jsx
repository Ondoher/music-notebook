/// <reference path="./types/AccountDialog.d.ts" />

import React from 'react';

import CreateAccountDialog from './CreateAccountDialog.jsx';
import LoginAccountDialog from './LoginAccountDialog.jsx';

/**
 * Hosts the account dialogs exposed through the account controller service.
 *
 * @extends {React.Component<AccountDialogProps, AccountDialogState>}
 */
export default class AccountDialog extends React.Component {
	constructor(props) {
		super(props);
		this.state = this.stateFromService(props);
	}

	componentDidMount() {
		this.subscribeToAccounts();
	}

	componentDidUpdate(prevProps) {
		if (prevProps.accounts === this.props.accounts) {
			return;
		}

		this.unsubscribeFromAccounts(prevProps.accounts);
		this.subscribeToAccounts();
		this.setState(this.stateFromService(this.props));
	}

	componentWillUnmount() {
		this.unsubscribeFromAccounts();
	}

	subscribeToAccounts() {
		if (!this.props.accounts?.listen) {
			return;
		}

		this.dialogChangedListener = this.props.accounts.listen(
			'dialog-changed',
			this.onDialogChanged.bind(this),
		);
	}

	unsubscribeFromAccounts(accounts = this.props.accounts) {
		if (accounts?.unlisten && this.dialogChangedListener) {
			accounts.unlisten('dialog-changed', this.dialogChangedListener);
		}

		this.dialogChangedListener = null;
	}

	stateFromService(props) {
		const dialogState = props.accounts?.getDialogState?.() || {
			errorReason: '',
			mode: '',
			open: false,
			pending: false,
			resultReason: '',
			resultSuccess: false,
		};

		return {
			errorReason: dialogState.errorReason || '',
			mode: dialogState.mode || '',
			open: dialogState.open === true,
			pending: dialogState.pending === true,
			resultReason: dialogState.resultReason || '',
			resultSuccess: dialogState.resultSuccess === true,
		};
	}

	onDialogChanged() {
		this.setState(this.stateFromService(this.props));
	}

	render() {
		const props = {
			accounts: this.props.accounts,
			dialogState: this.state,
		};

		if (this.state.mode === 'create' || this.state.mode === 'create-result') {
			return <CreateAccountDialog key="create-account" {...props} />;
		}

		if (this.state.mode === 'login') {
			return <LoginAccountDialog key="login-account" {...props} />;
		}

		return null;
	}
}
