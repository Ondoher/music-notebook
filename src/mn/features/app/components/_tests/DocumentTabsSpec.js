import React from 'react';
import { act } from 'react';
import { Registry } from '@polylith/core';
import { createTestHarness } from '../../../../testing/TestHarness.js';
import DocumentModelService from '../../../../models/document-model.js';
import DocumentTabs from '../DocumentTabs.jsx';

function makeLocalizeMock() {
	return {
		getLocale() {
			return 'en-US-u-ms-ussystem';
		},
		listen() {},
		translate(phrase, replacements = {}) {
			const phrases = {
				'app.tabs.add': 'Add tab',
				'app.tabs.drag_hint': 'Drag tabs to reorder them.',
				'app.tabs.label': 'Document tabs',
				'app.tabs.move_left': 'Move tab left',
				'app.tabs.move_right': 'Move tab right',
				'app.tabs.rename': 'Rename tab',
				'app.tabs.untitled': `Tab ${replacements.number}`,
			};

			return phrases[phrase] || '';
		},
		unlisten() {},
	};
}

describe('DocumentTabs', function() {
	let harness;

	afterEach(function() {
		harness?.unmount();
		harness = null;
	});

	function createModel() {
		const registry = new Registry();
		const documentModel = new DocumentModelService(registry);

		documentModel.start();
		documentModel.addTab({ title: 'Bridge' });
		documentModel.addTab({ title: 'Chorus' });
		return documentModel;
	}

	it('renders document tabs from the document model', function() {
		const localize = makeLocalizeMock();
		const documentModel = createModel();

		harness = createTestHarness()
			.withService('localize', localize)
			.withContext({ localize });

		const result = harness.render(DocumentTabs, { documentModel });

		expect(result.container.querySelector('.mn-document-tabs').getAttribute('aria-label')).toBe('Document tabs');
		expect(result.container.textContent).toContain('Tab 1');
		expect(result.container.textContent).toContain('Bridge');
		expect(result.container.textContent).toContain('Chorus');
	});

	it('adds a tab after the active tab and moves tabs with action buttons', function() {
		const localize = makeLocalizeMock();
		const documentModel = createModel();

		harness = createTestHarness()
			.withService('localize', localize)
			.withContext({ localize });

		const result = harness.render(DocumentTabs, { documentModel });

		act(() => {
			result.container.querySelector('[aria-label="Add tab"]').click();
		});

		expect(documentModel.getTabs().map((tab) => tab.title)).toEqual([
			'',
			'Bridge',
			'Chorus',
			'',
		]);

		act(() => {
			result.container.querySelector('[aria-label="Move tab left"]').click();
		});

		expect(documentModel.getTabs().map((tab) => tab.title)).toEqual([
			'',
			'Bridge',
			'',
			'Chorus',
		]);
	});

	it('renames a tab with an inline editor', function() {
		const localize = makeLocalizeMock();
		const documentModel = createModel();

		harness = createTestHarness()
			.withService('localize', localize)
			.withContext({ localize });

		const result = harness.render(DocumentTabs, { documentModel });
		const bridgeTab = Array.from(result.container.querySelectorAll('.mn-document-tabs__tab'))
			.find((tab) => tab.textContent === 'Bridge');

		act(() => {
			bridgeTab.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
		});

		const input = result.container.querySelector('[aria-label="Rename tab"]');

		expect(input.value).toBe('Bridge');

		act(() => {
			input.value = 'Verse';
			input.dispatchEvent(new Event('input', { bubbles: true }));
			input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
		});

		expect(documentModel.getTabs().map((tab) => tab.title)).toContain('Verse');
		expect(result.container.querySelector('[aria-label="Rename tab"]')).toBeNull();
	});
});
