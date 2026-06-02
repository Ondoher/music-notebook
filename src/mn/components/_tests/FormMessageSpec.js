import React from 'react';

import FormMessage from '../FormMessage.jsx';
import { createTestHarness } from '../../testing/TestHarness.js';

function makeLocalizeMock() {
	return {
		getLocale() {
			return 'en-US';
		},
		listen() {},
		translate(phrase) {
			return {
				'form.message': 'Saved.',
				'form.html': '<strong>Saved.</strong>',
			}[phrase] || '';
		},
		unlisten() {},
	};
}

describe('FormMessage', function() {
	let harness;

	beforeEach(function() {
		const localize = makeLocalizeMock();

		harness = createTestHarness()
			.withService('localize', localize)
			.withContext({localize});
	});

	afterEach(function() {
		harness?.unmount();
		harness = null;
	});

	it('renders localized alert messages by severity', function() {
		const result = harness.render(FormMessage, {
			message: 'form.message',
			type: 'success',
		});
		const alert = result.container.querySelector('[role="alert"]');

		expect(alert).toBeTruthy();
		expect(alert.textContent).toContain('Saved.');
		expect(alert.className).toContain('MuiAlert-outlinedSuccess');
	});

	it('can render localized html messages', function() {
		const result = harness.render(FormMessage, {
			html: true,
			message: 'form.html',
			type: 'info',
		});

		expect(result.container.querySelector('strong').textContent).toBe('Saved.');
	});
});
