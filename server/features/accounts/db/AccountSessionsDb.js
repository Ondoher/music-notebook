import { MongoClient } from "mongodb";

/** Persists durable account login sessions in Mongo. */
export default class AccountSessionsDb {
	/**
	 * @param {AccountSessionsDbOptions} options - Supplies Mongo connection settings.
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

		/** @type {import("mongodb").Collection<AccountSessionRecord> | null} */
		this.collection = null;

		this.indexesReady = false;
	}

	/**
	 * Opens the Mongo connection and prepares the sessions collection.
	 *
	 * @returns {Promise<void>}
	 */
	async open() {
		if (this.collection) {
			return;
		}

		if (!this.uri || !this.dbName || !this.collectionName) {
			throw new Error("AccountSessionsDb requires uri, dbName, and collectionName");
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

	/**
	 * Ensures account session collection indexes exist.
	 *
	 * @returns {Promise<void>}
	 */
	async ensureIndexes() {
		if (this.indexesReady) {
			return;
		}

		await this.collection.createIndex(
			{tokenHash: 1},
			{unique: true}
		);
		await this.collection.createIndex({accountId: 1});
		await this.collection.createIndex({expiresAt: 1});

		this.indexesReady = true;
	}

	/**
	 * Gets the opened sessions collection.
	 *
	 * @returns {Promise<import("mongodb").Collection<AccountSessionRecord>>}
	 */
	async getCollection() {
		await this.open();
		return this.collection;
	}

	/**
	 * Creates one account session record.
	 *
	 * @param {AccountSessionRecord} session - Carries the session record.
	 * @returns {Promise<import("mongodb").ObjectId>} Returns the Mongo insert id.
	 */
	async createSession(session) {
		let collection = await this.getCollection();
		let result = await collection.insertOne(session);
		return result.insertedId;
	}

	/**
	 * Finds one session by token hash.
	 *
	 * @param {string} tokenHash - Identifies the hashed token.
	 * @returns {Promise<AccountSessionRecord | null>}
	 */
	async findByTokenHash(tokenHash) {
		let collection = await this.getCollection();
		return collection.findOne({tokenHash});
	}

	/**
	 * Revokes one session by token hash.
	 *
	 * @param {string} tokenHash - Identifies the hashed token.
	 * @param {number} revokedAt - Supplies the revocation time.
	 * @returns {Promise<boolean>}
	 */
	async revokeByTokenHash(tokenHash, revokedAt) {
		let collection = await this.getCollection();
		let result = await collection.updateOne(
			{tokenHash},
			{$set: {revokedAt}}
		);

		return result.modifiedCount > 0;
	}

	/**
	 * Updates the last-used time for one session.
	 *
	 * @param {string} tokenHash - Identifies the hashed token.
	 * @param {number} lastUsedAt - Supplies the last-used time.
	 * @returns {Promise<void>}
	 */
	async touchSession(tokenHash, lastUsedAt) {
		let collection = await this.getCollection();
		await collection.updateOne(
			{tokenHash},
			{$set: {lastUsedAt}}
		);
	}
}
