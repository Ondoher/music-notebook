import { makeEventable } from '@polylith/core';

/**
 * Owns controller behavior for one rendered music object embed.
 */
export default class MusicObjectEmbedSession {
	constructor(controller, options = {}) {
		makeEventable(this);

		this.controller = controller;
		this.options = options;
		this.playback = {
			timer: null,
			token: 0,
		};
		this.state = {
			dialogOpen: options.initialDialogOpen === true,
			hovered: false,
			playbackState: 'idle',
			selected: false,
		};
	}

	getState() {
		return {
			...this.state,
			actions: this.getActions(),
		};
	}

	fireChanged() {
		this.fire('changed', this.getState());
	}

	setState(patch = {}) {
		this.state = {
			...this.state,
			...patch,
		};
		this.fireChanged();
	}

	getActions() {
		const isPlaying = this.state.playbackState === 'playing';
		const actions = [
			{
				id: 'edit',
				className: 'music-keyboard-edit-button',
				fallback: 'Edit',
				iconId: 'music-object.edit',
				labelKey: 'music.controls.edit',
			},
			{
				id: 'format',
				className: 'music-keyboard-format-button',
				fallback: 'Format',
				iconId: 'music-object.format',
				labelKey: 'music.controls.format',
			},
		];

		if (!isPayloadPlayable(this.options.getValue?.())) {
			return actions;
		}

		return [
			{
				id: 'playback',
				className: 'music-keyboard-play-button',
				disabled: this.state.playbackState === 'loading',
				fallback: isPlaying ? 'Stop' : 'Play',
				iconId: isPlaying ? 'music-object.stop' : 'music-object.play',
				labelKey: isPlaying ? 'music.controls.stop' : 'music.controls.play',
				pressed: isPlaying,
			},
			...actions,
		];
	}

	setHovered(hovered) {
		this.setState({ hovered: hovered === true });
	}

	setSelected(selected) {
		this.setState({ selected: selected === true });
	}

	performAction(actionId) {
		if (actionId === 'playback') {
			if (!isPayloadPlayable(this.options.getValue?.())) {
				return false;
			}

			this.togglePlayback();
			return true;
		}

		if (actionId === 'edit') {
			this.options.onOpenDialog?.();
			this.setState({ dialogOpen: true });
			return true;
		}

		if (actionId === 'format') {
			this.options.onOpenFormatDialog?.();
			return true;
		}

		return false;
	}

	closeDialog() {
		this.setState({ dialogOpen: false });
	}

	async togglePlayback() {
		if (this.state.playbackState === 'playing') {
			this.stopPlayback();
			this.setState({ playbackState: 'idle' });
			return;
		}

		if (this.state.playbackState === 'loading') {
			return;
		}

		this.setState({ playbackState: 'loading' });
		this.stopPlayback(false);

		const playerService = this.controller.getPlayerService();

		if (!playerService) {
			console.warn('[MusicObjectEmbedSession] Player service is unavailable.');
			this.setState({ playbackState: 'idle' });
			return;
		}

		const token = this.playback.token + 1;
		this.playback.token = token;

		try {
			const playback = await playerService.play(this.options.getValue?.());

			if (this.playback.token !== token) {
				return;
			}

			this.setState({ playbackState: 'playing' });

			this.playback.timer = window.setTimeout(() => {
				if (this.playback.token === token) {
					this.stopPlayback(false);
					this.setState({ playbackState: 'idle' });
				}
			}, Math.max(playback.duration || 0, 250) + 250);
		} catch (error) {
			console.warn('[MusicObjectEmbedSession] MusicXML playback failed.', error);
			this.stopPlayback(false);
			this.setState({ playbackState: 'idle' });
		}
	}

	stopPlayback(stopPlayer = true) {
		this.playback.token += 1;

		if (this.playback.timer) {
			window.clearTimeout(this.playback.timer);
			this.playback.timer = null;
		}

		if (stopPlayer) {
			this.controller.getPlayerService()?.stop?.();
		}
	}

	detach() {
		this.stopPlayback();
		this.eventBus.listeners = {};
	}
}

function isPayloadPlayable(payload) {
	return Array.isArray(payload?.notes) && payload.notes.length > 0;
}
