import React from 'react';
import { act } from 'react';

import Markdown from '../Markdown.jsx';
import { createTestHarness } from '../../testing/TestHarness.js';

function makeLocalizeMock() {
	return {
		getLocale() {
			return 'en-US-u-ms-ussystem';
		},
		listen() {},
		translateMarkdown(name, replacements = {}) {
			return Promise.resolve(`# ${name}\n\nHello **${replacements.name || 'friend'}**.`);
		},
		unlisten() {},
	};
}

describe('Markdown', function() {
	let harness;

	afterEach(function() {
		harness?.unmount();
		harness = null;
	});

	it('renders localized markdown from the localization service', async function() {
		const localize = makeLocalizeMock();

		harness = createTestHarness()
			.withService('localize', localize)
			.withContext({localize});

		await act(async function() {
			harness.render(Markdown, {
				name: 'accounts-login',
				replacements: {
					name: 'Alice',
				},
			});
		});

		expect(harness.container.querySelector('h1').textContent).toBe('accounts-login');
		expect(harness.container.querySelector('strong').textContent).toBe('Alice');
	});
});
