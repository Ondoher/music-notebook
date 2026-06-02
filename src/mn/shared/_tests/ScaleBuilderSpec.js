import { buildKeyboardScalePayload } from '../scale-builder.js';

describe('ScaleBuilder', function() {
	it('builds a major scale keyboard payload', function() {
		const result = buildKeyboardScalePayload({ key: 'D', scaleType: 'major' });

		expect(result.isValid).toBeTrue();
		expect(result.payload.label).toBe('D major');
		expect(result.payload.rootNote).toBe('D4');
		expect(result.payload.notes).toEqual(['D4', 'E4', 'F#4', 'G4', 'A4', 'B4', 'C#5', 'D5']);
	});

	it('builds the minor scale variants included in the POC', function() {
		const naturalMinor = buildKeyboardScalePayload({ key: 'A', scaleType: 'minor' });
		const harmonicMinor = buildKeyboardScalePayload({ key: 'A', scaleType: 'harmonic-minor' });

		expect(naturalMinor.payload.label).toBe('A minor');
		expect(harmonicMinor.payload.notes).toEqual(['A4', 'B4', 'C5', 'D5', 'E5', 'F5', 'G#5', 'A5']);
	});

	it('builds pentatonic scale payloads', function() {
		const majorPentatonic = buildKeyboardScalePayload({ key: 'C', scaleType: 'major-pentatonic' });
		const minorPentatonic = buildKeyboardScalePayload({ key: 'A', scaleType: 'minor-pentatonic' });

		expect(majorPentatonic.payload.notes).toEqual(['C4', 'D4', 'E4', 'G4', 'A4', 'C5']);
		expect(minorPentatonic.payload.notes).toEqual(['A4', 'C5', 'D5', 'E5', 'G5', 'A5']);
	});

	it('builds blues scale payloads', function() {
		const majorBlues = buildKeyboardScalePayload({ key: 'C', scaleType: 'major-blues' });
		const minorBlues = buildKeyboardScalePayload({ key: 'C', scaleType: 'minor-blues' });

		expect(majorBlues.payload.label).toBe('C major blues');
		expect(majorBlues.payload.notes).toEqual(['C4', 'D4', 'Eb4', 'E4', 'G4', 'A4', 'C5']);
		expect(minorBlues.payload.label).toBe('C minor blues');
		expect(minorBlues.payload.notes).toEqual(['C4', 'Eb4', 'F4', 'Gb4', 'G4', 'Bb4', 'C5']);
	});

	it('builds mode payloads from key quality', function() {
		const result = buildKeyboardScalePayload({
			key: 'D',
			keyMode: 'dorian',
		});

		expect(result.isValid).toBeTrue();
		expect(result.payload.label).toBe('D dorian');
		expect(result.payload.displayKeyMode).toBe('dorian');
		expect(result.payload.notes).toEqual(['D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5']);
	});

	it('accepts typed key names beyond the dropdown defaults', function() {
		const result = buildKeyboardScalePayload({ key: 'C#', scaleType: 'major' });

		expect(result.isValid).toBeTrue();
		expect(result.payload.label).toBe('C# major');
		expect(result.payload.rootNote).toBe('C#4');
		expect(result.payload.notes).toEqual(['C#4', 'D#4', 'E#4', 'F#4', 'G#4', 'A#4', 'B#4', 'C#5']);
	});
});
