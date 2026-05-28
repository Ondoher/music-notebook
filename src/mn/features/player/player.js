import { Service } from '@polylith/core';
import { load } from '@polylith/loader';
import { buildMusicXml, getStaffNotes } from '../../shared/music_helper.js';

/**
 * Provides MusicXML playback for music embed payloads.
 */
export default class PlayerService extends Service {
	constructor(registry) {
		super('player', registry);
		this.implement(['play', 'stop']);
		this.playback = null;
		this.playbackToken = 0;
	}

	/**
	 * Creates a hidden MusicXML player.
	 *
	 * @param {KeyboardPayload} payload - Music embed payload to play.
	 * @returns {Promise<{container: HTMLElement, player: unknown}>}
	 */
	async createPlayback(payload) {
		const staffNotes = getStaffNotes(payload.highlightedNotes || payload.notes, payload.staffOctave ?? 4, payload);
		const musicXml = buildMusicXml(payload, staffNotes);
		const container = document.createElement('div');

		container.className = 'music-xml-playback-host';
		document.body.appendChild(container);

		try {
			const { createMusicXmlPlayer } = await load('musicxml-player');
			const player = await createMusicXmlPlayer({
				container,
				followCursor: false,
				horizontal: true,
				musicXml,
				renderer: this.createNoopRenderer(),
				repeat: 0,
			});

			return { container, player };
		} catch (error) {
			container.remove();
			throw error;
		}
	}

	/**
	 * Destroys playback resources.
	 *
	 * @param {{container?: HTMLElement, player?: unknown} | null | undefined} [playback] - Playback resources to destroy.
	 * @returns {void}
	 */
	destroyPlayback(playback = this.playback) {
		if (!playback) {
			return;
		}

		if (playback === this.playback) {
			this.playback = null;
		}

		try {
			playback.player?.destroy?.();
		} finally {
			playback.container?.remove?.();
		}
	}

	/**
	 * Creates a minimal renderer required by the MusicXML player API.
	 *
	 * @returns {Record<string, unknown>}
	 */
	createNoopRenderer() {
		return {
			destroy() {},
			initialize() {
				return Promise.resolve();
			},
			moveTo() {},
			onEvent() {},
			onResize() {},
			version: 'music-notebook-noop-renderer',
		};
	}

	/**
	 * Starts playback for a music embed payload.
	 *
	 * @param {KeyboardPayload} payload - Music embed payload to play.
	 * @returns {Promise<PlayerPlayResult>}
	 */
	async play(payload) {
		const token = this.playbackToken + 1;
		this.playbackToken = token;
		this.destroyPlayback();

		const playback = await this.createPlayback(payload);

		if (this.playbackToken !== token) {
			this.destroyPlayback(playback);
			return { duration: 0, stopped: true };
		}

		this.playback = playback;
		playback.player?.play?.();

		return {
			duration: Number(playback.player?.duration) || 0,
			stopped: false,
		};
	}

	/**
	 * Stops active playback and releases player resources.
	 *
	 * @returns {Promise<void>}
	 */
	async stop() {
		this.playbackToken += 1;
		this.destroyPlayback();
	}
}

new PlayerService();
