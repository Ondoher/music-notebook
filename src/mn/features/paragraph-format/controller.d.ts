/** Controller service for the paragraph-format feature. */
type ParagraphFormatController = {
	/** Gets the feature-owned component rendered by the app shell. */
	getComponent: () => React.ReactElement;
	/** Gets the current paragraph format. */
	getFormat: () => Record<string, unknown>;
	/** Gets the current paragraph-format dialog state. */
	getDialogState: () => { open: boolean; format: Record<string, unknown> };
	/** Opens the paragraph-format dialog. */
	openDialog: () => { open: boolean; format: Record<string, unknown> };
	/** Closes the paragraph-format dialog. */
	closeDialog: () => { open: boolean; format: Record<string, unknown> };
	/** Applies paragraph formatting. */
	applyFormat: (format?: Record<string, unknown>) => Record<string, unknown> | undefined;
	/** Resets direct paragraph formatting. */
	resetFormat: (styleId?: string) => Record<string, unknown> | undefined;
	/** Subscribes to paragraph-format controller events. */
	listen?: (eventName: string, listener: (...args: any[]) => void) => unknown;
	/** Removes a paragraph-format controller event subscription. */
	unlisten?: (eventName: string, listener: unknown) => void;
};
