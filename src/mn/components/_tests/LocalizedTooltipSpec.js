import React from 'react';
import LocalizedTooltip from '../LocalizedTooltip.jsx';
import { createTestHarness } from '../../testing/TestHarness.js';

function makeLocalizeMock(overrides = {}) {
	return {
		getLocale() {
			return 'en-US-u-ms-ussystem';
		},
		listen() {},
		translate(phrase) {
			if (phrase === 'tooltip.greeting') {
				return 'Hello tooltip';
			}

			return '';
		},
		translateLocale(locale, phrase) {
			return `${locale}:${phrase}`;
		},
		unlisten() {},
		...overrides,
	};
}

describe('LocalizedTooltip', function() {
	let harness;

	afterEach(function() {
		harness?.unmount();
		harness = null;
	});

	it('applies translated tooltip text to the child accessible label', function() {
		const localize = makeLocalizeMock();

		harness = createTestHarness()
			.withService('localize', localize)
			.withContext({ localize });

		const result = harness.render(LocalizedTooltip, {
			phrase: 'tooltip.greeting',
			labelChild: true,
			children: <span className="tooltip-target" tabIndex={0} />,
		});
		const target = result.container.querySelector('.tooltip-target');

		expect(target.getAttribute('aria-label')).toBe('Hello tooltip');
	});

	it('does not subscribe to localization service events', function() {
		const localize = makeLocalizeMock({
			listen: jasmine.createSpy('listen'),
		});

		harness = createTestHarness()
			.withService('localize', localize)
			.withContext({ localize });

		harness.render(LocalizedTooltip, {
			phrase: 'tooltip.greeting',
			children: <span className="tooltip-target" tabIndex={0} />,
		});

		expect(localize.listen).not.toHaveBeenCalled();
	});
});
