/** Visual priority for a BaseDialog action button. */
type BaseDialogButtonPriority = 'primary' | 'secondary';

/** Availability state for a BaseDialog action button. */
type BaseDialogButtonEnabled = 'enabled' | 'disabled' | boolean;

/** Pressed state for a pressable BaseDialog action button. */
type BaseDialogButtonPressed = 'pressed' | 'unpressed';

/** Visibility state for a BaseDialog action button. */
type BaseDialogButtonVisibility = 'show' | 'hide';

/** Text request used by BaseDialog shell regions. */
type BaseDialogTextSpec = {
	/** Literal fallback or display text. */
	label?: string;
	/** Localization phrase key. */
	labelKey?: string;
	/** Localization phrase key alias. */
	phrase?: string;
	/** Fallback text when localization is unavailable. */
	fallback?: string;
	/** DOM id for ARIA wiring. */
	id?: string;
};

/** Announcement request sent to the BaseDialog live region. */
type BaseDialogAnnouncement = BaseDialogTextSpec & {
	/** Live-region priority. */
	priority?: 'polite' | 'assertive';
};

/** Configured BaseDialog action button. */
type BaseDialogButton = {
	/** Stable button id emitted through onButtonPress. */
	id: string;
	/** Localization phrase key for the button label. */
	labelKey: string;
	/** Visual button priority. */
	priority?: BaseDialogButtonPriority;
	/** Whether the button is available for activation. */
	enabled?: BaseDialogButtonEnabled;
	/** Whether the button represents a pressable/toggle state. */
	pressable?: boolean;
	/** Pressed state when pressable. */
	pressed?: BaseDialogButtonPressed;
	/** Whether the button is rendered. */
	visibility?: BaseDialogButtonVisibility;
};

/** Controller injected into the single BaseDialog child. */
type BaseDialogController = {
	/** Announces an important dialog state change. */
	announce: (announcement: BaseDialogAnnouncement | string) => void;
	/** Updates one configured button. */
	setButtonState: (buttonId: string, patch: Partial<BaseDialogButton>) => void;
	/** Updates the dialog description. */
	setDescription: (description: BaseDialogTextSpec | null) => void;
	/** Updates the dialog title. */
	setTitle: (title: BaseDialogTextSpec) => void;
	/** Requests submit behavior through onButtonPress("submit"). */
	submit: () => void;
};

/** BaseDialog internal state. */
type BaseDialogState = {
	/** Current live-region announcement. */
	announcement: BaseDialogAnnouncement | null;
	/** Current dialog buttons. */
	buttons: BaseDialogButton[];
	/** Current description. */
	description: BaseDialogTextSpec | null;
	/** Current title. */
	title: BaseDialogTextSpec | null;
};

/** Props for the shared Music Notebook dialog shell. */
type BaseDialogProps = {
	/** Configured action buttons. */
	buttons?: BaseDialogButton[];
	/** Dialog button rendering style. */
	buttonStyle?: 'button' | 'link';
	/** Single child component; receives a dialog prop. */
	children: React.ReactElement;
	/** Additional dialog root class. */
	className?: string;
	/** Localization phrase key overriding the close icon label. */
	closeLabelKey?: string;
	/** Additional actions-region class. */
	actionsClassName?: string;
	/** Additional content-region class. */
	contentClassName?: string;
	/** Description text spec. */
	description?: BaseDialogTextSpec | string;
	/** Localization phrase key for the description. */
	descriptionKey?: string;
	/** Description id for aria-describedby. */
	descriptionId?: string;
	/** Whether the dialog should use full width. */
	fullWidth?: boolean;
	/** MUI dialog max width. */
	maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;
	/** Called for every dialog action by id. */
	onButtonPress?: (buttonId: string) => void;
	/** Whether the dialog is open. */
	open: boolean;
	/** Explicit same-key state reset token. */
	resetToken?: string | number;
	/** Whether the top-right close affordance is shown. */
	showClose?: boolean;
	/** Title text spec. */
	title?: BaseDialogTextSpec | string;
	/** Localization phrase key for the title. */
	titleKey?: string;
	/** Title id for aria-labelledby. */
	titleId?: string;
};
