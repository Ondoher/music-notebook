/** One password complexity rule shown by PasswordInput. */
type PasswordComplexityRule = {
	/** Stable rule name. */
	name: string;
	/** Localized rule label. */
	label: LocalizedText;
	/** Fallback rule label when localization is unavailable. */
	fallback?: string;
	/** Pattern that must match the password value for the rule to pass. */
	pattern: RegExp;
};

/** Props for the password complexity rule list. */
type PasswordComplexityProps = {
	/** Pass/fail state keyed by rule name. */
	passed: Record<string, boolean>;
	/** Rules to render. */
	rules: PasswordComplexityRule[];
};

/** Callback fired when password complexity validity changes. */
type PasswordValidityChangeHandler = (
	/** Whether every configured rule passed. */
	valid: boolean,
	/** Pass/fail state keyed by rule name. */
	passed: Record<string, boolean>,
) => void;

/** Props for the localized Music Notebook password input. */
type PasswordInputProps = TextInputProps & {
	/** Password complexity rules to display after editing begins. */
	rules?: PasswordComplexityRule[];
	/** Localized label for the visibility toggle button. */
	toggleVisibilityLabel?: LocalizedText;
	/** Called when password complexity validity changes. */
	onValidityChange?: PasswordValidityChangeHandler;
};
