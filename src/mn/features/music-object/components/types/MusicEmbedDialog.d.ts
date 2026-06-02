/** Props for the music embed edit dialog. */
type MusicEmbedDialogProps = {
	/** Additional shared settings rendered below the preview. */
	children?: React.ReactNode;
	/** Current editable music payload. */
	currentPayload: KeyboardPayload;
	/** Current key field value. */
	displayKeyInput: string;
	/** Current major/minor key mode. */
	displayKeyMode: KeyMode;
	/** Active edit panel in the dialog. */
	editMode: MusicEmbedEditMode;
	/** Effective selected key after applying enharmonic preferences. */
	effectiveSelectedDisplayKey: string;
	/** Optional enharmonic key spelling offered to the user. */
	enharmonicDisplayKey: string;
	/** Initial chord text shown by the chord editor. */
	initialChordValue: string;
	/** Called with valid chord editor results. */
	onChordChange: (result: MusicBuildResult) => void;
	/** Called when the caption template field changes. */
	onCaptionTemplateChange?: (captionTemplate: string) => void;
	/** Called when a close affordance cancels the edit. */
	onCancel?: () => void;
	/** Fallback close handler used when commit/cancel handlers are not supplied. */
	onClose?: () => void;
	/** Called when the dialog action commits the edit. */
	onCommit?: () => void;
	/** Called when the display key field changes. */
	onDisplayKeyChange: (displayKey: string) => void;
	/** Called when the major/minor key mode changes. */
	onDisplayKeyModeChange: (keyMode: KeyMode) => void;
	/** Called when the edit mode changes. */
	onEditModeChange: (editMode: MusicEmbedEditMode) => void;
	/** Called with valid scale editor results. */
	onScaleChange: (result: MusicBuildResult) => void;
	/** Called when the enharmonic key option changes. */
	onUseEnharmonicKeyChange: (useEnharmonicKey: boolean) => void;
	/** Whether the dialog is open. */
	open: boolean;
	/** Whether the payload should use the offered enharmonic key. */
	useEnharmonicKey: boolean;
};
