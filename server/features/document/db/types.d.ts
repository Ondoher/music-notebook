/** Defines Mongo connection settings for the documents collection. */
type DocumentsDbOptions = {
	/** Mongo connection URI. */
	uri: string;
	/** Mongo database name. */
	dbName: string;
	/** Mongo collection name. */
	collectionName: string;
	/** Milliseconds to wait while opening a socket connection. */
	connectTimeoutMS?: number;
	/** Milliseconds to wait while selecting a usable Mongo server. */
	serverSelectionTimeoutMS?: number;
};

/** Identifies one app/account document ownership scope. */
type DocumentScope = {
	/** App namespace id. */
	appId: string;
	/** Owning account id. */
	accountId: string;
};

/** Stores one notebook document record in Mongo. */
type DocumentRecord = DocumentScope & {
	/** Domain document id. */
	id: string;
	/** User-facing document name. */
	name: string;
	/** JSON notebook snapshot. */
	content: any;
	/** UTF-8 byte length of the stored document JSON. */
	size: number;
	/** Document creation time from Date.now(). */
	createdAt: number;
	/** Document modification time from Date.now(). */
	modifiedAt: number;
	/** Local edit lock time from Date.now(), or null when unlocked. */
	lockedAt: number | null;
};
