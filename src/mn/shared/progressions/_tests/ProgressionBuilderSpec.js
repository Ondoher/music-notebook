import { buildKeyboardProgressionPayload } from '../progression-builder.js';

describe('ProgressionBuilder', function() {
	it('builds a major tonic chord from a Roman numeral', function() {
		const result = buildKeyboardProgressionPayload({ key: 'C', romanNumeral: 'I' });

		expect(result.isValid).toBeTrue();
		expect(result.chordSymbol).toBe('C');
		expect(result.payload.label).toBe('C: I');
		expect(result.payload.progressionId).toBe('typed:C:I');
		expect(result.payload.sourceChordSymbol).toBe('C');
		expect(result.payload.notes).toEqual(['C4', 'E4', 'G4']);
	});

	it('uses Roman numeral case for minor quality', function() {
		const result = buildKeyboardProgressionPayload({ key: 'C', romanNumeral: 'ii' });

		expect(result.isValid).toBeTrue();
		expect(result.chordSymbol).toBe('Dm');
		expect(result.payload.notes).toEqual(['D4', 'F4', 'A4']);
	});

	it('accepts typed key names beyond the dropdown defaults', function() {
		const result = buildKeyboardProgressionPayload({ key: 'Gb', romanNumeral: 'ii' });

		expect(result.isValid).toBeTrue();
		expect(result.chordSymbol).toBe('Abm');
		expect(result.payload.label).toBe('Gb: ii');
		expect(result.payload.notes).toEqual(['Ab4', 'Cb5', 'Eb5']);
	});

	it('supports dominant and diminished suffixes', function() {
		const dominant = buildKeyboardProgressionPayload({ key: 'C', romanNumeral: 'V7' });
		const diminished = buildKeyboardProgressionPayload({ key: 'C', romanNumeral: 'vii\u00b0' });
		const fullyDiminished = buildKeyboardProgressionPayload({ key: 'C', romanNumeral: 'vii\u00b07' });
		const halfDiminished = buildKeyboardProgressionPayload({ key: 'C', romanNumeral: 'vii\u00f87' });

		expect(dominant.chordSymbol).toBe('G7');
		expect(dominant.payload.notes).toEqual(['G4', 'B4', 'D5', 'F5']);
		expect(diminished.chordSymbol).toBe('Bdim');
		expect(diminished.payload.notes).toEqual(['B4', 'D5', 'F5']);
		expect(fullyDiminished.chordSymbol).toBe('Bdim7');
		expect(fullyDiminished.payload.notes).toEqual(['B4', 'D5', 'F5', 'Ab5']);
		expect(halfDiminished.chordSymbol).toBe('Bm7b5');
		expect(halfDiminished.payload.notes).toEqual(['B4', 'D5', 'F5', 'A5']);
	});

	it('supports figured bass inversions on Roman numerals', function() {
		const triadFirstInversion = buildKeyboardProgressionPayload({ key: 'C', romanNumeral: 'I6' });
		const triadSecondInversion = buildKeyboardProgressionPayload({ key: 'C', romanNumeral: 'I64' });
		const seventhFirstInversion = buildKeyboardProgressionPayload({ key: 'C', romanNumeral: 'V65' });
		const seventhSecondInversion = buildKeyboardProgressionPayload({ key: 'C', romanNumeral: 'V43' });
		const seventhThirdInversion = buildKeyboardProgressionPayload({ key: 'C', romanNumeral: 'V42' });

		expect(triadFirstInversion.payload.inversion).toBe(1);
		expect(triadFirstInversion.payload.notes).toEqual(['E4', 'G4', 'C5']);
		expect(triadSecondInversion.payload.inversion).toBe(2);
		expect(triadSecondInversion.payload.notes).toEqual(['G4', 'C5', 'E5']);
		expect(seventhFirstInversion.payload.inversion).toBe(1);
		expect(seventhFirstInversion.payload.notes).toEqual(['B4', 'D5', 'F5', 'G5']);
		expect(seventhSecondInversion.payload.inversion).toBe(2);
		expect(seventhSecondInversion.payload.notes).toEqual(['D4', 'F4', 'G4', 'B4']);
		expect(seventhThirdInversion.payload.inversion).toBe(3);
		expect(seventhThirdInversion.payload.notes).toEqual(['F4', 'G4', 'B4', 'D5']);
	});

	it('allows explicit inversion to override the Roman numeral default', function() {
		const result = buildKeyboardProgressionPayload(
			{ key: 'C', romanNumeral: 'V' },
			{ inversion: 2 },
		);

		expect(result.payload.inversion).toBe(2);
		expect(result.payload.notes).toEqual(['D4', 'G4', 'B4']);
	});

	it('stores arpeggiation as a chord degree option', function() {
		const result = buildKeyboardProgressionPayload(
			{ key: 'C', romanNumeral: 'V' },
			{ arpeggiate: true },
		);

		expect(result.isValid).toBeTrue();
		expect(result.payload.arpeggiate).toBe(true);
	});

	it('supports extended and suspended Roman numeral suffixes', function() {
		const majorSeven = buildKeyboardProgressionPayload({ key: 'C', romanNumeral: 'Imaj7' });
		const minorNine = buildKeyboardProgressionPayload({ key: 'C', romanNumeral: 'ii9' });
		const suspended = buildKeyboardProgressionPayload({ key: 'C', romanNumeral: 'Vsus4' });
		const added = buildKeyboardProgressionPayload({ key: 'C', romanNumeral: 'Vadd9' });
		const augmented = buildKeyboardProgressionPayload({ key: 'C', romanNumeral: 'V+' });

		expect(majorSeven.chordSymbol).toBe('Cmaj7');
		expect(majorSeven.payload.notes).toEqual(['C4', 'E4', 'G4', 'B4']);
		expect(minorNine.chordSymbol).toBe('Dm9');
		expect(minorNine.payload.notes).toEqual(['D4', 'F4', 'A4', 'C5', 'E5']);
		expect(suspended.chordSymbol).toBe('Gsus4');
		expect(suspended.payload.notes).toEqual(['G4', 'C5', 'D5']);
		expect(added.chordSymbol).toBe('Gadd9');
		expect(added.payload.notes).toEqual(['G4', 'B4', 'D5', 'A5']);
		expect(augmented.chordSymbol).toBe('Gaug');
		expect(augmented.payload.notes).toEqual(['G4', 'B4', 'D#5']);
	});

	it('reports invalid Roman numeral input', function() {
		const result = buildKeyboardProgressionPayload({ key: 'C', romanNumeral: 'not roman' });

		expect(result.isValid).toBeFalse();
		expect(result.payload).toBeNull();
		expect(result.error).toBe('Roman numeral not recognized');
	});
});
