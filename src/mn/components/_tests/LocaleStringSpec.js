import React from 'react';
import LocaleString from '../LocaleString.jsx';
import { createTestHarness } from '../../testing/TestHarness.js';

function makeLocalizeMock(overrides = {}) {
	return {
		getLocale() {
			return 'en-US-u-ms-ussystem';
		},
		listen() {},
		translate(phrase) {
			if (phrase === 'empty') {
				return '';
			}

			if (phrase === 'html_phrase') {
				return '<strong>Hello html</strong>';
			}

			if (phrase === 'greeting') {
				return 'Hello world';
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

describe('LocaleString', function() {
	let harness;

	afterEach(function() {
		harness?.unmount();
		harness = null;
	});

	it('renders a translated phrase from the localize service', function() {
		const localize = makeLocalizeMock();

		harness = createTestHarness()
			.withService('localize', localize)
			.withContext({ localize });

		const result = harness.render(LocaleString, { phrase: 'greeting' });

		expect(result.container.textContent).toBe('Hello world');
	});

	it('does not subscribe to localization service events', function() {
		const localize = makeLocalizeMock({
			listen: jasmine.createSpy('listen'),
		});

		harness = createTestHarness()
			.withService('localize', localize)
			.withContext({ localize });

		harness.render(LocaleString, { phrase: 'greeting' });

		expect(localize.listen).not.toHaveBeenCalled();
	});

	it('uses the locale-specific translation path when locale is provided', function() {
		const localize = makeLocalizeMock();

		harness = createTestHarness()
			.withService('localize', localize)
			.withContext({ localize });

		const result = harness.render(LocaleString, { phrase: 'greeting', locale: 'es-ES' });

		expect(result.container.textContent).toBe('es-ES:greeting');
	});

	it('parses html output when html is true', function() {
		const localize = makeLocalizeMock();

		harness = createTestHarness()
			.withService('localize', localize)
			.withContext({ localize });

		const result = harness.render(LocaleString, {
			phrase: 'html_phrase',
			html: true,
		});

		expect(result.container.querySelector('strong').textContent).toBe('Hello html');
	});

	it('suppresses output when hideEmpty is true and translation is empty', function() {
		const localize = makeLocalizeMock();

		harness = createTestHarness()
			.withService('localize', localize)
			.withContext({ localize });

		const result = harness.render(LocaleString, {
			phrase: 'empty',
			hideEmpty: true,
		});

		expect(result.container.textContent).toBe('');
		expect(result.container.children.length).toBe(0);
	});

	it('reports missing translations without disrupting rendering', function() {
		const localize = makeLocalizeMock();
		spyOn(console, 'error');

		harness = createTestHarness()
			.withService('localize', localize)
			.withContext({ localize });

		const result = harness.render(LocaleString, {
			phrase: 'missing_phrase',
		});

		expect(result.container.textContent).toBe('missing_phrase');
		expect(console.error).toHaveBeenCalledWith('Missing translation for phrase "missing_phrase".');
	});

	it('reports when no localization service is available', function() {
		const component = new LocaleString({ phrase: 'missing_phrase' });
		spyOn(console, 'error');

		expect(component.getTranslation()).toBe('');
		expect(console.error).toHaveBeenCalledWith('LocaleString cannot render without a localize service.');
	});
});
