/** Props for the account dialog. */
type AccountDialogProps = {
	/** Account controller service. */
	accounts: AccountsController;
};

/** State for the account dialog. */
type AccountDialogState = AccountsDialogServiceState;

/** Props passed from the account dialog host to one concrete account dialog. */
type AccountDialogComponentProps = {
	/** Account controller service. */
	accounts: AccountsController;
	/** Current account dialog service state. */
	dialogState: AccountsDialogServiceState;
};

/** State for the create-account dialog. */
type CreateAccountDialogState = {
	/** Confirm password field value. */
	confirmPassword: string;
	/** Optional email field value. */
	email: string;
	/** Password field value before client-side hashing. */
	password: string;
	/** Whether the primary password satisfies configured create-account rules. */
	passwordValid: boolean;
	/** Username field value. */
	username: string;
	/** Client-side validation phrase key. */
	validationError: string;
};

/** State for the login dialog. */
type LoginAccountDialogState = {
	/** Password field value before client-side hashing. */
	password: string;
	/** Username field value. */
	username: string;
	/** Client-side validation phrase key. */
	validationError: string;
};
