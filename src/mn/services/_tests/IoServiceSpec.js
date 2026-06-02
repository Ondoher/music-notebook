/* global describe it expect beforeEach afterEach spyOn */

import { Registry, Service } from '@polylith/core';
import IoService from '../io.js';

class LocalizeMock extends Service {
	constructor(registry) {
		super('localize', registry);
		this.implement(['getLanguage']);
	}

	getLanguage() {
		return 'en-US';
	}
}

describe('IoService', function() {
	let io;
	let registry;
	let originalFetch;

	beforeEach(function() {
		originalFetch = globalThis.fetch;
		registry = new Registry();
		new LocalizeMock(registry);
		io = new IoService(registry);
		io.ready();
	});

	afterEach(function() {
		globalThis.fetch = originalFetch;
	});

	it('adds standard JSON and language headers', function() {
		let headers = io.addStandardHeaders();

		expect(headers.Accept).toBe('application/json');
		expect(headers['Content-Type']).toBe('application/json');
		expect(headers['Accept-Language']).toBe('en-US');
		expect(headers['X-Music-Notebook-App-Id']).toBe('mn');
	});

	it('can override the app id header', function() {
		io.setAppId('mn-test');

		let headers = io.addStandardHeaders();

		expect(headers['X-Music-Notebook-App-Id']).toBe('mn-test');
	});

	it('adds bearer authorization when a token is available', function() {
		io.setBearerToken('token-1');

		let headers = io.addStandardHeaders();

		expect(headers.Authorization).toBe('Bearer token-1');
	});

	it('can skip bearer authorization per request', function() {
		io.setBearerToken('token-1');

		let headers = io.addStandardHeaders({}, {auth: false});

		expect(headers.Authorization).toBeUndefined();
	});

	it('sends JSON post requests through fetch', async function() {
		let response = new Response(JSON.stringify({ok: true}), {
			status: 200,
			headers: {'Content-Type': 'application/json'},
		});
		globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo(response);

		let result = await io.post('/api/accounts/salt', {username: 'Alice'}, {auth: false});

		expect(globalThis.fetch).toHaveBeenCalledWith('/api/accounts/salt', jasmine.objectContaining({
			method: 'POST',
			body: JSON.stringify({username: 'Alice'}),
		}));
		expect(result).toEqual(jasmine.objectContaining({
			success: true,
			status: 200,
			data: {ok: true},
		}));
	});

	it('refreshes expired bearer tokens and retries authenticated requests once', async function() {
		io.setBearerToken('token-1');
		io.setAuthRefreshHandler(async () => {
			io.setBearerToken('token-2');
			return true;
		});
		globalThis.fetch = jasmine.createSpy('fetch').and.returnValues(
			Promise.resolve(new Response(JSON.stringify({success: false}), {
				status: 401,
				headers: {'Content-Type': 'application/json'},
			})),
			Promise.resolve(new Response(JSON.stringify({ok: true}), {
				status: 200,
				headers: {'Content-Type': 'application/json'},
			})),
		);

		let result = await io.get('/api/documents');

		expect(result.success).toBeTrue();
		expect(result.data).toEqual({ok: true});
		expect(globalThis.fetch.calls.count()).toBe(2);
		expect(globalThis.fetch.calls.argsFor(0)[1].headers.Authorization)
			.toBe('Bearer token-1');
		expect(globalThis.fetch.calls.argsFor(1)[1].headers.Authorization)
			.toBe('Bearer token-2');
	});

	it('does not refresh requests that explicitly skip auth refresh', async function() {
		let refreshed = false;
		io.setAuthRefreshHandler(async () => {
			refreshed = true;
			return true;
		});
		globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo(
			new Response(JSON.stringify({success: false}), {
				status: 401,
				headers: {'Content-Type': 'application/json'},
			})
		);

		let result = await io.get('/api/accounts/session', {
			auth: false,
			skipAuthRefresh: true,
		});

		expect(result.success).toBeFalse();
		expect(refreshed).toBeFalse();
		expect(globalThis.fetch.calls.count()).toBe(1);
	});
});
