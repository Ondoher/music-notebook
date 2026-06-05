import React from 'react';
import { act } from 'react';
import { createTestHarness } from '../../../../testing/TestHarness.js';
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

	function createTabs() {
		return [
			{ id: 'intro', order: 0, title: '' },
			{ id: 'bridge', order: 1, title: 'Bridge' },
			{ id: 'chorus', order: 2, title: 'Chorus' },
		];
	}

	it('renders document tabs from props', function() {
		const localize = makeLocalizeMock();
		const tabs = createTabs();

		harness = createTestHarness()
			.withService('localize', localize)
			.withContext({ localize });

		const result = harness.render(DocumentTabs, {
			activeTabId: 'intro',
			tabs,
		});

		expect(result.container.querySelector('.mn-document-tabs').getAttribute('aria-label')).toBe('Document tabs');
		expect(result.container.textContent).toContain('Tab 1');
		expect(result.container.textContent).toContain('Bridge');
		expect(result.container.textContent).toContain('Chorus');
	});

	it('adds a tab after the active tab and moves tabs with action buttons', function() {
		const localize = makeLocalizeMock();
		const calls = [];

		harness = createTestHarness()
			.withService('localize', localize)
			.withContext({ localize });

		const result = harness.render(DocumentTabs, {
			activeTabId: 'chorus',
			onAddTab: (afterTabId) => calls.push(['add', afterTabId]),
			onMoveTab: (tabId, targetIndex) => calls.push(['move', tabId, targetIndex]),
			tabs: createTabs(),
		});

		act(() => {
			result.container.querySelector('[aria-label="Add tab"]').click();
		});

		expect(calls).toEqual([['add', 'chorus']]);

		act(() => {
			result.container.querySelector('[aria-label="Move tab left"]').click();
		});

		expect(calls).toEqual([
			['add', 'chorus'],
			['move', 'chorus', 1],
		]);
	});

	it('selects a tab when it is clicked', function() {
		const localize = makeLocalizeMock();
		const selected = [];

		harness = createTestHarness()
			.withService('localize', localize)
			.withContext({ localize });

		const result = harness.render(DocumentTabs, {
			activeTabId: 'intro',
			onSelectTab: (tabId) => selected.push(tabId),
			tabs: createTabs(),
		});
		const bridgeTab = Array.from(result.container.querySelectorAll('.mn-document-tabs__tab'))
			.find((tab) => tab.textContent === 'Bridge');

		act(() => {
			bridgeTab.click();
		});

		expect(selected).toEqual(['bridge']);
	});

	it('renames a tab with an inline editor', function() {
		const localize = makeLocalizeMock();
		const renamed = [];

		harness = createTestHarness()
			.withService('localize', localize)
			.withContext({ localize });

		const result = harness.render(DocumentTabs, {
			activeTabId: 'intro',
			onRenameTab: (tabId, title) => renamed.push([tabId, title]),
			onSelectTab: () => {},
			tabs: createTabs(),
		});
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

		expect(renamed).toEqual([['bridge', 'Verse']]);
		expect(result.container.querySelector('[aria-label="Rename tab"]')).toBeNull();
	});
});
