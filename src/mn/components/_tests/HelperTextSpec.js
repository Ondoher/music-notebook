import React from 'react';
import HelperText from '../HelperText.jsx';
import { createTestHarness } from '../../testing/TestHarness.js';

describe('HelperText', function() {
	let harness;

	afterEach(function() {
		harness?.unmount();
		harness = null;
	});

	it('renders literal helper text with a stable description id', function() {
		harness = createTestHarness();

		const result = harness.render(HelperText, {
			helperText: 'C diminished seventh',
			id: 'chord-helper',
			localize: false,
		});
		const helper = result.container.querySelector('#chord-helper');

		expect(helper).toBeTruthy();
		expect(helper.textContent).toBe('C diminished seventh');
		expect(helper.getAttribute('aria-live')).toBe('polite');
	});

	it('marks error helper text as assertive', function() {
		harness = createTestHarness();

		const result = harness.render(HelperText, {
			helperText: 'Chord not recognized',
			localize: false,
			status: 'error',
		});
		const helper = result.container.querySelector('[role="alert"]');

		expect(helper).toBeTruthy();
		expect(helper.getAttribute('aria-live')).toBe('assertive');
	});

	it('marks warning helper text as polite without an alert role', function() {
		harness = createTestHarness();

		const result = harness.render(HelperText, {
			helperText: 'Chord not recognized yet',
			localize: false,
			status: 'warning',
		});
		const helper = result.container.querySelector('.mn-helper-text-warning');

		expect(helper).toBeTruthy();
		expect(helper.getAttribute('aria-live')).toBe('polite');
		expect(helper.getAttribute('role')).toBe(null);
		expect(helper.classList.contains('Mui-error')).toBe(false);
	});

	it('localizes phrase-based helper text', function() {
		const localize = {
			getLocale() {
				return 'en-US';
			},
			listen() {},
			translate(phrase) {
				return phrase === 'mn.helper' ? 'Localized helper' : '';
			},
			unlisten() {},
		};

		harness = createTestHarness()
			.withService('localize', localize)
			.withContext({ localize });

		const result = harness.render(HelperText, { helperText: 'mn.helper' });

		expect(result.container.textContent).toBe('Localized helper');
	});
});
