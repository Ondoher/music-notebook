import React from 'react';
import { act } from 'react';

import ChordText from '../ChordText.jsx';
import { createTestHarness } from '../../testing/TestHarness.js';

describe('ChordText', function() {
	let harness;

	afterEach(function() {
		harness?.unmount();
		harness = null;
	});

	it('resolves direct chord names', function() {
		let resolvedChange = null;

		harness = createTestHarness();
		harness.render(ChordText, {
			onResolve(change) {
				resolvedChange = change;
			},
			value: 'Cdim7',
		});

		expect(resolvedChange.inputKind).toBe('chordName');
		expect(resolvedChange.result.isValid).toBeTrue();
		expect(resolvedChange.result.payload.notes).toEqual(['C4', 'Eb4', 'Gb4', 'Bbb4']);
	});

	it('resolves direct chord text quality aliases', function() {
		let resolvedChange = null;

		harness = createTestHarness();
		harness.render(ChordText, {
			onResolve(change) {
				resolvedChange = change;
			},
			value: 'C augmented',
		});

		expect(resolvedChange.value).toBe('C+');
		expect(resolvedChange.inputKind).toBe('chordName');
		expect(resolvedChange.result.isValid).toBeTrue();
		expect(resolvedChange.result.payload.label).toBe('C+');
		expect(resolvedChange.result.payload.notes).toEqual(['C4', 'E4', 'G#4']);
	});

	it('resolves Roman numeral chord degrees in the selected key', function() {
		let resolvedChange = null;

		harness = createTestHarness();
		harness.render(ChordText, {
			keyName: 'F',
			onResolve(change) {
				resolvedChange = change;
			},
			value: 'V7',
		});

		expect(resolvedChange.inputKind).toBe('romanDegree');
		expect(resolvedChange.result.chordSymbol).toBe('C7');
		expect(resolvedChange.result.payload.notes).toEqual(['C4', 'E4', 'G4', 'Bb4']);
	});

	it('resolves numeric chord degrees using the selected key mode', function() {
		let resolvedChange = null;

		harness = createTestHarness();
		harness.render(ChordText, {
			keyMode: 'minor',
			onResolve(change) {
				resolvedChange = change;
			},
			value: '2',
		});

		expect(resolvedChange.inputKind).toBe('numberDegree');
		expect(resolvedChange.result.effectiveRomanNumeral).toBe('ii\u00b0');
		expect(resolvedChange.result.chordSymbol).toBe('Ddim');
		expect(resolvedChange.result.payload.notes).toEqual(['D4', 'F4', 'Ab4']);
	});

	it('emits resolved changes while typing', function() {
		let changedValue = '';
		let changedKind = '';

		harness = createTestHarness();
		const result = harness.render(ChordText, {
			onChange(change) {
				changedValue = change.value;
				changedKind = change.inputKind;
			},
			value: '',
		});
		const input = result.container.querySelector('input');

		act(() => {
			setInputValue(input, 'ii');
			input.dispatchEvent(new Event('input', { bubbles: true }));
		});

		expect(changedValue).toBe('ii');
		expect(changedKind).toBe('romanDegree');
	});

	it('preserves spaces while typing', function() {
		let changedValue = '';
		let changedKind = '';

		harness = createTestHarness();
		const result = harness.render(ChordText, {
			onChange(change) {
				changedValue = change.value;
				changedKind = change.inputKind;
			},
			value: '',
		});
		const input = result.container.querySelector('input');

		act(() => {
			setInputValue(input, 'ii ');
			input.dispatchEvent(new Event('input', { bubbles: true }));
		});

		expect(changedValue).toBe('ii ');
		expect(changedKind).toBe('romanDegree');
	});

	it('resolves diminished text aliases while typing', function() {
		let changedValue = '';
		let changedKind = '';
		let changedResult = null;

		harness = createTestHarness();
		const result = harness.render(ChordText, {
			onChange(change) {
				changedValue = change.value;
				changedKind = change.inputKind;
				changedResult = change.result;
			},
			value: '',
		});
		const input = result.container.querySelector('input');

		act(() => {
			setInputValue(input, 'ii diminished');
			input.dispatchEvent(new Event('input', { bubbles: true }));
		});

		expect(changedValue).toBe('ii\u00b0');
		expect(changedKind).toBe('romanDegree');
		expect(changedResult.chordSymbol).toBe('Ddim');
	});

	it('resolves augmented text aliases while typing', function() {
		let changedValue = '';
		let changedKind = '';
		let changedResult = null;

		harness = createTestHarness();
		const result = harness.render(ChordText, {
			onChange(change) {
				changedValue = change.value;
				changedKind = change.inputKind;
				changedResult = change.result;
			},
			value: '',
		});
		const input = result.container.querySelector('input');

		act(() => {
			setInputValue(input, 'I augmented');
			input.dispatchEvent(new Event('input', { bubbles: true }));
		});

		expect(changedValue).toBe('I+');
		expect(changedKind).toBe('romanDegree');
		expect(changedResult.chordSymbol).toBe('Caug');
	});

	it('normalizes direct chord quality aliases while typing', function() {
		let changedValue = '';
		let changedKind = '';
		let changedResult = null;

		harness = createTestHarness();
		const result = harness.render(ChordText, {
			onChange(change) {
				changedValue = change.value;
				changedKind = change.inputKind;
				changedResult = change.result;
			},
			value: '',
		});
		const input = result.container.querySelector('input');

		act(() => {
			setInputValue(input, 'cdim');
			input.dispatchEvent(new Event('input', { bubbles: true }));
		});

		expect(changedValue).toBe('C\u00b0');
		expect(changedKind).toBe('chordName');
		expect(changedResult.payload.label).toBe('C\u00b0');
	});

	it('normalizes half-diminished aliases while typing', function() {
		let changedValue = '';
		let changedKind = '';
		let changedResult = null;

		harness = createTestHarness();
		const result = harness.render(ChordText, {
			onChange(change) {
				changedValue = change.value;
				changedKind = change.inputKind;
				changedResult = change.result;
			},
			value: '',
		});
		const input = result.container.querySelector('input');

		act(() => {
			setInputValue(input, 'viio/7');
			input.dispatchEvent(new Event('input', { bubbles: true }));
		});

		expect(changedValue).toBe('vii\u00f87');
		expect(changedKind).toBe('romanDegree');
		expect(changedResult.chordSymbol).toBe('Bm7b5');
	});

	it('resolves direct chord half-diminished aliases', function() {
		let resolvedChange = null;

		harness = createTestHarness();
		harness.render(ChordText, {
			onResolve(change) {
				resolvedChange = change;
			},
			value: 'C/o7',
		});

		expect(resolvedChange.value).toBe('C\u00f87');
		expect(resolvedChange.inputKind).toBe('chordName');
		expect(resolvedChange.result.isValid).toBeTrue();
		expect(resolvedChange.result.payload.notes).toEqual(['C4', 'Eb4', 'Gb4', 'Bb4']);
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
