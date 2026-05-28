import React from 'react';
import { act } from 'react';

import Button from '../Button.jsx';
import { createTestHarness } from '../../testing/TestHarness.js';

function makeLocalizeMock() {
	return {
		getLocale() {
			return 'en-US';
		},
		listen() {},
		t(phrase) {
			return {
				'action.save': 'Save',
				'action.save_aria': 'Save document',
			}[phrase] || '';
		},
		unlisten() {},
	};
}

describe('Button', function() {
	let harness;

	afterEach(function() {
		harness?.unmount();
		harness = null;
	});

	it('renders a localized primary button and reports clicks', function() {
		const localize = makeLocalizeMock();
		let clickCount = 0;

		harness = createTestHarness()
			.withService('localize', localize)
			.withContext({ localize });

		const result = harness.render(Button, {
			ariaLabel: 'action.save_aria',
			label: 'action.save',
			onClick() {
				clickCount += 1;
			},
			variant: 'primary',
		});
		const button = result.container.querySelector('button');

		act(() => {
			button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});

		expect(button.textContent).toBe('Save');
		expect(button.getAttribute('aria-label')).toBe('Save document');
		expect(button.classList.contains('mn-button-primary')).toBe(true);
		expect(clickCount).toBe(1);
	});

	it('renders selected secondary large button state', function() {
		harness = createTestHarness();

		const result = harness.render(Button, {
			children: 'Selected',
			selected: true,
			size: 'large',
			variant: 'secondary',
		});
		const button = result.container.querySelector('button');

		expect(button.classList.contains('mn-button-secondary')).toBe(true);
		expect(button.classList.contains('mn-button-large')).toBe(true);
		expect(button.classList.contains('mn-button-selected')).toBe(true);
		expect(button.getAttribute('aria-pressed')).toBe('true');
	});

	it('renders disabled button state', function() {
		harness = createTestHarness();

		const result = harness.render(Button, {
			disabled: true,
			label: 'Disabled',
		});
		const button = result.container.querySelector('button');

		expect(button.disabled).toBe(true);
		expect(button.classList.contains('Mui-disabled')).toBe(true);
	});
});
