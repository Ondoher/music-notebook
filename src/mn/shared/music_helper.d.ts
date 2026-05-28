/** Builds MusicXML for the supplied keyboard payload and staff notes. */
export function buildMusicXml(payload: KeyboardPayload, staffNotes: StaffNote[]): string;

/** Resolves payload note names into staff-ready notes. */
export function getStaffNotes(
	/** Notes to resolve, usually from the payload. */
	notes?: string[],
	/** Staff octave override. */
	staffOctave?: number,
	/** Payload context used for key spelling and display settings. */
	payload?: Partial<KeyboardPayload>,
): StaffNote[];

/** Returns the MusicXML fifths value for the payload key signature. */
export function getPayloadKeyFifths(payload: Partial<KeyboardPayload>): number;

/** Gets the effective key used for keyboard note labels. */
export function getEffectivePayloadKey(payload: Partial<KeyboardPayload>): string;

/** Applies the payload enharmonic preference to a key name. */
export function getEffectiveKeyName(key: string, payload: Partial<KeyboardPayload>): string;

/** Gets the enharmonic key option for an unsupported key spelling. */
export function getEnharmonicKeyOption(key: string): string;

/** Gets the most useful key value from a payload. */
export function getPayloadKey(payload: Partial<KeyboardPayload>): string;

/** Checks whether the payload should use an enharmonic key spelling. */
export function isUsingEnharmonicKey(payload: Partial<KeyboardPayload>): boolean;

/** Normalizes key names to leading uppercase spelling. */
export function normalizeKeyName(key: string): string;

/** Normalizes a staff octave field value into the supported range. */
export function normalizeStaffOctave(staffOctave: string | number): number;

/** Builds major-key note labels by pitch class. */
export function getMajorKeyLabelsByPitchClass(displayKey?: string): Map<number, string>;

/** Converts a note name to a MIDI number. */
export function noteToMidi(note: string): number | null;
