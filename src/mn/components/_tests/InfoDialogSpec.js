import React from 'react';
import { act } from 'react';

import InfoDialog from '../InfoDialog.jsx';
import { createTestHarness } from '../../testing/TestHarness.js';

function makeLocalizeMock() {
	return {
		getLocale() {
			return 'en-US-u-ms-ussystem';
		},
		listen() {},
		translate(phrase) {
			return {
				'common.close': 'Close',
				'info.content': '<strong>Helpful</strong> text.',
				'info.title': 'Information',
			}[phrase] || '';
		},
		translateMarkdown(name, replacements = {}) {
			return Promise.resolve(`# ${name}\n\nHello **${replacements.name || 'friend'}**.`);
		},
		unlisten() {},
	};
}

describe('InfoDialog', function() {
	let harness;

	beforeEach(function() {
		const localize = makeLocalizeMock();
		harness = createTestHarness()
			.withService('localize', localize)
			.withContext({localize});
	});

	afterEach(function() {
		harness?.unmount();
		harness = null;
	});

	it('renders localized html phrase content', function() {
		harness.render(InfoDialog, {
			content: 'info.content',
			html: true,
			title: 'info.title',
		});

		expect(document.body.querySelector('.info-dialog').textContent).toContain('Information');
		expect(document.body.querySelector('.info-dialog strong').textContent).toBe('Helpful');
	});

	it('renders localized markdown content', async function() {
		await act(async () => {
			harness.render(InfoDialog, {
				content: 'accounts-login',
				markdown: true,
				replacements: {
					name: 'Alice',
				},
				title: 'info.title',
			});
		});

		expect(document.body.querySelector('.info-dialog h1').textContent).toBe('accounts-login');
		expect(document.body.querySelector('.info-dialog strong').textContent).toBe('Alice');
	});
});
