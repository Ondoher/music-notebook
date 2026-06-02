/* global describe it expect */

import { Registry, Service } from '@polylith/core';

import { MarkdownRouter } from '../markdown-router.js';

class MarkdownMock extends Service {
	constructor(registry) {
		super('markdown', registry);
		this.implement(['getMarkdown']);
		this.calls = [];
		this.result = {
			success: true,
			data: '# Help',
		};
	}

	getMarkdown(name, language) {
		this.calls.push({name, language});
		return Promise.resolve(this.result);
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

describe('MarkdownRouter', function() {
	it('binds the markdown route to the markdown service', function() {
		const markdownRouter = new MarkdownRouter(new Registry());
		const routes = [];
		const router = {
			get(path, handler) {
				routes.push({path, handler});
			},
		};

		markdownRouter.routes(null, router, null);

		expect(routes.map((route) => route.path)).toEqual(['/api/markdown']);
	});

	it('returns markdown loaded by the markdown service', async function() {
		const registry = new Registry();
		const markdown = new MarkdownMock(registry);
		const markdownRouter = new MarkdownRouter(registry);
		const response = new ResponseMock();

		markdownRouter.markdown = markdown;
		await markdownRouter.getMarkdown({
			query: {name: 'accounts-login'},
			get(header) {
				return header === 'accept-language' ? 'en-US' : '';
			},
		}, response);

		expect(markdown.calls[0]).toEqual({
			name: 'accounts-login',
			language: 'en-US',
		});
		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual({
			success: true,
			data: '# Help',
		});
	});
});
