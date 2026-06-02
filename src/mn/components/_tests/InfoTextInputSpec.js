import React from 'react';
import { act } from 'react';

import InfoTextInput from '../InfoTextInput.jsx';
import { createTestHarness } from '../../testing/TestHarness.js';

function makeLocalizeMock() {
	return {
		getLocale() {
			return 'en-US-u-ms-ussystem';
		},
		listen() {},
		translate(phrase) {
			return {
				'common.close': 'Close',
				'field.help': 'Field help',
				'field.info': 'Use this field carefully.',
				'field.label': 'Field',
			}[phrase] || '';
		},
		unlisten() {},
	};
}

describe('InfoTextInput', function() {
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

	it('opens an information dialog from the input affordance', function() {
		harness.render(InfoTextInput, {
			content: 'field.info',
			label: 'field.label',
			name: 'field',
			title: 'field.help',
			value: '',
		});

		const infoButton = document.body.querySelector('button[aria-label="Field help"]');

		expect(infoButton).toBeTruthy();

		act(() => {
			infoButton.dispatchEvent(new MouseEvent('click', {bubbles: true}));
		});

		expect(document.body.querySelector('.info-dialog').textContent).toContain('Use this field carefully.');
	});
});
