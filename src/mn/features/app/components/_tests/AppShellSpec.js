import React from 'react';
import { act } from 'react';
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
		translate(phrase) {
			const phrases = {
				'app.title': 'Music Notebook',
				'app.status.poc': 'POC',
				'app.menu.document': 'Document',
				'app.menu.insert': 'Insert',
			};

			return phrases[phrase] || '';
		},
		unlisten() {},
	};
}

function makeMainMenuMock(menu = []) {
	return {
		listeners: {},
		getMenu() {
			return menu;
		},
		listen(eventName, listener) {
			this.listeners[eventName] = listener;
			return listener;
		},
		unlisten(eventName, listener) {
			if (this.listeners[eventName] === listener) {
				delete this.listeners[eventName];
			}
		},
		emit(eventName, event) {
			this.listeners[eventName]?.(event);
		},
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
		const mainMenu = makeMainMenuMock([
			{
				id: 'document',
				priority: 100,
				stringId: 'app.menu.document',
				sections: [],
			},
		]);

		harness = createTestHarness()
			.withService('localize', localize)
			.withContext({ localize });

		const result = harness.render(AppShell, {
			activePageId: 'editor',
			mainMenu,
			pageComponent: <EditorProbe />,
			pages: [{ id: 'editor', label: 'Editor' }],
		});

		expect(result.container.querySelector('.mn-shell-editor').getAttribute('aria-label')).toBe('Music Notebook');
		expect(result.container.querySelector('.mn-main-menu__brand').textContent).toBe('Music Notebook');
		expect(result.container.querySelector('.mn-main-menu__button').textContent).toBe('Document');
		expect(result.container.querySelector('.editor-probe').textContent).toBe('Editor mounted');
	});

	it('updates the menu when the main menu service emits changes', function() {
		const localize = makeLocalizeMock();
		const mainMenu = makeMainMenuMock([]);

		harness = createTestHarness()
			.withService('localize', localize)
			.withContext({ localize });

		const result = harness.render(AppShell, {
			activePageId: 'editor',
			mainMenu,
			pageComponent: <EditorProbe />,
		});

		expect(result.container.querySelectorAll('.mn-main-menu__button').length).toBe(0);

		act(() => {
			mainMenu.emit('main-item-added', {
				menu: [
					{
						id: 'insert',
						priority: 200,
						stringId: 'app.menu.insert',
						sections: [],
					},
				],
			});
		});

		expect(result.container.querySelector('.mn-main-menu__button').textContent).toBe('Insert');
	});
});
