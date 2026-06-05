import React from 'react';
import { act } from 'react';

import Markdown from '../Markdown.jsx';
import { createTestHarness } from '../../testing/TestHarness.js';

function makeLocalizeMock() {
	let locale = 'en-US-u-ms-ussystem';

	return {
		setLocale(nextLocale) {
			locale = nextLocale;
		},
		getLocale() {
			return locale;
		},
		translateMarkdown(name, replacements = {}) {
			return Promise.resolve(`# ${name}\n\n${locale}: Hello **${replacements.name || 'friend'}**.`);
		},
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

	it('reloads markdown when the context locale changes', async function() {
		const localize = makeLocalizeMock();

		harness = createTestHarness()
			.withService('localize', localize)
			.withContext({
				localize,
				locale: 'en-US-u-ms-ussystem',
			});

		await act(async function() {
			harness.render(Markdown, {
				name: 'accounts-login',
			});
		});

		expect(harness.container.textContent).toContain('en-US-u-ms-ussystem: Hello friend.');

		localize.setLocale('es-ES');
		harness.withContext({
			localize,
			locale: 'es-ES',
		});

		await act(async function() {
			harness.render(Markdown, {
				name: 'accounts-login',
			});
		});

		expect(harness.container.textContent).toContain('es-ES: Hello friend.');
	});
});
