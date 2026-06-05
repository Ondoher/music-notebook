/** Props for MusicEmbedFormatDialog. */
type MusicEmbedFormatDialogProps = {
	documentStyles?: NotebookParagraphStyle[];
	format?: Partial<MusicEmbedFormat>;
	onCancel?: () => void;
	onChange?: (format: MusicEmbedFormat) => void;
	onCommit?: () => void;
	open: boolean;
};
