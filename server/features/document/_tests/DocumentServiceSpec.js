/* global describe it expect beforeEach */

import { Registry, Service } from '@polylith/core';

import { DocumentService } from '../document-service.js';

class ConfigMock extends Service {
	constructor(registry, values = {}) {
		super('config', registry);
		this.values = values;
		this.implement(['get']);
	}

	get(name, defaultValue) {
		return this.values[name] ?? defaultValue;
	}
}

class DocumentsDbMock {
	constructor() {
		this.documents = [];
		this.deleted = [];
		this.updates = [];
	}

	listDocuments(scope) {
		return Promise.resolve(this.documents
			.filter((document) => (
				document.appId === scope.appId
				&& document.accountId === scope.accountId
			))
			.map((document) => {
				const {content, ...metadata} = document;
				return metadata;
			}));
	}

	findDocument(scope, id) {
		return Promise.resolve(this.documents.find((document) => (
			document.appId === scope.appId
			&& document.accountId === scope.accountId
			&& document.id === id
		)) || null);
	}

	createDocument(document) {
		this.documents.push(document);
		return Promise.resolve(document);
	}

	updateDocument(scope, id, patch) {
		this.updates.push({scope, id, patch});
		const document = this.documents.find((candidate) => (
			candidate.appId === scope.appId
			&& candidate.accountId === scope.accountId
			&& candidate.id === id
		));

		if (!document) {
			return Promise.resolve(null);
		}

		Object.assign(document, patch);
		return Promise.resolve(document);
	}

	deleteDocument(scope, id) {
		this.deleted.push({scope, id});
		const index = this.documents.findIndex((document) => (
			document.appId === scope.appId
			&& document.accountId === scope.accountId
			&& document.id === id
		));

		if (index < 0) {
			return Promise.resolve(false);
		}

		this.documents.splice(index, 1);
		return Promise.resolve(true);
	}
}

class ResponseMock {
	constructor() {
		this.statusCode = 200;
		this.body = null;
	}

	status(statusCode) {
		this.statusCode = statusCode;
		return this;
	}

	json(body) {
		this.body = body;
		return this;
	}
}

function makeRequest(body = {}, params = {}, appId = 'mn-test') {
	return {
		account: {
			id: 'account-1',
			username: 'Alice',
		},
		body,
		get(header) {
			return header === 'x-music-notebook-app-id' ? appId : '';
		},
		params,
	};
}

function contentSize(content) {
	return Buffer.byteLength(JSON.stringify(content), 'utf8');
}

describe('DocumentService', function() {
	let documents;
	let documentsDb;
	let registry;

	beforeEach(function() {
		registry = new Registry();
		new ConfigMock(registry, {
			'app.id': 'mn-test',
		});
		documents = new DocumentService(registry);
		documents.ready();
		documentsDb = new DocumentsDbMock();
		documents.documentsDb = documentsDb;
	});

	it('creates documents with app, account, uuid, and epoch metadata', async function() {
		spyOn(Date, 'now').and.returnValue(1000);
		const response = new ResponseMock();

		await documents.saveDocument(makeRequest({
			name: 'Lesson 1',
			content: {ops: []},
		}), response);

		expect(response.statusCode).toBe(201);
		expect(response.body.success).toBeTrue();
		expect(response.body.document).toEqual(jasmine.objectContaining({
			appId: 'mn-test',
			name: 'Lesson 1',
			content: {ops: []},
			size: contentSize({ops: []}),
			createdAt: 1000,
			modifiedAt: 1000,
			lockedAt: null,
		}));
		expect(response.body.document.id).toMatch(/^[0-9a-f-]{36}$/);
		expect(documentsDb.documents[0].accountId).toBe('account-1');
	});

	it('returns a name conflict when creating a document with an existing name', async function() {
		documentsDb.documents.push({
			id: 'doc-1',
			appId: 'mn-test',
			accountId: 'account-1',
			name: 'Lesson 1',
			content: {ops: []},
			size: contentSize({ops: []}),
			createdAt: 1000,
			modifiedAt: 2000,
			lockedAt: null,
		});
		const response = new ResponseMock();

		await documents.saveDocument(makeRequest({
			name: 'lesson 1',
			content: {ops: [{insert: 'new'}]},
		}), response);

		expect(response.statusCode).toBe(409);
		expect(response.body).toEqual({
			success: false,
			reason: 'documents.name_conflict',
			document: {
				id: 'doc-1',
				appId: 'mn-test',
				name: 'Lesson 1',
				size: contentSize({ops: []}),
				createdAt: 1000,
				modifiedAt: 2000,
				lockedAt: null,
			},
		});
	});

	it('allows confirmed name conflicts when creating a document', async function() {
		documentsDb.documents.push({
			id: 'doc-1',
			appId: 'mn-test',
			accountId: 'account-1',
			name: 'Lesson 1',
			content: {ops: []},
			size: contentSize({ops: []}),
			createdAt: 1000,
			modifiedAt: 2000,
			lockedAt: null,
		});
		const response = new ResponseMock();

		await documents.saveDocument(makeRequest({
			allowNameConflict: true,
			name: 'Lesson 1',
			content: {ops: [{insert: 'new'}]},
		}), response);

		expect(response.statusCode).toBe(201);
		expect(response.body.document).toEqual(jasmine.objectContaining({
			name: 'Lesson 1',
			content: {ops: [{insert: 'new'}]},
		}));
	});

	it('falls back to configured app id when no app header is supplied', async function() {
		const request = makeRequest({
			name: 'Lesson 1',
			content: {ops: []},
		});
		const response = new ResponseMock();

		delete request.get;

		await documents.saveDocument(request, response);

		expect(response.body.document.appId).toBe('mn-test');
	});

	it('uses the app id request header for document scope', async function() {
		const response = new ResponseMock();

		await documents.saveDocument(makeRequest({
			name: 'Lesson 1',
			content: {ops: []},
		}, {}, 'mn-client'), response);

		expect(response.body.document.appId).toBe('mn-client');
	});

	it('lists metadata without document content', async function() {
		documentsDb.documents.push({
			id: 'doc-1',
			appId: 'mn-test',
			accountId: 'account-1',
			name: 'Lesson 1',
			content: {ops: []},
			size: contentSize({ops: []}),
			createdAt: 1000,
			modifiedAt: 2000,
			lockedAt: null,
		});
		const response = new ResponseMock();

		await documents.listDocuments(makeRequest(), response);

		expect(response.body).toEqual({
			success: true,
			documents: [{
				id: 'doc-1',
				appId: 'mn-test',
				name: 'Lesson 1',
				size: contentSize({ops: []}),
				createdAt: 1000,
				modifiedAt: 2000,
				lockedAt: null,
			}],
		});
	});

	it('gets one document with content', async function() {
		documentsDb.documents.push({
			id: 'doc-1',
			appId: 'mn-test',
			accountId: 'account-1',
			name: 'Lesson 1',
			content: {ops: []},
			size: contentSize({ops: []}),
			createdAt: 1000,
			modifiedAt: 2000,
			lockedAt: null,
		});
		const response = new ResponseMock();

		await documents.getDocument(makeRequest({}, {id: 'doc-1'}), response);

		expect(response.body.document).toEqual(jasmine.objectContaining({
			id: 'doc-1',
			content: {ops: []},
			size: contentSize({ops: []}),
		}));
	});

	it('saves existing document content and optional name', async function() {
		spyOn(Date, 'now').and.returnValue(3000);
		documentsDb.documents.push({
			id: 'doc-1',
			appId: 'mn-test',
			accountId: 'account-1',
			name: 'Lesson 1',
			content: {ops: []},
			size: contentSize({ops: []}),
			createdAt: 1000,
			modifiedAt: 2000,
			lockedAt: null,
		});
		const response = new ResponseMock();

		await documents.saveDocument(makeRequest({
			name: 'Lesson 1 revised',
			content: {ops: [{insert: 'hi'}]},
		}, {id: 'doc-1'}), response);

		expect(response.body.document).toEqual(jasmine.objectContaining({
			name: 'Lesson 1 revised',
			content: {ops: [{insert: 'hi'}]},
			size: contentSize({ops: [{insert: 'hi'}]}),
			modifiedAt: 3000,
		}));
		expect(documentsDb.updates[0].patch.size).toBe(contentSize({ops: [{insert: 'hi'}]}));
	});

	it('saves an existing document as a new document', async function() {
		spyOn(Date, 'now').and.returnValue(4000);
		documentsDb.documents.push({
			id: 'doc-1',
			appId: 'mn-test',
			accountId: 'account-1',
			name: 'Lesson 1',
			content: {ops: []},
			size: contentSize({ops: []}),
			createdAt: 1000,
			modifiedAt: 2000,
			lockedAt: null,
		});
		const response = new ResponseMock();

		await documents.saveDocumentAs(makeRequest({
			name: 'Lesson 2',
			content: {ops: [{insert: 'new'}]},
		}, {id: 'doc-1'}), response);

		expect(response.statusCode).toBe(201);
		expect(response.body.document).toEqual(jasmine.objectContaining({
			name: 'Lesson 2',
			content: {ops: [{insert: 'new'}]},
			size: contentSize({ops: [{insert: 'new'}]}),
			createdAt: 4000,
			modifiedAt: 4000,
		}));
		expect(response.body.document.id).not.toBe('doc-1');
	});

	it('renames documents without returning content', async function() {
		spyOn(Date, 'now').and.returnValue(5000);
		documentsDb.documents.push({
			id: 'doc-1',
			appId: 'mn-test',
			accountId: 'account-1',
			name: 'Lesson 1',
			content: {ops: []},
			size: contentSize({ops: []}),
			createdAt: 1000,
			modifiedAt: 2000,
			lockedAt: null,
		});
		const response = new ResponseMock();

		await documents.renameDocument(makeRequest({name: 'Renamed'}, {id: 'doc-1'}), response);

		expect(response.body.document).toEqual({
			id: 'doc-1',
			appId: 'mn-test',
			name: 'Renamed',
			size: contentSize({ops: []}),
			createdAt: 1000,
			modifiedAt: 5000,
			lockedAt: null,
		});
	});

	it('returns a name conflict when renaming to another document name', async function() {
		documentsDb.documents.push({
			id: 'doc-1',
			appId: 'mn-test',
			accountId: 'account-1',
			name: 'Lesson 1',
			content: {ops: []},
			size: contentSize({ops: []}),
			createdAt: 1000,
			modifiedAt: 2000,
			lockedAt: null,
		}, {
			id: 'doc-2',
			appId: 'mn-test',
			accountId: 'account-1',
			name: 'Lesson 2',
			content: {ops: [{insert: 'two'}]},
			size: contentSize({ops: [{insert: 'two'}]}),
			createdAt: 1100,
			modifiedAt: 2100,
			lockedAt: null,
		});
		const response = new ResponseMock();

		await documents.renameDocument(makeRequest({name: 'lesson 2'}, {id: 'doc-1'}), response);

		expect(response.statusCode).toBe(409);
		expect(response.body).toEqual({
			success: false,
			reason: 'documents.name_conflict',
			document: {
				id: 'doc-2',
				appId: 'mn-test',
				name: 'Lesson 2',
				size: contentSize({ops: [{insert: 'two'}]}),
				createdAt: 1100,
				modifiedAt: 2100,
				lockedAt: null,
			},
		});
	});

	it('allows confirmed name conflicts when renaming', async function() {
		spyOn(Date, 'now').and.returnValue(6000);
		documentsDb.documents.push({
			id: 'doc-1',
			appId: 'mn-test',
			accountId: 'account-1',
			name: 'Lesson 1',
			content: {ops: []},
			size: contentSize({ops: []}),
			createdAt: 1000,
			modifiedAt: 2000,
			lockedAt: null,
		}, {
			id: 'doc-2',
			appId: 'mn-test',
			accountId: 'account-1',
			name: 'Lesson 2',
			content: {ops: [{insert: 'two'}]},
			size: contentSize({ops: [{insert: 'two'}]}),
			createdAt: 1100,
			modifiedAt: 2100,
			lockedAt: null,
		});
		const response = new ResponseMock();

		await documents.renameDocument(makeRequest({
			allowNameConflict: true,
			name: 'Lesson 2',
		}, {id: 'doc-1'}), response);

		expect(response.body.document).toEqual(jasmine.objectContaining({
			id: 'doc-1',
			name: 'Lesson 2',
			modifiedAt: 6000,
		}));
	});

	it('duplicates documents with a generated copy name by default', async function() {
		documentsDb.documents.push({
			id: 'doc-1',
			appId: 'mn-test',
			accountId: 'account-1',
			name: 'Lesson 1',
			content: {ops: []},
			size: contentSize({ops: []}),
			createdAt: 1000,
			modifiedAt: 2000,
			lockedAt: null,
		});
		const response = new ResponseMock();

		await documents.duplicateDocument(makeRequest({}, {id: 'doc-1'}), response);

		expect(response.statusCode).toBe(201);
		expect(response.body.document).toEqual(jasmine.objectContaining({
			name: 'Lesson 1 copy',
			content: {ops: []},
			size: contentSize({ops: []}),
		}));
	});

	it('deletes documents in the authenticated scope', async function() {
		documentsDb.documents.push({
			id: 'doc-1',
			appId: 'mn-test',
			accountId: 'account-1',
			name: 'Lesson 1',
			content: {ops: []},
			size: contentSize({ops: []}),
			createdAt: 1000,
			modifiedAt: 2000,
			lockedAt: null,
		});
		const response = new ResponseMock();

		await documents.deleteDocument(makeRequest({}, {id: 'doc-1'}), response);

		expect(response.body).toEqual({success: true});
		expect(documentsDb.documents.length).toBe(0);
	});

	it('returns not found for missing scoped documents', async function() {
		const response = new ResponseMock();

		await documents.getDocument(makeRequest({}, {id: 'missing'}), response);

		expect(response.statusCode).toBe(404);
		expect(response.body).toEqual({
			success: false,
			reason: 'documents.not_found',
		});
	});
});
