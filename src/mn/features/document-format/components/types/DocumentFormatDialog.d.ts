/** Props for DocumentFormatDialog. */
type DocumentFormatDialogProps = {
	documentFormat: any;
};

/** State for DocumentFormatDialog. */
type DocumentFormatDialogState = {
	open: boolean;
	size: DocumentFormatSizeId;
	orientation: DocumentFormatOrientation;
	fontSize: number;
	margins: {
		top: string;
		right: string;
		bottom: string;
		left: string;
	};
};
