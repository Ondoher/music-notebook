import { Service } from '@polylith/core';

/** Exposes account dialog launch actions to other features. */
export default class AccountUiService extends Service {
	constructor(registry) {
		super('account-ui', registry);
		this.implement([
			'ready',
			'openCreateAccountDialog',
			'openLoginDialog',
		]);
	}

	/** Subscribes to the account controller implementation. */
	ready() {
		/** @type {AccountsController} */
		this.accounts = this.registry.subscribe('accounts-controller');
	}

	/** Opens the create-account dialog. */
	openCreateAccountDialog() {
		return this.accounts.openCreateAccountDialog();
	}

	/** Opens the login dialog. */
	openLoginDialog() {
		return this.accounts.openLoginDialog();
	}

}

new AccountUiService();
