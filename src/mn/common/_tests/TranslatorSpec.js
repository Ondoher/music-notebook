import Translator from '../translator.js';

describe('Translator', function() {
	it('translates phrase keys', function() {
		const translator = new Translator({
			phrases: {
				'app.title': 'Music Notebook',
			},
		});

		expect(translator.t('app.title')).toBe('Music Notebook');
	});

	it('replaces named values', function() {
		const translator = new Translator({
			phrases: {
				'greeting': 'Hello %{name}',
			},
		});

		expect(translator.t('greeting', { name: 'Mira' })).toBe('Hello Mira');
	});

	it('uses plural forms from Intl plural rules', function() {
		const translator = new Translator({
			locale: 'en-US-u-ms-ussystem',
			phrases: {
				'objects': {
					one: '%{count} object',
					other: '%{count} objects',
				},
			},
		});

		expect(translator.t('objects', { count: 1 }, 1)).toBe('1 object');
		expect(translator.t('objects', { count: 2 }, 2)).toBe('2 objects');
	});
});
