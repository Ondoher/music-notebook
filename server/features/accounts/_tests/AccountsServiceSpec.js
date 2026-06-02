/* global describe it expect beforeEach */

import { Registry, Service } from "@polylith/core";
import AccountsService from "../accounts-service.js";

class ConfigMock extends Service {
	constructor(registry, values) {
		super("config", registry);

		this.values = values;
		this.implement(["get"]);
	}

	get(name, defaultValue) {
		return this.values[name] ?? defaultValue;
	}
}

class ResponseMock {
	constructor() {
		this.statusCode = 200;
		this.body = null;
		this.cookies = [];
		this.clearedCookies = [];
	}

	status(statusCode) {
		this.statusCode = statusCode;
		return this;
	}

	json(body) {
		this.body = body;
		return this;
	}

	cookie(name, value, options) {
		this.cookies.push({name, value, options});
		return this;
	}

	clearCookie(name, options) {
		this.clearedCookies.push({name, options});
		return this;
	}
}

describe("AccountsService", function() {
	let accounts;
	let registry;

	beforeEach(function() {
		registry = new Registry();
		new ConfigMock(registry, {
			"accounts.saltSeed": "test-seed",
		});

		accounts = new AccountsService(registry);
		accounts.ready();
	});

	it("normalizes usernames for account lookup", function() {
		expect(accounts.normalizeUsername("  Alice  ")).toBe("alice");
	});

	it("builds deterministic salts from normalized username and configured seed", function() {
		let first = accounts.buildSalt("alice");
		let second = accounts.buildSalt("alice");
		let different = accounts.buildSalt("bob");

		expect(first).toBe(second);
		expect(first).toMatch(/^[a-f0-9]{64}$/);
		expect(first).not.toBe(different);
	});

	it("returns salt without checking whether the account exists", function() {
		let response = new ResponseMock();

		accounts.getSalt({body: {username: " Alice "}}, response);

		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual({
			success: true,
			salt: accounts.buildSalt("alice"),
		});
	});

	it("builds first-version account records with Date.now timestamps", function() {
		spyOn(Date, "now").and.returnValue(123456789);

		let account = accounts.buildAccountRecord({
			username: "Alice",
			normalizedUsername: "alice",
			passwordHash: "hash",
			email: null,
		});

		expect(account).toEqual({
			id: jasmine.any(String),
			username: "Alice",
			normalizedUsername: "alice",
			version: 1,
			passwordHash: "hash",
			email: null,
			lastOpenDocumentId: null,
			createdAt: 123456789,
			updatedAt: 123456789,
		});
		expect(account.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
	});

	it("uses generic login failure responses", function() {
		let response = new ResponseMock();

		accounts.sendLoginFailed(response);

		expect(response.statusCode).toBe(401);
		expect(response.body).toEqual({
			success: false,
			reason: "login_failed",
		});
	});

	it("passes configured Mongo timeout options to the accounts DB wrapper", function() {
		registry = new Registry();
		new ConfigMock(registry, {
			"accounts.saltSeed": "test-seed",
			"mongo.connectTimeoutMS": 111,
			"mongo.serverSelectionTimeoutMS": 222,
		});

		accounts = new AccountsService(registry);
		accounts.ready();

		let accountsDb = accounts.getAccountsDb();

		expect(accountsDb.connectTimeoutMS).toBe(111);
		expect(accountsDb.serverSelectionTimeoutMS).toBe(222);
	});

	it("creates durable login sessions and stores only token hashes", async function() {
		spyOn(Date, "now").and.returnValue(1000);
		accounts.accountSessionsDb = {
			created: null,
			createSession(session) {
				this.created = session;
				return Promise.resolve("session-1");
			},
		};

		let token = await accounts.createSession("account-1");

		expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
		expect(accounts.accountSessionsDb.created).toEqual({
			tokenHash: accounts.hashToken(token),
			accountId: "account-1",
			createdAt: 1000,
			expiresAt: 1000 + (7 * 24 * 60 * 60 * 1000),
			revokedAt: null,
			lastUsedAt: 1000,
		});
		expect(accounts.accountSessionsDb.created.tokenHash).not.toBe(token);
	});

	it("restores authenticated sessions from durable session tokens", async function() {
		spyOn(Date, "now").and.returnValue(2000);
		let token = "token-1";
		let tokenHash = accounts.hashToken(token);

		accounts.accountSessionsDb = {
			findByTokenHash(hash) {
				expect(hash).toBe(tokenHash);
				return Promise.resolve({
					tokenHash,
					accountId: "account-1",
					createdAt: 1000,
					expiresAt: 3000,
					revokedAt: null,
					lastUsedAt: 1000,
				});
			},
			touched: null,
			touchSession(hash, lastUsedAt) {
				this.touched = {hash, lastUsedAt};
				return Promise.resolve();
			},
		};
		accounts.accountsDb = {
			findById(accountId) {
				expect(accountId).toBe("account-1");
				return Promise.resolve({
					id: "account-1",
					username: "Alice",
					email: null,
				});
			},
		};

		let authenticated = await accounts.getAuthenticatedSessionToken(token);

		expect(authenticated.account.username).toBe("Alice");
		expect(authenticated.tokenHash).toBe(tokenHash);
		expect(accounts.accountSessionsDb.touched).toEqual({
			hash: tokenHash,
			lastUsedAt: 2000,
		});
	});

	it("exchanges session cookies for short-lived bearer tokens", async function() {
		spyOn(Date, "now").and.returnValue(2000);
		let sessionToken = "session-1";
		let sessionTokenHash = accounts.hashToken(sessionToken);
		let response = new ResponseMock();

		accounts.accountSessionsDb = {
			findByTokenHash(hash) {
				expect(hash).toBe(sessionTokenHash);
				return Promise.resolve({
					tokenHash: sessionTokenHash,
					accountId: "account-1",
					createdAt: 1000,
					expiresAt: 3000,
					revokedAt: null,
					lastUsedAt: 1000,
				});
			},
			touchSession() {
				return Promise.resolve();
			},
		};
		accounts.accountsDb = {
			findById() {
				return Promise.resolve({
					id: "account-1",
					username: "Alice",
					email: null,
					lastOpenDocumentId: "doc-1",
				});
			},
		};

		await accounts.session({
			headers: {
				cookie: `mn_account_session=${encodeURIComponent(sessionToken)}`,
			},
		}, response);

		expect(response.statusCode).toBe(200);
		expect(response.body.success).toBeTrue();
		expect(response.body.token).toMatch(/^[A-Za-z0-9_-]+$/);
		expect(response.body.account.username).toBe("Alice");
		expect(response.body.account.lastOpenDocumentId).toBe("doc-1");
		expect(accounts.accessTokens.size).toBe(1);
	});

	it("updates the authenticated account last open document id", async function() {
		spyOn(Date, "now").and.returnValue(3000);
		let response = new ResponseMock();
		let bearerToken = "bearer-1";
		let bearerHash = accounts.hashToken(bearerToken);
		let sessionHash = "session-hash-1";
		accounts.accessTokens.set(bearerHash, {
			accountId: "account-1",
			sessionTokenHash: sessionHash,
			createdAt: 1000,
			expiresAt: 4000,
			lastUsedAt: 1000,
		});
		accounts.accountSessionsDb = {
			findByTokenHash(hash) {
				expect(hash).toBe(sessionHash);
				return Promise.resolve({
					tokenHash: sessionHash,
					accountId: "account-1",
					createdAt: 1000,
					expiresAt: 4000,
					revokedAt: null,
					lastUsedAt: 1000,
				});
			},
			touchSession() {
				return Promise.resolve();
			},
		};
		accounts.accountsDb = {
			findById() {
				return Promise.resolve({
					id: "account-1",
					username: "Alice",
					email: null,
					lastOpenDocumentId: null,
				});
			},
			updatePatch: null,
			updateAccount(accountId, patch) {
				this.updatePatch = {accountId, patch};
				return Promise.resolve({
					id: accountId,
					username: "Alice",
					email: null,
					lastOpenDocumentId: patch.lastOpenDocumentId,
				});
			},
		};

		await accounts.setLastOpenDocument({
			headers: {
				authorization: `Bearer ${bearerToken}`,
			},
			body: {
				documentId: "doc-1",
			},
		}, response);

		expect(accounts.accountsDb.updatePatch).toEqual({
			accountId: "account-1",
			patch: {
				lastOpenDocumentId: "doc-1",
				updatedAt: 3000,
			},
		});
		expect(response.body.account.lastOpenDocumentId).toBe("doc-1");
	});

	it("revokes authenticated sessions on logout", async function() {
		spyOn(Date, "now").and.returnValue(2500);
		let sessionToken = "session-1";
		let tokenHash = accounts.hashToken(sessionToken);
		let response = new ResponseMock();

		accounts.accountSessionsDb = {
			findByTokenHash() {
				return Promise.resolve({
					tokenHash,
					accountId: "account-1",
					createdAt: 1000,
					expiresAt: 3000,
					revokedAt: null,
					lastUsedAt: 1000,
				});
			},
			touchSession() {
				return Promise.resolve();
			},
			revoked: null,
			revokeByTokenHash(hash, revokedAt) {
				this.revoked = {hash, revokedAt};
				return Promise.resolve(true);
			},
		};
		accounts.accountsDb = {
			findById() {
				return Promise.resolve({
					id: "account-1",
					username: "Alice",
					email: null,
				});
			},
		};

		await accounts.logout({
			headers: {
				cookie: `mn_account_session=${encodeURIComponent(sessionToken)}`,
			},
		}, response);

		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual({success: true});
		expect(accounts.accountSessionsDb.revoked).toEqual({
			hash: tokenHash,
			revokedAt: 2500,
		});
		expect(response.clearedCookies[0].name).toBe("mn_account_session");
	});
});
