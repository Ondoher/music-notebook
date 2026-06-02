/** Metadata for one persisted document shown in document lists. */
type DocumentListItem = {
	/** Domain document id. */
	id: string;
	/** User-facing document name. */
	name: string;
	/** UTF-8 byte length of the stored document JSON. */
	size?: number;
	/** Document creation time from Date.now(). */
	createdAt?: number;
	/** Document modification time from Date.now(). */
	modifiedAt?: number;
	/** Local edit lock time from Date.now(), or null when unlocked. */
	lockedAt?: number | null;
};

/** Props for the reusable document list component. */
type DocumentListProps = {
	/** Additional root class name. */
	className?: string;
	/** Persisted documents to display. */
	documents?: DocumentListItem[];
	/** Phrase key used when there are no documents. */
	emptyMessage?: string;
	/** Called when a document is selected. */
	onSelect?: (document: DocumentListItem) => void;
	/** Selected document id. */
	selectedDocumentId?: string;
};
