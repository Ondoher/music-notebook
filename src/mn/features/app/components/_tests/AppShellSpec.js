import React from 'react';
import { createTestHarness } from '../../../../testing/TestHarness.js';
import AppShell from '../AppShell.jsx';

function EditorProbe() {
	return <section className="editor-probe">Editor mounted</section>;
}

function makeLocalizeMock() {
	return {
		getLocale() {
			return 'en-US-u-ms-ussystem';
		},
		listen() {},
		t(phrase) {
			const phrases = {
				'app.title': 'Music Notebook',
				'app.status.poc': 'POC',
			};

			return phrases[phrase] || '';
		},
		unlisten() {},
	};
}

describe('AppShell', function() {
	let harness;

	afterEach(function() {
		harness?.unmount();
		harness = null;
	});

	it('renders the active editor page component', function() {
		const localize = makeLocalizeMock();

		harness = createTestHarness()
			.withService('localize', localize)
			.withContext({ localize });

		const result = harness.render(AppShell, {
			activePageId: 'editor',
			pageComponent: <EditorProbe />,
			pages: [{ id: 'editor', label: 'Editor' }],
		});

		expect(result.container.querySelector('.mn-shell-editor').getAttribute('aria-label')).toBe('Music Notebook');
		expect(result.container.querySelector('.editor-probe').textContent).toBe('Editor mounted');
	});
});
