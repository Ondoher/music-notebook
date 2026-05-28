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

	it('builds a scale payload when the scale type changes', function() {
		let nextResult = null;

		harness = createTestHarness();

		const result = harness.render(ScaleInput, {
			initialKey: 'D',
			onResultChange(scaleResult) {
				nextResult = scaleResult;
			},
		});
		const scaleTypeSelect = result.container.querySelector('.mn-scale-input-field [role="combobox"]');
		const helper = result.container.querySelector('.mn-scale-input-helper');

		act(() => {
			selectValue(scaleTypeSelect, 'minor');
		});

		expect(helper.textContent).toBe('D minor');
		expect(nextResult.payload.scaleId).toBe('typed:D minor');
		expect(nextResult.payload.notes).toEqual(['D4', 'E4', 'F4', 'G4', 'A4', 'Bb4', 'C4']);
	});

	it('shows the mode selector only for modal scales', function() {
		let nextResult = null;

		harness = createTestHarness();

		const result = harness.render(ScaleInput, {
			initialKey: 'D',
			onResultChange(scaleResult) {
				nextResult = scaleResult;
			},
			showKey: false,
		});
		const typeSelect = result.container.querySelector('.mn-scale-input-field [role="combobox"]');

		expect(result.container.querySelectorAll('.mn-scale-input-field [role="combobox"]').length).toBe(1);

		act(() => {
			selectValue(typeSelect, 'mode');
		});

		const selects = result.container.querySelectorAll('.mn-scale-input-field [role="combobox"]');
		const modeSelect = selects[1];

		act(() => {
			selectValue(modeSelect, 'dorian');
		});

		expect(selects.length).toBe(2);
		expect(result.container.querySelector('.mn-scale-input-helper').textContent).toBe('D dorian');
		expect(nextResult.payload.scaleId).toBe('typed:D dorian');
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
