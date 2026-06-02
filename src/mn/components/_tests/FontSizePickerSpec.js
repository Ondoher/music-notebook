import React from 'react';
import { act } from 'react';

import FontSizePicker from '../FontSizePicker.jsx';
import { createTestHarness } from '../../testing/TestHarness.js';

function makeLocalizeMock() {
	return {
		getLocale() {
			return 'en-US-u-ms-ussystem';
		},
		listen() {},
		translate(phrase) {
			return {
				'format.font_size': 'Font size',
				'format.font_size.decrease': 'Decrease font size',
				'format.font_size.helper': 'Choose a size',
				'format.font_size.increase': 'Increase font size',
			}[phrase] || '';
		},
		unlisten() {},
	};
}

describe('FontSizePicker', function() {
	let harness;

	afterEach(function() {
		harness?.unmount();
		harness = null;
	});

	it('renders a localized numeric field with increment and decrement buttons', function() {
		const localize = makeLocalizeMock();

		harness = createTestHarness()
			.withService('localize', localize)
			.withContext({ localize });

		const result = harness.render(FontSizePicker, {
			helperText: 'format.font_size.helper',
			value: 12,
		});
		const input = result.container.querySelector('input');
		const buttons = result.container.querySelectorAll('button');

		expect(input).toBeTruthy();
		expect(input.type).toBe('number');
		expect(input.value).toBe('12');
		expect(result.container.textContent).toContain('Font size');
		expect(result.container.textContent).toContain('Choose a size');
		expect(buttons.length).toBe(2);
		expect(buttons[0].getAttribute('aria-label')).toBe('Decrease font size');
		expect(buttons[1].getAttribute('aria-label')).toBe('Increase font size');
	});

	it('reports stepped values from the increment and decrement buttons', function() {
		const localize = makeLocalizeMock();
		const changes = [];

		harness = createTestHarness()
			.withService('localize', localize)
			.withContext({ localize });

		const result = harness.render(FontSizePicker, {
			onChange(value) {
				changes.push(value);
			},
			step: 2,
			value: 12,
		});
		const buttons = result.container.querySelectorAll('button');

		act(() => {
			buttons[1].dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});
		act(() => {
			buttons[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});

		expect(changes).toEqual([14, 12]);
	});

	it('clamps typed values to the configured range', function() {
		const localize = makeLocalizeMock();
		const changes = [];

		harness = createTestHarness()
			.withService('localize', localize)
			.withContext({ localize });

		const result = harness.render(FontSizePicker, {
			max: 24,
			min: 8,
			onChange(value) {
				changes.push(value);
			},
			value: 12,
		});
		const input = result.container.querySelector('input');

		act(() => {
			setInputValue(input, '72');
			input.dispatchEvent(new Event('input', { bubbles: true }));
		});

		expect(changes[changes.length - 1]).toBe(24);
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
