/** Props for a simple two-action alert dialog. */
type AlertDialogProps = {
	/** Additional dialog root class. */
	className?: string;
	/** Localized content phrase, phrase spec, or list of phrases/specs. */
	content: LocalizedText | LocalizedText[];
	/** Whether content should be parsed as localized HTML. */
	html?: boolean;
	/** Called when the dialog requests close. */
	onClose?: () => void;
	/** Called when the primary action is selected. */
	onPrimary?: () => void;
	/** Called when the secondary action is selected. */
	onSecondary?: () => void;
	/** Whether the dialog is open; defaults to true for conditional rendering. */
	open?: boolean;
	/** Primary action phrase key. */
	primaryText: string;
	/** Secondary action phrase key. */
	secondaryText: string;
	/** Dialog title phrase key. */
	title: string;
};
