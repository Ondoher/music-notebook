/// <reference path="./document-service.d.ts" />

import { randomUUID } from 'node:crypto';
import { Service } from '@polylith/core';
import DocumentsDb from './db/DocumentsDb.js';

/** Owns server-side document persistence behavior. */
export class DocumentService extends Service {
	constructor(registry) {
		super('document', registry);

		this.implement([
			'ready',
			'getDocumentsDb',
			'getContentSize',
			'listDocuments',
			'getDocument',
			'findNameConflict',
			'saveDocument',
			'saveDocumentAs',
			'renameDocument',
			'duplicateDocument',
			'deleteDocument',
		]);
		this.documentsDb = null;
	}

	/** Subscribes to document persistence dependencies. */
	ready() {
		/** @type {ConfigService} */
		this.config = this.registry.subscribe('config');
	}

	/**
	 * Gets the documents database wrapper.
	 *
	 * @returns {DocumentsDb} Returns the lazily created documents database wrapper.
	 */
	getDocumentsDb() {
		if (!this.documentsDb) {
			this.documentsDb = new DocumentsDb({
				uri: this.config.get('mongo.uri', 'mongodb://127.0.0.1:27017'),
				dbName: this.config.get('mongo.db', 'music_notebook_dev'),
				collectionName: this.config.get(
					'mongo.collections.documents',
					'documents',
				),
				connectTimeoutMS: this.config.get('mongo.connectTimeoutMS', 5000),
				serverSelectionTimeoutMS: this.config.get(
					'mongo.serverSelectionTimeoutMS',
					5000,
				),
			});
		}

		return this.documentsDb;
	}

	/**
	 * Gets the configured app namespace id.
	 *
	 * @returns {string} Returns the app id.
	 */
	getAppId() {
		return this.config.get('app.id', 'mn');
	}

	/**
	 * Reads the app namespace id from one request.
	 *
	 * @param {DocumentRequest} request - Supplies the request.
	 * @returns {string} Returns the app namespace id.
	 */
	readAppId(request) {
		const appId = request.get?.('x-music-notebook-app-id')
			|| request.headers?.['x-music-notebook-app-id']
			|| this.getAppId();

		return typeof appId === 'string' && appId.trim()
			? appId.trim()
			: this.getAppId();
	}

	/**
	 * Builds the ownership scope for one authenticated request.
	 *
	 * @param {DocumentRequest} request - Supplies the authenticated request.
	 * @returns {DocumentScope} Returns app/account scope.
	 */
	getScope(request) {
		return {
			appId: this.readAppId(request),
			accountId: request.account.id,
		};
	}

	/**
	 * Normalizes a user-facing document name.
	 *
	 * @param {unknown} name - Supplies the raw name.
	 * @returns {string} Returns the cleaned name.
	 */
	cleanName(name) {
		return typeof name === 'string' ? name.trim() : '';
	}

	/**
	 * Checks whether a request body value is acceptable document content.
	 *
	 * @param {unknown} content - Supplies the raw content value.
	 * @returns {boolean} Returns true when content can be stored as JSON.
	 */
	isUsableContent(content) {
		return content !== undefined && content !== null && typeof content === 'object';
	}

	/**
	 * Gets the stored JSON size for document content.
	 *
	 * @param {any} content - Supplies document content.
	 * @returns {number} Returns the UTF-8 byte length of the JSON content.
	 */
	getContentSize(content) {
		return Buffer.byteLength(JSON.stringify(content ?? null), 'utf8');
	}

	/**
	 * Formats document metadata for list responses.
	 *
	 * @param {DocumentRecord} document - Supplies a stored document.
	 * @returns {DocumentMetadataResponse} Returns client-safe metadata.
	 */
	formatMetadata(document) {
		return {
			id: document.id,
			appId: document.appId,
			name: document.name,
			size: document.size,
			createdAt: document.createdAt,
			modifiedAt: document.modifiedAt,
			lockedAt: document.lockedAt ?? null,
		};
	}

	/**
	 * Formats one document with content.
	 *
	 * @param {DocumentRecord} document - Supplies a stored document.
	 * @returns {DocumentResponse} Returns client-safe document data.
	 */
	formatDocument(document) {
		return {
			...this.formatMetadata(document),
			content: document.content,
		};
	}

	/**
	 * Sends a not-found response.
	 *
	 * @param {DocumentResponseWriter} response - Receives the response.
	 * @returns {DocumentResponseWriter} Returns the response.
	 */
	sendNotFound(response) {
		return response.status(404).json({
			success: false,
			reason: 'documents.not_found',
		});
	}

	/**
	 * Sends an invalid request response.
	 *
	 * @param {DocumentResponseWriter} response - Receives the response.
	 * @param {string} reason - Supplies the reason key.
	 * @returns {DocumentResponseWriter} Returns the response.
	 */
	sendInvalid(response, reason) {
		return response.status(400).json({
			success: false,
			reason,
		});
	}

	/**
	 * Sends a name-conflict response.
	 *
	 * @param {DocumentResponseWriter} response - Receives the response.
	 * @param {DocumentRecord} document - Supplies the conflicting document.
	 * @returns {DocumentResponseWriter} Returns the response.
	 */
	sendNameConflict(response, document) {
		return response.status(409).json({
			success: false,
			reason: 'documents.name_conflict',
			document: this.formatMetadata(document),
		});
	}

	/**
	 * Finds a document with the same display name in one scope.
	 *
	 * @param {DocumentScope} scope - Supplies app/account ownership.
	 * @param {string} name - Supplies the cleaned document name.
	 * @param {string} [excludeId] - Supplies a document id to ignore.
	 * @returns {Promise<DocumentRecord | null>} Returns a conflicting document or null.
	 */
	async findNameConflict(scope, name, excludeId = '') {
		const comparable = name.toLocaleLowerCase();
		const documents = await this.getDocumentsDb().listDocuments(scope);

		return documents.find((document) => (
			document.id !== excludeId
			&& this.cleanName(document.name).toLocaleLowerCase() === comparable
		)) || null;
	}

	/**
	 * Builds a new document record for storage.
	 *
	 * @param {DocumentScope} scope - Supplies app/account ownership.
	 * @param {string} name - Supplies the cleaned document name.
	 * @param {any} content - Supplies document content.
	 * @returns {DocumentRecord} Returns the document record.
	 */
	buildDocumentRecord(scope, name, content) {
		const now = Date.now();

		return {
			...scope,
			id: randomUUID(),
			name,
			content,
			size: this.getContentSize(content),
			createdAt: now,
			modifiedAt: now,
			lockedAt: null,
		};
	}

	/**
	 * Lists documents owned by the authenticated account.
	 *
	 * @param {DocumentRequest} request - Supplies the authenticated request.
	 * @param {DocumentResponseWriter} response - Receives the response.
	 * @returns {Promise<DocumentResponseWriter>} Returns the response.
	 */
	async listDocuments(request, response) {
		const documents = await this.getDocumentsDb().listDocuments(this.getScope(request));

		return response.json({
			success: true,
			documents: documents.map((document) => this.formatMetadata(document)),
		});
	}

	/**
	 * Gets one document owned by the authenticated account.
	 *
	 * @param {DocumentRequest} request - Supplies the authenticated request.
	 * @param {DocumentResponseWriter} response - Receives the response.
	 * @returns {Promise<DocumentResponseWriter>} Returns the response.
	 */
	async getDocument(request, response) {
		const document = await this.getDocumentsDb()
			.findDocument(this.getScope(request), request.params?.id);

		if (!document) {
			return this.sendNotFound(response);
		}

		return response.json({
			success: true,
			document: this.formatDocument(document),
		});
	}

	/**
	 * Creates or saves one document.
	 *
	 * @param {DocumentRequest} request - Supplies the authenticated request.
	 * @param {DocumentResponseWriter} response - Receives the response.
	 * @returns {Promise<DocumentResponseWriter>} Returns the response.
	 */
	async saveDocument(request, response) {
		const scope = this.getScope(request);
		const id = request.params?.id || '';
		const name = this.cleanName(request.body?.name);
		const content = request.body?.content;

		if (!this.isUsableContent(content)) {
			return this.sendInvalid(response, 'documents.invalid_content');
		}

		if (!id) {
			if (!name) {
				return this.sendInvalid(response, 'documents.invalid_name');
			}

			const conflict = await this.findNameConflict(scope, name);

			if (conflict && request.body?.allowNameConflict !== true) {
				return this.sendNameConflict(response, conflict);
			}

			const document = this.buildDocumentRecord(scope, name, content);
			await this.getDocumentsDb().createDocument(document);

			return response.status(201).json({
				success: true,
				document: this.formatDocument(document),
			});
		}

		const patch = {
			content,
			size: this.getContentSize(content),
			modifiedAt: Date.now(),
		};

		if (name) {
			patch.name = name;
		}

		const updated = await this.getDocumentsDb().updateDocument(scope, id, patch);

		if (!updated) {
			return this.sendNotFound(response);
		}

		return response.json({
			success: true,
			document: this.formatDocument(updated),
		});
	}

	/**
	 * Saves an existing document as a new document.
	 *
	 * @param {DocumentRequest} request - Supplies the authenticated request.
	 * @param {DocumentResponseWriter} response - Receives the response.
	 * @returns {Promise<DocumentResponseWriter>} Returns the response.
	 */
	async saveDocumentAs(request, response) {
		const scope = this.getScope(request);
		const source = await this.getDocumentsDb()
			.findDocument(scope, request.params?.id);

		if (!source) {
			return this.sendNotFound(response);
		}

		const name = this.cleanName(request.body?.name);
		const content = request.body?.content ?? source.content;

		if (!name) {
			return this.sendInvalid(response, 'documents.invalid_name');
		}

		if (!this.isUsableContent(content)) {
			return this.sendInvalid(response, 'documents.invalid_content');
		}

		const document = this.buildDocumentRecord(scope, name, content);
		await this.getDocumentsDb().createDocument(document);

		return response.status(201).json({
			success: true,
			document: this.formatDocument(document),
		});
	}

	/**
	 * Renames one document.
	 *
	 * @param {DocumentRequest} request - Supplies the authenticated request.
	 * @param {DocumentResponseWriter} response - Receives the response.
	 * @returns {Promise<DocumentResponseWriter>} Returns the response.
	 */
	async renameDocument(request, response) {
		const scope = this.getScope(request);
		const name = this.cleanName(request.body?.name);
		const id = request.params?.id || '';

		if (!name) {
			return this.sendInvalid(response, 'documents.invalid_name');
		}

		const conflict = await this.findNameConflict(scope, name, id);

		if (conflict && request.body?.allowNameConflict !== true) {
			return this.sendNameConflict(response, conflict);
		}

		const document = await this.getDocumentsDb().updateDocument(
			scope,
			id,
			{
				name,
				modifiedAt: Date.now(),
			},
		);

		if (!document) {
			return this.sendNotFound(response);
		}

		return response.json({
			success: true,
			document: this.formatMetadata(document),
		});
	}

	/**
	 * Duplicates one document.
	 *
	 * @param {DocumentRequest} request - Supplies the authenticated request.
	 * @param {DocumentResponseWriter} response - Receives the response.
	 * @returns {Promise<DocumentResponseWriter>} Returns the response.
	 */
	async duplicateDocument(request, response) {
		const scope = this.getScope(request);
		const source = await this.getDocumentsDb()
			.findDocument(scope, request.params?.id);

		if (!source) {
			return this.sendNotFound(response);
		}

		const name = this.cleanName(request.body?.name) || `${source.name} copy`;
		const document = this.buildDocumentRecord(scope, name, source.content);
		await this.getDocumentsDb().createDocument(document);

		return response.status(201).json({
			success: true,
			document: this.formatDocument(document),
		});
	}

	/**
	 * Deletes one document.
	 *
	 * @param {DocumentRequest} request - Supplies the authenticated request.
	 * @param {DocumentResponseWriter} response - Receives the response.
	 * @returns {Promise<DocumentResponseWriter>} Returns the response.
	 */
	async deleteDocument(request, response) {
		const deleted = await this.getDocumentsDb()
			.deleteDocument(this.getScope(request), request.params?.id);

		if (!deleted) {
			return this.sendNotFound(response);
		}

		return response.json({success: true});
	}
}

new DocumentService();
