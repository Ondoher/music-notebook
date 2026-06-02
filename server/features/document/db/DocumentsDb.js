import { MongoClient } from 'mongodb';

/** Persists notebook document records in Mongo. */
export default class DocumentsDb {
	/**
	 * @param {DocumentsDbOptions} options - Supplies Mongo connection settings.
	 */
	constructor({
		uri,
		dbName,
		collectionName,
		connectTimeoutMS = 5000,
		serverSelectionTimeoutMS = 5000,
	}) {
		/** @type {string} */
		this.uri = uri;

		/** @type {string} */
		this.dbName = dbName;

		/** @type {string} */
		this.collectionName = collectionName;

		/** @type {number} */
		this.connectTimeoutMS = connectTimeoutMS;

		/** @type {number} */
		this.serverSelectionTimeoutMS = serverSelectionTimeoutMS;

		/** @type {MongoClient | null} */
		this.client = null;

		/** @type {import("mongodb").Collection<DocumentRecord> | null} */
		this.collection = null;

		this.indexesReady = false;
	}

	/** Opens the Mongo connection and prepares the documents collection. */
	async open() {
		if (this.collection) {
			return;
		}

		if (!this.uri || !this.dbName || !this.collectionName) {
			throw new Error('DocumentsDb requires uri, dbName, and collectionName');
		}

		this.client = new MongoClient(this.uri, {
			connectTimeoutMS: this.connectTimeoutMS,
			serverSelectionTimeoutMS: this.serverSelectionTimeoutMS,
		});
		await this.client.connect();
		this.collection = this.client
			.db(this.dbName)
			.collection(this.collectionName);

		await this.ensureIndexes();
	}

	/** Ensures document collection indexes exist. */
	async ensureIndexes() {
		if (this.indexesReady) {
			return;
		}

		await this.collection.createIndex(
			{appId: 1, accountId: 1, id: 1},
			{unique: true},
		);
		await this.collection.createIndex({appId: 1, accountId: 1, modifiedAt: -1});
		await this.collection.createIndex({appId: 1, accountId: 1, name: 1});

		this.indexesReady = true;
	}

	/**
	 * Gets the opened documents collection.
	 *
	 * @returns {Promise<import("mongodb").Collection<DocumentRecord>>}
	 */
	async getCollection() {
		await this.open();
		return this.collection;
	}

	/**
	 * Lists document metadata for one account.
	 *
	 * @param {DocumentScope} scope - Supplies app/account ownership.
	 * @returns {Promise<DocumentRecord[]>} Returns matching document records.
	 */
	async listDocuments(scope) {
		let collection = await this.getCollection();
		return collection
			.find(scope, {projection: {content: 0}})
			.sort({modifiedAt: -1, name: 1})
			.toArray();
	}

	/**
	 * Finds one document by scoped id.
	 *
	 * @param {DocumentScope} scope - Supplies app/account ownership.
	 * @param {string} id - Identifies the document.
	 * @returns {Promise<DocumentRecord | null>} Returns the document or null.
	 */
	async findDocument(scope, id) {
		let collection = await this.getCollection();
		return collection.findOne({...scope, id});
	}

	/**
	 * Creates one document record.
	 *
	 * @param {DocumentRecord} document - Supplies the document record.
	 * @returns {Promise<DocumentRecord>} Returns the inserted document.
	 */
	async createDocument(document) {
		let collection = await this.getCollection();
		await collection.insertOne(document);
		return document;
	}

	/**
	 * Replaces one document content and metadata.
	 *
	 * @param {DocumentScope} scope - Supplies app/account ownership.
	 * @param {string} id - Identifies the document.
	 * @param {Partial<DocumentRecord>} patch - Supplies persisted field changes.
	 * @returns {Promise<DocumentRecord | null>} Returns the updated document or null.
	 */
	async updateDocument(scope, id, patch) {
		let collection = await this.getCollection();
		let result = await collection.findOneAndUpdate(
			{...scope, id},
			{$set: patch},
			{returnDocument: 'after'},
		);

		return result;
	}

	/**
	 * Deletes one document.
	 *
	 * @param {DocumentScope} scope - Supplies app/account ownership.
	 * @param {string} id - Identifies the document.
	 * @returns {Promise<boolean>} Returns true when a document was deleted.
	 */
	async deleteDocument(scope, id) {
		let collection = await this.getCollection();
		let result = await collection.deleteOne({...scope, id});
		return result.deletedCount > 0;
	}
}
