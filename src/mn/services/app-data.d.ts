/** Stores watched app-level values shared across independent React roots. */
interface AppDataService {
	/** Registers a watched value and returns its current value. */
	watch(name: string, defaultValue?: unknown): unknown;
	/** Returns a watched value. */
	get(name: string, defaultValue?: unknown): unknown;
	/** Updates a watched value and notifies subscribers. */
	update(name: string, value: unknown): void;
	/** Returns a shallow snapshot of all watched values. */
	getSnapshot?(): Record<string, unknown>;
	/** Subscribes to watched-data events. */
	listen?: (eventName: string, listener: (...args: any[]) => void) => unknown;
	/** Removes a watched-data event subscription. */
	unlisten?: (eventName: string, listener: unknown) => void;
}
