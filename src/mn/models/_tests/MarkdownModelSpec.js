/* global describe it expect beforeEach */

import { Registry, Service } from '@polylith/core';
import MarkdownModelService from '../markdown-model.js';

class IoMock extends Service {
	constructor(registry) {
		super('io', registry);
		this.implement(['get']);
		this.requests = [];
		this.responses = [];
	}

	get(url, options) {
		this.requests.push({url, options});
		return Promise.resolve(this.responses.shift() || {success: false});
	}
}

describe('MarkdownModelService', function() {
	let io;
	let markdown;

	beforeEach(function() {
		const registry = new Registry();
		io = new IoMock(registry);
		markdown = new MarkdownModelService(registry);
		markdown.ready();
	});

	it('loads localized markdown through the unauthenticated markdown API', async function() {
		io.responses.push({
			success: true,
			data: {
				success: true,
				data: '# Login',
			},
		});

		const result = await markdown.get('accounts login');

		expect(result).toBe('# Login');
		expect(io.requests[0]).toEqual({
			url: 'api/markdown?name=accounts%20login',
			options: {auth: false},
		});
	});

	it('returns an empty string when markdown loading fails', async function() {
		io.responses.push({
			success: false,
			data: {
				success: false,
				reason: 'markdown.error.file_not_found',
			},
		});

		expect(await markdown.get('missing')).toBe('');
	});
});
