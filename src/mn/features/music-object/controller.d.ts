/** Controller-owned action rendered by an embedded object presentation. */
type MusicObjectEmbedAction = {
	id: string;
	className?: string;
	disabled?: boolean;
	fallback: string;
	iconComponent?: React.ComponentType<any> | null;
	iconId: string;
	labelKey: string;
	pressed?: boolean;
};

/** Public state exposed by a controller-owned music embed session. */
type MusicObjectEmbedSessionState = {
	actions: MusicObjectEmbedAction[];
	dialogOpen: boolean;
	hovered: boolean;
	playbackState: MusicEmbedPlaybackState;
	selected: boolean;
};

/** Options used to attach one rendered music embed to the controller. */
type MusicObjectEmbedSessionOptions = {
	getValue?: () => KeyboardPayload;
	id?: string;
	initialDialogOpen?: boolean;
	onOpenDialog?: () => void;
	onOpenFormatDialog?: () => void;
	type?: string;
};

/** Controller-owned behavior session for one rendered music embed. */
type MusicObjectEmbedSession = {
	getDocumentStyles: () => NotebookParagraphStyle[];
	getState: () => MusicObjectEmbedSessionState;
	listen: (eventName: 'changed', listener: (state: MusicObjectEmbedSessionState) => void) => unknown;
	unlisten: (eventName: 'changed', listenerId: unknown) => void;
	setHovered: (hovered: boolean) => void;
	setSelected: (selected: boolean) => void;
	performAction: (actionId: string) => boolean;
	closeDialog: () => void;
	detach: () => void;
};

/** Controller service for the music-object feature. */
type MusicObjectController = {
	attachEmbed: (options?: MusicObjectEmbedSessionOptions) => MusicObjectEmbedSession;
	getDocumentStyles: () => NotebookParagraphStyle[];
	getEmbedActionComponent: (action: MusicObjectEmbedAction) => React.ComponentType<any> | null;
	getPlayerService: () => PlayerService | null;
};
