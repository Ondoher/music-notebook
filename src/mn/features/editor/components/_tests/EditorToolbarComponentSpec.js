import React from 'react';
import { act } from 'react';
import { Registry } from '@polylith/core';
import { createTestHarness } from '../../../../testing/TestHarness.js';
import IconRegistryService from '../../../../services/icon-registry.js';
import EditorToolbarService from '../../editor-toolbar.js';
import EditorToolbar from '../EditorToolbar.jsx';

function TestIcon() {
	return <svg viewBox="0 0 18 18"><path d="M1 1h16v16H1z" /></svg>;
}

function makeLocalizeMock() {
	return {
		translate(phrase) {
			const phrases = {
				'editor.toolbar.bold': 'Bold',
				'editor.toolbar.font_size': 'Font size',
				'editor.toolbar.font_size.decrease': 'Decrease font size',
				'editor.toolbar.font_size.increase': 'Increase font size',
				'editor.toolbar.italic': 'Italic',
				'editor.toolbar.italic_icon': 'Italic icon hover',
				'paragraph_format.style': 'Style',
			};

			return phrases[phrase] || phrase;
		},
	};
}

describe('EditorToolbar component', function() {
	let harness;

	afterEach(function() {
		harness?.unmount();
		harness = null;
	});

	function createServices() {
		const registry = new Registry();
		const editorToolbar = new EditorToolbarService(registry);
		const iconRegistry = new IconRegistryService(registry);

		editorToolbar.start();
		iconRegistry.start();
		iconRegistry.registerIcon('editor.bold', TestIcon);
		iconRegistry.registerIcon('editor.italic', TestIcon, 'default', 'editor.toolbar.italic_icon');
		editorToolbar.addItem(10, 100, 'editor.bold', 'editor.toolbar.bold', 'editor.bold', { pressed: false });
		editorToolbar.addItem(10, 200, 'editor.italic', 'editor.toolbar.italic', 'editor.italic');
		editorToolbar.addItem(30, 50, 'paragraph.style', 'paragraph_format.style', '', {
			commandId: 'paragraph.format.style',
			controlType: 'select',
			options: [
				{ fallback: 'Normal', label: '', value: 'normal' },
				{ fallback: 'Header 1', label: '', value: 'header-1' },
			],
			value: 'normal',
		});
		editorToolbar.addItem(30, 100, 'paragraph.font-size', 'editor.toolbar.font_size', '', {
			commandId: 'paragraph.format.font-size',
			controlType: 'font-size',
			value: 12,
		});

		return { editorToolbar, iconRegistry };
	}

	it('renders toolbar items from the editor toolbar service', function() {
		const { editorToolbar, iconRegistry } = createServices();

		harness = createTestHarness()
			.withContext({ localize: makeLocalizeMock() });

		const result = harness.render(EditorToolbar, {
			editorToolbar,
			iconRegistry,
		});

		const buttons = result.container.querySelectorAll('.mn-editor-toolbar__button');

		expect(buttons.length).toBe(2);
		expect(buttons[0].getAttribute('aria-label')).toBe('Bold');
		expect(buttons[0].getAttribute('aria-pressed')).toBe('false');
		expect(buttons[0].querySelector('svg')).toBeTruthy();
		expect(buttons[1].getAttribute('aria-label')).toBe('Italic');
		expect(result.container.querySelector('[data-toolbar-item-id="paragraph.style"]').textContent).toContain('Normal');
		expect(result.container.querySelector('[data-toolbar-item-id="paragraph.font-size"] input').value).toBe('12');
		expect(result.container.querySelectorAll('[data-toolbar-item-id="paragraph.font-size"] button').length).toBe(2);
	});

	it('can use icon hover text when the toolbar item does not override it', function() {
		const { editorToolbar, iconRegistry } = createServices();

		editorToolbar.updateItem('editor.italic', { tooltipStringId: '' });
		harness = createTestHarness()
			.withContext({ localize: makeLocalizeMock() });

		const result = harness.render(EditorToolbar, {
			editorToolbar,
			iconRegistry,
		});
		const button = result.container.querySelector('[data-toolbar-item-id="editor.italic"]');

		expect(button.getAttribute('aria-label')).toBe('Italic icon hover');
	});

	it('selects toolbar items through the editor toolbar service', function() {
		const { editorToolbar, iconRegistry } = createServices();
		const selected = [];

		editorToolbar.listen('item-selected', (event) => selected.push(event));
		harness = createTestHarness()
			.withContext({ localize: makeLocalizeMock() });

		const result = harness.render(EditorToolbar, {
			editorToolbar,
			iconRegistry,
		});

		act(() => {
			result.container
				.querySelector('[data-toolbar-item-id="editor.bold"]')
				.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});

		expect(selected.length).toBe(1);
		expect(selected[0].item.id).toBe('editor.bold');
	});

	it('selects font size controls with the chosen value', function() {
		const { editorToolbar, iconRegistry } = createServices();
		const selected = [];

		editorToolbar.listen('item-selected', (event) => selected.push(event));
		harness = createTestHarness()
			.withContext({ localize: makeLocalizeMock() });

		const result = harness.render(EditorToolbar, {
			editorToolbar,
			iconRegistry,
		});
		const input = result.container.querySelector('[data-toolbar-item-id="paragraph.font-size"] input');

		act(() => {
			setInputValue(input, '18');
			input.dispatchEvent(new Event('input', { bubbles: true }));
		});

		expect(selected[selected.length - 1].item.id).toBe('paragraph.font-size');
		expect(selected[selected.length - 1].item.commandPayload).toBe(18);
	});
});

function setInputValue(input, value) {
	const valueSetter = Object.getOwnPropertyDescriptor(input, 'value')?.set;
	const prototypeValueSetter = Object.getOwnPropertyDescriptor(
		Object.getPrototypeOf(input),
		'value',
	)?.set;

	if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
		prototypeValueSetter.call(input, value);
		return;
	}

	valueSetter?.call(input, value);
}
