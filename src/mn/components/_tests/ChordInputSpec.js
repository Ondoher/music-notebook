import React from 'react';
import { act } from 'react';

import ChordInput from '../ChordInput.jsx';
import { createTestHarness } from '../../testing/TestHarness.js';

describe('ChordInput', function() {
	let harness;

	afterEach(function() {
		harness?.unmount();
		harness = null;
	});

	it('selects the matching inversion when a slash chord is entered', function() {
		let resultChange = null;

		harness = createTestHarness();
		const result = harness.render(ChordInput, {
			initialValue: 'F/A',
			onResultChange(result) {
				resultChange = result;
			},
		});

		expect(resultChange.payload.inversion).toBe(1);
		expect(result.container.textContent).toContain('First inversion');
	});

	it('updates direct chord text when the inversion selector changes', function() {
		let resultChange = null;

		harness = createTestHarness();
		const result = harness.render(ChordInput, {
			initialValue: 'C',
			onResultChange(result) {
				resultChange = result;
			},
		});
		const chordInput = result.container.querySelector('.mn-chord-input-field input');
		const inversionSelect = result.container.querySelector('[role="combobox"]');

		act(() => {
			selectValue(inversionSelect, '1');
		});

		expect(chordInput.value).toBe('C/E');
		expect(resultChange.payload.label).toBe('C/E');
		expect(resultChange.payload.inversion).toBe(1);
	});
});

function selectValue(select, value) {
	const input = select.parentElement.querySelector('input');

	setInputValue(input, value);
	input.dispatchEvent(new Event('change', { bubbles: true }));
}

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
