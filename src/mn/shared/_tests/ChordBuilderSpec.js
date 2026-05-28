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

	it('supports text chord quality aliases', function() {
		const diminished = buildKeyboardChordPayload('C diminished7');
		const augmented = buildKeyboardChordPayload('C augmented');

		expect(diminished.isValid).toBeTrue();
		expect(diminished.payload.label).toBe('Cdim7');
		expect(diminished.payload.notes).toEqual(['C4', 'Eb4', 'Gb4', 'Bbb4']);
		expect(augmented.isValid).toBeTrue();
		expect(augmented.payload.label).toBe('Caug');
		expect(augmented.payload.notes).toEqual(['C4', 'E4', 'G#4']);
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

	it('autodetects slash-chord inversion from the bass note', function() {
		const result = buildKeyboardChordPayload('F/A', { inversion: 0 });

		expect(result.isValid).toBeTrue();
		expect(result.payload.label).toBe('F/A');
		expect(result.payload.chordId).toBe('typed:F/A:inv1');
		expect(result.payload.inversion).toBe(1);
		expect(result.payload.notes).toEqual(['A4', 'C5', 'F5']);
	});

	it('allows explicit non-root inversion to override slash-chord inversion', function() {
		const result = buildKeyboardChordPayload('F/A', { inversion: 2 });

		expect(result.isValid).toBeTrue();
		expect(result.payload.inversion).toBe(2);
		expect(result.payload.notes).toEqual(['C4', 'F4', 'A4']);
	});

	it('supports half-diminished chord aliases', function() {
		const circleSlash = buildKeyboardChordPayload('Co/7');
		const slashCircle = buildKeyboardChordPayload('C/o7');
		const formalSymbol = buildKeyboardChordPayload('C\u00f87');

		expect(circleSlash.isValid).toBeTrue();
		expect(circleSlash.payload.label).toBe('Cm7b5');
		expect(circleSlash.payload.notes).toEqual(['C4', 'Eb4', 'Gb4', 'Bb4']);
		expect(slashCircle.payload.notes).toEqual(circleSlash.payload.notes);
		expect(formalSymbol.payload.notes).toEqual(circleSlash.payload.notes);
	});

	it('reports invalid chord input', function() {
		const result = buildKeyboardChordPayload('not a chord');

		expect(result.isValid).toBeFalse();
		expect(result.payload).toBeNull();
		expect(result.error).toBe('Chord not recognized');
	});
});
