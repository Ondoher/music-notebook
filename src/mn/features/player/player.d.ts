/** Result returned after playback starts. */
type PlayerPlayResult = {
	/** Playback duration reported by the underlying player. */
	duration: number;
	/** Whether playback was superseded or stopped before it started. */
	stopped?: boolean;
};

/** Provides MusicXML playback for music embed payloads. */
interface PlayerService {
	/**
	 * Starts playback for a music embed payload.
	 *
	 * @param payload - Music embed payload to play.
	 */
	play(payload: KeyboardPayload): Promise<PlayerPlayResult>;
	/** Stops active playback and releases player resources. */
	stop(): Promise<void>;
}
