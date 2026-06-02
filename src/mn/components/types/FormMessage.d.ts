/** Semantic form message type mapped to MUI alert severity. */
type FormMessageType = 'success' | 'info' | 'warning' | 'error';

/** Props for a prominent localized form or dialog message. */
type FormMessageProps = {
	/** CSS class name applied to the alert. */
	className?: string;
	/** Whether localized text may contain HTML. */
	html?: boolean;
	/** Localized message content. */
	message?: LocalizedText;
	/** DOM id applied to the localized message content. */
	messageId?: string;
	/** Called when the alert close affordance is activated. */
	onClose?: () => void;
	/** Semantic message type. */
	type?: FormMessageType;
	/** MUI alert variant. */
	variant?: 'filled' | 'outlined' | 'standard';
};
