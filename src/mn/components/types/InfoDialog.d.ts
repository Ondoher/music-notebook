/** Props for a dismissible information dialog. */
type InfoDialogProps = {
	/** Configured dialog buttons; defaults to a single close button. */
	buttons?: BaseDialogButton[];
	/** Additional dialog root class. */
	className?: string;
	/** Localized content phrase or markdown document name. */
	content?: LocalizedText;
	/** Whether content identifies a localized markdown document. */
	markdown?: boolean;
	/** Localized label for the close action. */
	closeLabel?: string;
	/** Maximum MUI dialog width. */
	maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;
	/** Called when a custom dialog action is selected. */
	onAction?: (buttonId: string) => void;
	/** Called when the dialog requests close. */
	onClose?: () => void;
	/** Replacement values applied to phrase or markdown content. */
	replacements?: Record<string, LocalizedReplacementValue>;
	/** Whether localized phrase content should be parsed as HTML. */
	html?: boolean;
	/** Whether the dialog is open; defaults to true for conditional rendering. */
	open?: boolean;
	/** Dialog title phrase key. */
	title?: string;
};
