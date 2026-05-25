import { buildKeyboardChordPayload } from '../chord-builder.js';

describe('ChordBuilder', function() {
	it('builds a keyboard payload from a typed diminished seventh chord', function() {
		const result = buildKeyboardChordPayload('Cdim7');

		expect(result.isValid).toBeTrue();
		expect(result.payload.label).toBe('Cdim7');
		expect(result.payload.chordId).toBe('typed:Cdim7:inv0');
		expect(result.payload.inversion).toBe(0);
		expect(result.payload.notes).toEqual(['C4', 'Eb4', 'Gb4', 'Bbb4']);
	});

	it('builds inverted chord voicings in ascending pitch order', function() {
		const result = buildKeyboardChordPayload('Cdim7', { inversion: 1 });

		expect(result.isValid).toBeTrue();
		expect(result.payload.chordId).toBe('typed:Cdim7:inv1');
		expect(result.payload.inversion).toBe(1);
		expect(result.payload.rootNote).toBe('C5');
		expect(result.payload.notes).toEqual(['Eb4', 'Gb4', 'Bbb4', 'C5']);
	});

	it('stores arpeggiation as a chord specification option', function() {
		const result = buildKeyboardChordPayload('C', { arpeggiate: true });

		expect(result.isValid).toBeTrue();
		expect(result.payload.arpeggiate).toBe(true);
	});

	it('preserves slash-chord note ordering from tonal', function() {
		const result = buildKeyboardChordPayload('F/A');

		expect(result.isValid).toBeTrue();
		expect(result.payload.label).toBe('F/A');
		expect(result.payload.notes).toEqual(['A4', 'C5', 'F5']);
	});

	it('reports invalid chord input', function() {
		const result = buildKeyboardChordPayload('not a chord');

		expect(result.isValid).toBeFalse();
		expect(result.payload).toBeNull();
		expect(result.error).toBe('Chord not recognized');
	});
});
