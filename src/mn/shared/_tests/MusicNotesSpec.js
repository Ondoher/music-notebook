import {
	normalizeAscendingNotes,
	normalizeNoteName,
	noteToMidi,
} from '../music-notes.js';

describe('MusicNotes', function() {
	it('normalizes octave-less notes with a fallback octave', function() {
		expect(normalizeNoteName('Bb', 4)).toBe('Bb4');
		expect(normalizeNoteName('C#5', 4)).toBe('C#5');
	});

	it('normalizes pitch sequences so they ascend from the root octave', function() {
		expect(normalizeAscendingNotes(['D', 'E', 'F', 'G', 'A', 'B', 'C'], 4))
			.toEqual(['D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5']);
		expect(normalizeAscendingNotes(['Bb', 'C', 'D', 'Eb', 'F', 'G', 'A'], 4))
			.toEqual(['Bb4', 'C5', 'D5', 'Eb5', 'F5', 'G5', 'A5']);
	});

	it('uses one parser for midi conversion across ascii and symbol accidentals', function() {
		expect(noteToMidi('C#4')).toBe(noteToMidi('C\u266f4'));
		expect(noteToMidi('Bbb4')).toBe(noteToMidi('A4'));
	});
});
