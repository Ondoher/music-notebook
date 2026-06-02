/** Page settings stored with a notebook document. */
type NotebookDocumentPageSettings = {
	/** Paper size used by page mode and export. */
	size: 'letter' | 'legal' | 'a4' | 'a5';
	/** Page orientation used by page mode and export. */
	orientation: 'portrait' | 'landscape';
	/** Page margins in points. */
	margins: {
		/** Top margin. */
		top: number;
		/** Right margin. */
		right: number;
		/** Bottom margin. */
		bottom: number;
		/** Left margin. */
		left: number;
	};
};

/** Document-level typography settings. */
type NotebookDocumentTypographySettings = {
	/** Default document font size in CSS pixels. */
	fontSize: number;
};

/** Formatting values that may be supplied by a document paragraph style. */
type NotebookParagraphStyleFormat = {
	alignment?: 'left' | 'center' | 'right' | 'justify';
	bold?: boolean;
	fontSize?: number;
	italic?: boolean;
	keepWithNext?: boolean;
	paddingAfter?: number;
	paddingBefore?: number;
	start?: 'continuous' | 'full-line' | 'next-page';
	underline?: boolean;
};

/** Named paragraph style stored globally with a notebook document. */
type NotebookParagraphStyle = {
	id: string;
	name: string;
	parentStyleId: string;
	format: NotebookParagraphStyleFormat;
};

/** Document-level settings that affect editor presentation and export. */
type NotebookDocumentSettings = {
	/** Current editor presentation mode. */
	viewMode: 'continuous' | 'page';
	/** Default chord display style for inline and embedded chords. */
	chordDisplayStyle: 'plain' | 'jazz';
	/** Default typography settings for paragraphs and document rendering. */
	typography: NotebookDocumentTypographySettings;
	/** Global paragraph styles available to document paragraphs. */
	styles: NotebookParagraphStyle[];
	/** Page-mode and export page settings. */
	page: NotebookDocumentPageSettings;
};

/** A notebook tab containing one Quill editor content payload. */
type NotebookTab = {
	/** Stable tab identifier. */
	id: string;
	/** Tab title. Empty is allowed until the tab naming design is settled. */
	title: string;
	/** Sort order within the notebook. */
	order: number;
	/** Editor document content, currently expected to be a Quill Delta-compatible value. */
	editorContent: unknown;
};

/** Input for creating a notebook tab. */
type NotebookTabInput = Partial<NotebookTab> & {
	/** Existing tab id after which the new tab should be inserted. */
	afterTabId?: string;
};

/** A generic object stored in the notebook model. */
type NotebookDocumentObject = {
	/** Stable object identifier. */
	id: string;
	/** Tab that contains this object. */
	tabId: string;
	/** Feature-owned object data. The document model does not interpret these fields. */
	[key: string]: unknown;
};

/** Serializable notebook document snapshot. */
type NotebookDocumentSnapshot = {
	/** Saved document identifier, when one exists. */
	id: string | null;
	/** User-facing document title. */
	title: string;
	/** Revision number for local change tracking and persistence. */
	revision: number;
	/** Document-level settings. */
	settings: NotebookDocumentSettings;
	/** Notebook tabs. */
	tabs: NotebookTab[];
	/** Active tab id. */
	activeTabId: string | null;
	/** Generic embedded and inline objects in this document. */
	objects: NotebookDocumentObject[];
};

/** Document-model registry service. */
type DocumentModelService = {
	/** Gets the current document id. */
	getId: () => string | null;
	/** Gets the current document title. */
	getTitle: () => string;
	/** Updates the current document title. */
	setTitle: (title: string) => string;
	/** Updates the persisted document title without marking document content dirty. */
	rename: (title: string) => string;
	/** Gets the current document revision. */
	getRevision: () => number;
	/** Reports whether the current document has unsaved changes. */
	isDirty: () => boolean;
	/** Marks the current document as saved. */
	markSaved: (revision?: number) => void;
	/** Gets document-level settings. */
	getSettings: () => NotebookDocumentSettings;
	/** Updates document-level settings. */
	updateSettings: (patch: Partial<NotebookDocumentSettings>) => NotebookDocumentSettings;
	/** Gets sorted notebook tabs. */
	getTabs: () => NotebookTab[];
	/** Gets one tab by id. */
	getTab: (tabId: string) => NotebookTab | null;
	/** Adds a notebook tab. */
	addTab: (input?: NotebookTabInput) => NotebookTab;
	/** Updates a notebook tab. */
	updateTab: (tabId: string, patch: Partial<NotebookTab>) => NotebookTab | null;
	/** Removes a notebook tab. The last remaining tab cannot be removed. */
	removeTab: (tabId: string) => boolean;
	/** Moves a tab to a new index. */
	moveTab: (tabId: string, targetIndex: number) => void;
	/** Merges one tab into another, removes the source tab, and returns the target tab. */
	joinTabs: (sourceTabId: string, targetTabId: string) => NotebookTab | null;
	/** Gets the active tab id. */
	getActiveTabId: () => string | null;
	/** Sets the active tab. */
	setActiveTab: (tabId: string) => string | null;
	/** Gets editor content for a tab or for the active tab. */
	getEditorContent: (tabId?: string) => unknown;
	/** Sets editor content for a tab or for the active tab. */
	setEditorContent: (content: unknown, tabId?: string) => unknown;
	/** Gets generic document objects, optionally filtered to a tab. */
	getObjects: (tabId?: string) => NotebookDocumentObject[];
	/** Gets one generic document object by id. */
	getObject: (objectId: string) => NotebookDocumentObject | null;
	/** Creates a generic document object of the given type. */
	createObject: (
		type: string,
		data?: Record<string, unknown>,
		options?: Partial<NotebookDocumentObject>,
	) => NotebookDocumentObject;
	/** Adds or updates a generic document object. Missing ids and tab ids are created from the current document state. */
	upsertObject: (object: Partial<NotebookDocumentObject>) => NotebookDocumentObject;
	/** Updates an existing generic document object. */
	updateObject: (objectId: string, patch: Partial<NotebookDocumentObject>) => NotebookDocumentObject | null;
	/** Removes a generic document object. */
	removeObject: (objectId: string) => boolean;
	/** Serializes the current notebook document. */
	toJSON: () => NotebookDocumentSnapshot;
	/** Loads a notebook document snapshot. */
	load: (snapshot: Partial<NotebookDocumentSnapshot>) => NotebookDocumentSnapshot;
	/** Subscribes to document-model events. */
	listen?: (eventName: string, listener: (...args: any[]) => void) => unknown;
	/** Removes a document-model event subscription. */
	unlisten?: (eventName: string, listener: unknown) => void;
};
