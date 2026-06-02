/** Props for the editor toolbar renderer. */
type EditorToolbarProps = {
	/** Editor toolbar service that supplies command items. */
	editorToolbar?: EditorToolbarService | null;
	/** Icon registry used to resolve toolbar item icon ids. */
	iconRegistry?: IconRegistryService | null;
	/** Accessible label for the toolbar. */
	label?: string;
};

/** Internal editor toolbar renderer state. */
type EditorToolbarState = {
	/** Current sorted toolbar snapshot. */
	toolbar: EditorToolbarSnapshot;
	/** Incremented to rerender when icon registrations change. */
	iconVersion: number;
};

declare class EditorToolbar extends React.Component<EditorToolbarProps, EditorToolbarState> {}
