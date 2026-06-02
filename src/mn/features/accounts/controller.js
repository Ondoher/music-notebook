import React from 'react';
import { Service } from '@polylith/core';

import AccountDialog from './components/AccountDialog.jsx';
import AccountStatus from './components/AccountStatus.jsx';

/** Registers account commands and owns the account dialog host. */
export default class AccountsController extends Service {
	constructor(registry) {
		super('accounts-controller', registry);
		this.implement([
			'ready',
			'getDialogState',
			'openCreateAccountDialog',
			'openLoginDialog',
			'openCreateResultDialog',
			'closeDialog',
			'createLogoutIntent',
			'createAccount',
			'login',
			'logout',
			'getAccount',
			'getComponent',
		]);
		this.dialogMode = '';
		this.dialogOpen = false;
		this.errorReason = '';
		this.pending = false;
		this.resultReason = '';
		this.resultSuccess = false;
	}

	/** Subscribes to account dependencies. */
	ready() {
		/** @type {AccountModelService} */
		this.accountModel = this.registry.subscribe('account-model');

		this.accountSessionChangedListener = this.accountModel.listen?.(
			'account-session-changed',
			this.onAccountSessionChanged.bind(this),
		);
		this.accountChangedListener = this.accountModel.listen?.(
			'account-changed',
			this.onAccountChanged.bind(this),
		);
		this.accountSessionClearedListener = this.accountModel.listen?.(
			'account-session-cleared',
			this.onAccountSessionCleared.bind(this),
		);
	}

	/**
	 * Gets the current account dialog state.
	 *
	 * @returns {AccountsDialogServiceState} Returns the dialog state.
	 */
	getDialogState() {
		return {
			errorReason: this.errorReason,
			mode: this.dialogMode,
			open: this.dialogOpen,
			pending: this.pending,
			resultReason: this.resultReason,
			resultSuccess: this.resultSuccess,
		};
	}

	/**
	 * Opens the create-account dialog.
	 *
	 * @returns {AccountsDialogServiceState} Returns the dialog state.
	 */
	openCreateAccountDialog() {
		return this.openDialog('create');
	}

	/**
	 * Opens the login dialog.
	 *
	 * @returns {AccountsDialogServiceState} Returns the dialog state.
	 */
	openLoginDialog() {
		return this.openDialog('login');
	}

	/**
	 * Opens the create-account result dialog.
	 *
	 * @param {boolean} success - Supplies whether account creation succeeded.
	 * @param {string} [reason] - Supplies an optional failure reason phrase key.
	 * @returns {AccountsDialogServiceState} Returns the dialog state.
	 */
	openCreateResultDialog(success, reason = '') {
		this.dialogMode = 'create-result';
		this.dialogOpen = true;
		this.errorReason = '';
		this.pending = false;
		this.resultSuccess = success;
		this.resultReason = reason;
		this.fire('dialog-changed', this.getDialogState());
		return this.getDialogState();
	}

	/**
	 * Opens one account dialog mode.
	 *
	 * @param {'create' | 'login'} mode - Selects the dialog mode.
	 * @returns {AccountsDialogServiceState} Returns the dialog state.
	 */
	openDialog(mode) {
		this.dialogMode = mode;
		this.dialogOpen = true;
		this.errorReason = '';
		this.pending = false;
		this.resultReason = '';
		this.resultSuccess = false;
		this.fire('dialog-changed', this.getDialogState());
		return this.getDialogState();
	}

	/**
	 * Closes the account dialog.
	 *
	 * @returns {AccountsDialogServiceState} Returns the dialog state.
	 */
	closeDialog() {
		this.dialogOpen = false;
		this.pending = false;
		this.resultReason = '';
		this.resultSuccess = false;
		this.fire('dialog-changed', this.getDialogState());
		return this.getDialogState();
	}

	/**
	 * Creates an account through the account model.
	 *
	 * @param {AccountDialogCredentials} credentials - Supplies account fields.
	 * @returns {Promise<IoResult>} Returns the account model result.
	 */
	async createAccount(credentials) {
		return this.submit('create', credentials);
	}

	/**
	 * Logs in through the account model.
	 *
	 * @param {AccountDialogCredentials} credentials - Supplies login fields.
	 * @returns {Promise<IoResult>} Returns the account model result.
	 */
	async login(credentials) {
		return this.submit('login', credentials);
	}

	/**
	 * Logs out of the local account session after confirmation.
	 *
	 * @returns {Promise<IoResult>} Returns the normalized logout result.
	 */
	async logout() {
		this.pending = true;
		this.errorReason = '';
		this.fire('dialog-changed', this.getDialogState());

		let intent = this.createLogoutIntent();
		await this.fire('logout-intent', intent);

		if (intent.cancelled) {
			this.dialogOpen = false;
			this.pending = false;
			this.errorReason = '';
			this.fire('dialog-changed', this.getDialogState());
			return {
				success: false,
				cancelled: true,
				reason: intent.cancelReason || 'accounts.logout.cancelled',
			};
		}

		let result = await this.accountModel.logout();

		this.dialogOpen = false;
		this.pending = false;
		this.errorReason = '';

		this.fire('account-logged-out');
		this.fire('account-changed', null);
		this.fire('dialog-changed', this.getDialogState());
		return result;
	}

	/**
	 * Creates a cancellable intent emitted before logout is finalized.
	 *
	 * @returns {AccountLogoutIntent} Returns the logout intent.
	 */
	createLogoutIntent() {
		return {
			account: this.getAccount(),
			cancelReason: '',
			cancelled: false,
			type: 'logout',
			cancel(reason = 'accounts.logout.cancelled') {
				this.cancelled = true;
				this.cancelReason = reason;
			},
		};
	}

	/**
	 * Gets the currently authenticated account.
	 *
	 * @returns {AccountModelAccount | null} Returns the current account or null.
	 */
	getAccount() {
		return this.accountModel?.getAccount?.() || null;
	}

	/**
	 * Gets the account status and dialog host component for the app shell.
	 *
	 * @returns {React.ReactElement} Returns the account shell element.
	 */
	getComponent() {
		return (
			<React.Fragment>
				<AccountStatus accounts={this} />
				<AccountDialog accounts={this} />
			</React.Fragment>
		);
	}

	/**
	 * Submits one account action.
	 *
	 * @param {'create' | 'login'} mode - Selects the account action.
	 * @param {AccountDialogCredentials} credentials - Supplies account fields.
	 * @returns {Promise<IoResult>} Returns the account model result.
	 */
	async submit(mode, credentials) {
		this.pending = true;
		this.errorReason = '';
		this.fire('dialog-changed', this.getDialogState());

		let result;

		try {
			result = mode === 'create'
				? await this.accountModel.createAccount(credentials)
				: await this.accountModel.login(credentials);
		} catch (error) {
			result = {
				success: false,
				failureMode: 'exception',
				reason: 'accounts.error.generic',
				error,
			};
		}

		if (result.success && result.data?.success) {
			this.fire('account-authenticated', this.accountModel.getAccount());
			this.fire('account-changed', this.accountModel.getAccount());
			if (mode === 'create') {
				this.openCreateResultDialog(true);
			} else {
				this.dialogOpen = false;
				this.pending = false;
				this.errorReason = '';
				this.fire('dialog-changed', this.getDialogState());
			}
			return result;
		}

		this.pending = false;
		this.errorReason = result.data?.reason || result.reason || 'accounts.error.generic';
		this.fire('dialog-changed', this.getDialogState());
		return result;
	}

	onAccountSessionChanged(event) {
		this.fire('account-changed', event?.account || this.getAccount());
	}

	onAccountChanged(event) {
		this.fire('account-changed', event?.account || this.getAccount());
	}

	onAccountSessionCleared() {
		this.fire('account-changed', null);
	}
}

new AccountsController();
