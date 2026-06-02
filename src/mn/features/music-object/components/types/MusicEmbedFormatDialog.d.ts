/** Props for MusicEmbedFormatDialog. */
type MusicEmbedFormatDialogProps = {
	format?: Partial<MusicEmbedFormat>;
	onCancel?: () => void;
	onChange?: (format: MusicEmbedFormat) => void;
	onCommit?: () => void;
	open: boolean;
};
