import {
	getDefaultMusicEmbedWidth,
	normalizeMusicEmbedSizing,
} from '../music-object-layout.js';

describe('MusicObjectLayout', function() {
	it('defaults music embed width to the available content width', function() {
		expect(getDefaultMusicEmbedWidth(624)).toBe(624);
	});

	it('falls back to the legacy default width when content width is unavailable', function() {
		expect(getDefaultMusicEmbedWidth(0)).toBe(456);
		expect(getDefaultMusicEmbedWidth(undefined)).toBe(456);
	});

	it('normalizes nominal and layout sizing from one payload', function() {
		expect(normalizeMusicEmbedSizing({
			displayMode: 'staff',
			height: 220,
			scale: 1.5,
			width: 300,
		})).toEqual({
			captionHeight: 0,
			height: 220,
			layoutHeight: 330,
			layoutWidth: 450,
			scale: 1.5,
			width: 300,
		});
	});

	it('defaults omitted music embed scale to one', function() {
		expect(normalizeMusicEmbedSizing({
			displayMode: 'staff',
			height: 220,
			width: 300,
		})).toEqual({
			captionHeight: 0,
			height: 220,
			layoutHeight: 220,
			layoutWidth: 300,
			scale: 1,
			width: 300,
		});
	});
});
