import { Player, VerovioConverter } from '@music-i18n/musicxml-player';

export function createMusicXmlPlayer(options) {
	return Player.create({
		...options,
		converter: new VerovioConverter(),
	});
}
