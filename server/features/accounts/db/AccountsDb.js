import { MongoClient } from "mongodb";

/**
 * Persists account records in Mongo.
 */
export default class AccountsDb {
	/**
	 * @param {AccountsDbOptions} options - Supplies Mongo connection settings.
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

		/** @type {import("mongodb").Collection<AccountRecord> | null} */
		this.collection = null;

		this.indexesReady = false;
	}

	/**
	 * Opens the Mongo connection and prepares the accounts collection.
	 *
	 * @returns {Promise<void>}
	 */
	async open() {
		if (this.collection) {
			return;
		}

		if (!this.uri || !this.dbName || !this.collectionName) {
			throw new Error("AccountsDb requires uri, dbName, and collectionName");
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
	 * Ensures account collection indexes exist.
	 *
	 * @returns {Promise<void>}
	 */
	async ensureIndexes() {
		if (this.indexesReady) {
			return;
		}

		await this.collection.createIndex(
			{normalizedUsername: 1},
			{unique: true}
		);
		await this.collection.createIndex(
			{id: 1},
			{unique: true}
		);

		this.indexesReady = true;
	}

	/**
	 * Gets the opened accounts collection.
	 *
	 * @returns {Promise<import("mongodb").Collection<AccountRecord>>}
	 */
	async getCollection() {
		await this.open();
		return this.collection;
	}

	/**
	 * Creates one account record.
	 *
	 * @param {AccountRecord} account - Carries the account record to insert.
	 * @returns {Promise<string>}
	 */
	async createAccount(account) {
		let collection = await this.getCollection();
		await collection.insertOne(account);
		return account.id;
	}

	/**
	 * Finds one account by normalized username.
	 *
	 * @param {string} normalizedUsername - Identifies the normalized username.
	 * @returns {Promise<AccountRecord | null>}
	 */
	async findByNormalizedUsername(normalizedUsername) {
		let collection = await this.getCollection();
		return collection.findOne({normalizedUsername});
	}

	/**
	 * Finds one account by id.
	 *
	 * @param {string} accountId - Identifies the account.
	 * @returns {Promise<AccountRecord | null>}
	 */
	async findById(accountId) {
		let collection = await this.getCollection();
		return collection.findOne({id: accountId});
	}

	/**
	 * Updates one account by id.
	 *
	 * @param {string} accountId - Identifies the account.
	 * @param {Partial<AccountRecord>} patch - Supplies persisted account fields.
	 * @returns {Promise<AccountRecord | null>}
	 */
	async updateAccount(accountId, patch) {
		let collection = await this.getCollection();
		return collection.findOneAndUpdate(
			{id: accountId},
			{$set: patch},
			{returnDocument: "after"},
		);
	}
}
