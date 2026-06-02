import React from 'react';
import { act } from 'react';

import PasswordInput from '../PasswordInput.jsx';
import { createTestHarness } from '../../testing/TestHarness.js';

function makeLocalizeMock() {
	return {
		getLocale() {
			return 'en-US';
		},
		listen() {},
		translate(phrase) {
			return {
				'account.password': 'Password',
				'account.password_help': 'Use a memorable password',
				'password.toggle_visibility': 'Toggle password visibility',
				'password.rule.length': 'At least 8 characters',
				'password.rule.number': 'Includes a number',
			}[phrase] || '';
		},
		unlisten() {},
	};
}

describe('PasswordInput', function() {
	let harness;

	afterEach(function() {
		harness?.unmount();
		harness = null;
	});

	it('renders a localized password field with helper text and autocomplete', function() {
		const localize = makeLocalizeMock();

		harness = createTestHarness()
			.withService('localize', localize)
			.withContext({ localize });

		const result = harness.render(PasswordInput, {
			autoComplete: 'current-password',
			helperText: 'account.password_help',
			label: 'account.password',
			value: '',
		});
		const input = result.container.querySelector('input');

		expect(input.type).toBe('password');
		expect(input.getAttribute('autocomplete')).toBe('current-password');
		expect(result.container.textContent).toContain('Password');
		expect(result.container.textContent).toContain('Use a memorable password');
	});

	it('toggles password visibility with an accessible pressed state', function() {
		const localize = makeLocalizeMock();

		harness = createTestHarness()
			.withService('localize', localize)
			.withContext({ localize });

		const result = harness.render(PasswordInput, {
			label: 'account.password',
			value: 'secret',
		});
		const input = result.container.querySelector('input');
		const button = result.container.querySelector('button');

		expect(input.type).toBe('password');
		expect(button.getAttribute('aria-label')).toBe('Toggle password visibility');
		expect(button.getAttribute('aria-pressed')).toBe('false');

		act(() => {
			button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});

		expect(input.type).toBe('text');
		expect(button.getAttribute('aria-pressed')).toBe('true');
	});

	it('forwards changes and shows localized complexity rules', function() {
		const localize = makeLocalizeMock();
		const validity = [];
		let nextValue = '';

		harness = createTestHarness()
			.withService('localize', localize)
			.withContext({ localize });

		const result = harness.render(PasswordInput, {
			label: 'account.password',
			onChange(event) {
				nextValue = event.target.value;
			},
			onValidityChange(valid, passed) {
				validity.push({valid, passed});
			},
			rules: [
				{
					name: 'length',
					label: 'password.rule.length',
					pattern: /.{8,}/,
				},
				{
					name: 'number',
					label: 'password.rule.number',
					pattern: /\d/,
				},
			],
			value: '',
		});
		const input = result.container.querySelector('input');

		act(() => {
			setInputValue(input, 'secret1');
			input.dispatchEvent(new Event('input', { bubbles: true }));
		});

		expect(nextValue).toBe('secret1');
		expect(validity[0]).toEqual({
			valid: false,
			passed: {
				length: false,
				number: true,
			},
		});
		expect(result.container.textContent).toContain('At least 8 characters');
		expect(result.container.textContent).toContain('Includes a number');
		expect(result.container.querySelectorAll('.mn-password-complexity__rule').length).toBe(2);
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
