/** Props for the account status control. */
type AccountStatusProps = {
	/** Account controller service. */
	accounts: AccountsController;
};

/** State for the account status control. */
type AccountStatusState = {
	/** Current authenticated account, when present. */
	account: AccountModelAccount | null;
	/** Anchor element for the user action menu. */
	anchorEl: HTMLElement | null;
};
