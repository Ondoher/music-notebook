/** UI service for launching account-owned dialogs from other features. */
type AccountUiService = {
	/** Opens the create-account dialog. */
	openCreateAccountDialog: () => AccountsDialogServiceState;
	/** Opens the login dialog. */
	openLoginDialog: () => AccountsDialogServiceState;
};
