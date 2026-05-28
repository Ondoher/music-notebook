import React from 'react';
import { act } from 'react';

import KeyPicker from '../KeyPicker.jsx';
import { createTestHarness } from '../../testing/TestHarness.js';

describe('KeyPicker', function() {
	let harness;

	afterEach(function() {
		harness?.unmount();
		harness = null;
	});

	it('renders only the key field by default', function() {
		harness = createTestHarness();

		const result = harness.render(KeyPicker, {
			value: 'C',
		});

		expect(result.container.querySelector('input').value).toBe('C');
		expect(result.container.querySelector('[role="combobox"]')).toBe(null);
	});

	it('renders optional key mode selection and reports changes', function() {
		let nextKey = '';
		let nextMode = '';

		harness = createTestHarness();

		const result = harness.render(KeyPicker, {
			mode: 'major',
			onKeyChange(key) {
				nextKey = key;
			},
			onModeChange(mode) {
				nextMode = mode;
			},
			showMode: true,
			value: 'C',
		});
		const keyInput = result.container.querySelector('input');
		const modeSelect = result.container.querySelector('[role="combobox"]');

		act(() => {
			setInputValue(keyInput, 'D');
			keyInput.dispatchEvent(new Event('input', { bubbles: true }));
		});

		act(() => {
			selectValue(modeSelect, 'minor');
		});

		expect(nextKey).toBe('D');
		expect(nextMode).toBe('minor');
	});

	it('renders optional enharmonic key selection and reports changes', function() {
		let nextUseEnharmonicKey = null;

		harness = createTestHarness();

		const result = harness.render(KeyPicker, {
			enharmonicKey: 'Bb',
			onUseEnharmonicKeyChange(useEnharmonicKey) {
				nextUseEnharmonicKey = useEnharmonicKey;
			},
			useEnharmonicKey: true,
			value: 'A#',
		});
		const checkbox = result.container.querySelector('input[type="checkbox"]');

		act(() => {
			checkbox.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});

		expect(checkbox).toBeTruthy();
		expect(checkbox.closest('label').textContent).toContain('Use B♭');
		expect(nextUseEnharmonicKey).toBe(false);
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

function selectValue(select, value) {
	const input = select.parentElement.querySelector('input');

	setInputValue(input, value);
	input.dispatchEvent(new Event('change', { bubbles: true }));
}
