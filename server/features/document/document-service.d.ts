/// <reference path="./db/types.d.ts" />

/** Document metadata returned to clients. */
type DocumentMetadataResponse = {
	/** Domain document id. */
	id: string;
	/** App namespace id. */
	appId: string;
	/** User-facing document name. */
	name: string;
	/** UTF-8 byte length of the stored document JSON. */
	size: number;
	/** Document creation time from Date.now(). */
	createdAt: number;
	/** Document modification time from Date.now(). */
	modifiedAt: number;
	/** Local edit lock time from Date.now(), or null when unlocked. */
	lockedAt: number | null;
};

/** Full document returned to clients. */
type DocumentResponse = DocumentMetadataResponse & {
	/** JSON notebook snapshot. */
	content: any;
};

/** Authenticated document request shape. */
type DocumentRequest = {
	/** Authenticated account provided by document-router middleware. */
	account: AccountResponseData;
	/** Parsed request headers. */
	headers?: Record<string, any>;
	/** Gets one request header. */
	get?: (name: string) => string | undefined;
	/** Parsed route params. */
	params?: Record<string, string>;
	/** Parsed request body. */
	body?: Record<string, any>;
};

/** Minimal response shape used by document route handlers. */
type DocumentResponseWriter = {
	/** Sets the HTTP response status. */
	status: (statusCode: number) => DocumentResponseWriter;
	/** Sends a JSON response body. */
	json: (body: any) => DocumentResponseWriter;
};

/** Database wrapper used by the document service. */
type DocumentsDb = {
	/** Lists document metadata for one account. */
	listDocuments: (scope: DocumentScope) => Promise<DocumentRecord[]>;
	/** Finds one document by scoped id. */
	findDocument: (scope: DocumentScope, id: string) => Promise<DocumentRecord | null>;
	/** Creates one document record. */
	createDocument: (document: DocumentRecord) => Promise<DocumentRecord>;
	/** Replaces one document content and metadata. */
	updateDocument: (scope: DocumentScope, id: string, patch: Partial<DocumentRecord>) => Promise<DocumentRecord | null>;
	/** Deletes one document. */
	deleteDocument: (scope: DocumentScope, id: string) => Promise<boolean>;
};

/** Service for server-side document persistence behavior. */
type DocumentService = {
	/** Subscribes to document persistence dependencies. */
	ready: () => void;
	/** Gets the documents database wrapper. */
	getDocumentsDb: () => DocumentsDb;
	/** Gets the stored JSON size for document content. */
	getContentSize: (content: any) => number;
	/** Lists documents owned by the authenticated account. */
	listDocuments: (request: DocumentRequest, response: DocumentResponseWriter) => Promise<DocumentResponseWriter>;
	/** Gets one document owned by the authenticated account. */
	getDocument: (request: DocumentRequest, response: DocumentResponseWriter) => Promise<DocumentResponseWriter>;
	/** Finds a document with the same display name in one scope. */
	findNameConflict: (scope: DocumentScope, name: string, excludeId?: string) => Promise<DocumentRecord | null>;
	/** Creates or saves one document. */
	saveDocument: (request: DocumentRequest, response: DocumentResponseWriter) => Promise<DocumentResponseWriter>;
	/** Saves an existing document as a new document. */
	saveDocumentAs: (request: DocumentRequest, response: DocumentResponseWriter) => Promise<DocumentResponseWriter>;
	/** Renames one document. */
	renameDocument: (request: DocumentRequest, response: DocumentResponseWriter) => Promise<DocumentResponseWriter>;
	/** Duplicates one document. */
	duplicateDocument: (request: DocumentRequest, response: DocumentResponseWriter) => Promise<DocumentResponseWriter>;
	/** Deletes one document. */
	deleteDocument: (request: DocumentRequest, response: DocumentResponseWriter) => Promise<DocumentResponseWriter>;
};
