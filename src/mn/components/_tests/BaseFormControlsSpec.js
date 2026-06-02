import React from 'react';
import { act } from 'react';

import BaseCheckbox from '../BaseCheckbox.jsx';
import BaseRadioButtons from '../BaseRadioButtons.jsx';
import BaseSelect from '../BaseSelect.jsx';
import TextInput from '../TextInput.jsx';
import { createTestHarness } from '../../testing/TestHarness.js';

function makeLocalizeMock() {
	return {
		getLocale() {
			return 'en-US-u-ms-ussystem';
		},
		listen() {},
		translate(phrase) {
			return {
				'field.choice': 'Choice',
				'field.enabled': 'Enabled',
				'field.name': 'Name',
				'field.mode': 'Mode',
				'helper.choice': 'Choose one',
				'helper.enabled': 'Turns the option on',
				'helper.name': 'Enter a name',
				'helper.mode': 'Pick a mode',
				'mode.major': 'Major',
				'mode.minor': 'Minor',
				'option.first': 'First',
				'option.second': 'Second',
			}[phrase] || '';
		},
		unlisten() {},
	};
}

describe('Base form controls', function() {
	let harness;

	afterEach(function() {
		harness?.unmount();
		harness = null;
	});

	it('renders a localized MUI text input with helper text and accessible description', function() {
		const localize = makeLocalizeMock();

		harness = createTestHarness()
			.withService('localize', localize)
			.withContext({ localize });

		const result = harness.render(TextInput, {
			helperText: 'helper.name',
			label: 'field.name',
			value: 'C',
		});
		const input = result.container.querySelector('input');
		const helper = result.container.querySelector('.MuiFormHelperText-root');

		expect(input).toBeTruthy();
		expect(input.value).toBe('C');
		expect(result.container.textContent).toContain('Name');
		expect(helper.textContent).toBe('Enter a name');
		expect(input.getAttribute('aria-describedby')).toBe(helper.id);
	});

	it('reports text input changes through the wrapped MUI input', function() {
		const localize = makeLocalizeMock();
		let nextValue = '';

		harness = createTestHarness()
			.withService('localize', localize)
			.withContext({ localize });

		const result = harness.render(TextInput, {
			label: 'field.name',
			onChange(event) {
				nextValue = event.target.value;
			},
		});
		const input = result.container.querySelector('input');

		act(() => {
			setInputValue(input, 'D');
			input.dispatchEvent(new Event('input', { bubbles: true }));
		});

		expect(nextValue).toBe('D');
	});

	it('renders a localized MUI select with selected option and helper text', function() {
		const localize = makeLocalizeMock();

		harness = createTestHarness()
			.withService('localize', localize)
			.withContext({ localize });

		const result = harness.render(BaseSelect, {
			helperText: 'helper.mode',
			label: 'field.mode',
			options: [
				{ label: 'mode.major', value: 'major' },
				{ label: 'mode.minor', value: 'minor' },
			],
			value: 'minor',
		});

		expect(result.container.textContent).toContain('Mode');
		expect(result.container.textContent).toContain('Minor');
		expect(result.container.querySelector('.MuiFormHelperText-root').textContent).toBe('Pick a mode');
		expect(result.container.querySelector('[role="combobox"]')).toBeTruthy();
	});

	it('renders a localized MUI checkbox with helper text and checked callback', function() {
		const localize = makeLocalizeMock();
		let checkedValue = null;

		harness = createTestHarness()
			.withService('localize', localize)
			.withContext({ localize });

		const result = harness.render(BaseCheckbox, {
			checked: false,
			helperText: 'helper.enabled',
			label: 'field.enabled',
			onChange(checked) {
				checkedValue = checked;
			},
		});
		const checkbox = result.container.querySelector('input[type="checkbox"]');
		const helper = result.container.querySelector('.MuiFormHelperText-root');

		act(() => {
			checkbox.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});

		expect(result.container.textContent).toContain('Enabled');
		expect(helper.textContent).toBe('Turns the option on');
		expect(checkbox.getAttribute('aria-describedby')).toBe(helper.id);
		expect(checkedValue).toBe(true);
	});

	it('renders localized radio buttons with group labeling', function() {
		const localize = makeLocalizeMock();
		let nextValue = '';

		harness = createTestHarness()
			.withService('localize', localize)
			.withContext({ localize });

		const result = harness.render(BaseRadioButtons, {
			helperText: 'helper.choice',
			label: 'field.choice',
			onChange(value) {
				nextValue = value;
			},
			options: [
				{ label: 'option.first', value: 'first' },
				{ label: 'option.second', value: 'second' },
			],
			value: 'first',
		});
		const radios = result.container.querySelectorAll('input[type="radio"]');
		const group = result.container.querySelector('[role="radiogroup"]');

		act(() => {
			radios[1].dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});

		expect(result.container.textContent).toContain('Choice');
		expect(result.container.textContent).toContain('First');
		expect(result.container.textContent).toContain('Second');
		expect(group.getAttribute('aria-labelledby')).toBeTruthy();
		expect(nextValue).toBe('second');
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
