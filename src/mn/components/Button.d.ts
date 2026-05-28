/** Callback fired when the button is activated. */
type ButtonClickHandler = (
	/** Button click event. */
	event: React.MouseEvent<HTMLButtonElement>,
) => void;

/** Props for the localized Music Notebook button. */
type ButtonProps = {
	/** Accessible label override for icon-only or abbreviated button content. */
	ariaLabel?: LocalizedText;
	/** Button content rendered instead of the localized label. */
	children?: ComponentChildren;
	/** CSS class name for the rendered button. */
	className?: string;
	/** Whether the button is disabled. */
	disabled?: boolean;
	/** DOM id for the rendered button. */
	id?: string;
	/** Visible button label when children are not supplied. */
	label?: LocalizedText;
	/** Fallback label text when localization is unavailable. */
	labelFallback?: string;
	/** Called when the button is clicked. */
	onClick?: ButtonClickHandler;
	/** Whether the button is in a selected/toggled state. */
	selected?: boolean;
	/** Button size. */
	size?: ButtonSize;
	/** HTML button type. */
	type?: 'button' | 'submit' | 'reset';
	/** Visual priority for the button. */
	variant?: ButtonVariant;
};
