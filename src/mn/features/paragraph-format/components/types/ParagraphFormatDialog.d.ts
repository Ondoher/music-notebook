/** Props for ParagraphFormatDialog. */
type ParagraphFormatDialogProps = {
	paragraphFormat: any;
};

/** State for ParagraphFormatDialog. */
type ParagraphFormatDialogState = {
	open: boolean;
	alignment: ParagraphFormatSettings['alignment'];
	bold: boolean;
	fontSize: number;
	italic: boolean;
	keepWithNext: boolean;
	overrides: ParagraphFormatOverrideMap;
	paddingAfter: number;
	paddingBefore: number;
	start: ParagraphFormatSettings['start'];
	styleId: string;
	underline: boolean;
	dirtyFields: string[];
};
