import React from 'react';
import { act } from 'react';

import ScaleInput from '../ScaleInput.jsx';
import { createTestHarness } from '../../testing/TestHarness.js';

describe('ScaleInput', function() {
	let harness;

	afterEach(function() {
		harness?.unmount();
		harness = null;
	});

	it('builds a scale payload when the key quality changes', function() {
		let nextResult = null;

		harness = createTestHarness();

		const result = harness.render(ScaleInput, {
			initialKey: 'D',
			onResultChange(scaleResult) {
				nextResult = scaleResult;
			},
		});
		const qualitySelect = result.container.querySelector('.mn-scale-input-field [role="combobox"]');
		const helper = result.container.querySelector('.mn-scale-input-helper');

		act(() => {
			selectValue(qualitySelect, 'minor');
		});

		expect(helper.textContent).toBe('D minor');
		expect(nextResult.payload.scaleId).toBe('typed:D minor');
		expect(nextResult.payload.notes).toEqual(['D4', 'E4', 'F4', 'G4', 'A4', 'Bb4', 'C5', 'D5']);
	});

	it('builds modal scales from the key quality field', function() {
		let nextResult = null;

		harness = createTestHarness();

		const result = harness.render(ScaleInput, {
			initialKey: 'D',
			onResultChange(scaleResult) {
				nextResult = scaleResult;
			},
		});
		const qualitySelect = result.container.querySelector('.mn-scale-input-field [role="combobox"]');

		act(() => {
			selectValue(qualitySelect, 'dorian');
		});

		expect(result.container.querySelector('.mn-scale-input-helper').textContent).toBe('D dorian');
		expect(nextResult.payload.scaleId).toBe('typed:D dorian');
		expect(nextResult.payload.displayKeyMode).toBe('dorian');
	});
});

function selectValue(select, value) {
	const input = select.parentElement.querySelector('input');
	const valueSetter = Object.getOwnPropertyDescriptor(input, 'value')?.set;
	const prototypeValueSetter = Object.getOwnPropertyDescriptor(
		Object.getPrototypeOf(input),
		'value',
	)?.set;

	if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
		prototypeValueSetter.call(input, value);
	} else {
		valueSetter?.call(input, value);
	}

	input.dispatchEvent(new Event('change', { bubbles: true }));
}
