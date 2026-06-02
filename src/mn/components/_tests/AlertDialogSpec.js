import React from 'react';
import { act } from 'react';

import AlertDialog from '../AlertDialog.jsx';
import { createTestHarness } from '../../testing/TestHarness.js';

function makeLocalizeMock() {
	return {
		getLocale() {
			return 'en-US-u-ms-ussystem';
		},
		listen() {},
		translate(phrase) {
			return {
				'alert.title': 'Confirm',
				'alert.content': 'Are you sure?',
				'common.cancel': 'Cancel',
				'common.delete': 'Delete',
				'common.close': 'Close',
			}[phrase] || '';
		},
		unlisten() {},
	};
}

function getButtonByText(text) {
	return Array.from(document.body.querySelectorAll('.alert-dialog button'))
		.find((button) => button.textContent.trim() === text);
}

describe('AlertDialog', function() {
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

	it('renders localized alert content and reports primary and secondary actions', function() {
		let primary = false;
		let secondary = false;

		harness.render(AlertDialog, {
			content: 'alert.content',
			onPrimary() {
				primary = true;
			},
			onSecondary() {
				secondary = true;
			},
			primaryText: 'common.delete',
			secondaryText: 'common.cancel',
			title: 'alert.title',
		});

		expect(document.body.querySelector('.alert-dialog').textContent).toContain('Confirm');
		expect(document.body.querySelector('.alert-dialog').textContent).toContain('Are you sure?');

		act(() => {
			getButtonByText('Cancel').dispatchEvent(new MouseEvent('click', {bubbles: true}));
		});

		act(() => {
			getButtonByText('Delete').dispatchEvent(new MouseEvent('click', {bubbles: true}));
		});

		expect(secondary).toBeTrue();
		expect(primary).toBeTrue();
	});
});
