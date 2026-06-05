/** Props for the editor toolbar renderer. */
type EditorToolbarProps = {
	/** Editor toolbar service that supplies command items. */
	editorToolbar?: EditorToolbarService | null;
	/** Action registry used to resolve toolbar item presentation components. */
	actionRegistry?: ActionRegistryService | null;
	/** Accessible label for the toolbar. */
	label?: string;
};

/** Internal editor toolbar renderer state. */
type EditorToolbarState = {
	/** Current sorted toolbar snapshot. */
	toolbar: EditorToolbarSnapshot;
	/** Incremented to rerender when action presentation registrations change. */
	actionVersion: number;
};

declare class EditorToolbar extends React.Component<EditorToolbarProps, EditorToolbarState> {}
