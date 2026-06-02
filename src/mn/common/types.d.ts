/** Application metadata made available through MusicNotebookContext. */
type MusicNotebookAppContext = {
	/** Stable application id. */
	id?: string;
	/** Additional app-level metadata. */
	[key: string]: unknown;
};

/** Localization service contract available through MusicNotebookContext. */
type LocalizeService = {
	/** Returns the currently active locale code. */
	getLocale: () => string;
	/** Subscribes to localization events. */
	listen?: (eventName: string, listener: (...args: any[]) => void) => unknown;
	/** Removes a localization event subscription. */
	unlisten?: (eventName: string, listener: unknown) => void;
	/** Translates a phrase in the active locale. */
	translate?: (phrase: string, replacements?: Record<string, LocalizedReplacementValue>, cardinal?: number) => string;
	/** Translates a phrase in a specific locale. */
	translateLocale?: (locale: string, phrase: string, replacements?: Record<string, LocalizedReplacementValue>, cardinal?: number) => string;
	/** Translates a localized markdown document in the active locale. */
	translateMarkdown?: (name: string, replacements?: Record<string, LocalizedReplacementValue>) => Promise<string>;
};

/** Watched app data service shared across independent React roots. */
interface AppDataService {
	/** Returns an existing watched value or stores the supplied default. */
	watch(name: string, defaultValue?: unknown): unknown;
	/** Returns the watched value, or the supplied default when it is not set. */
	get(name: string, defaultValue?: unknown): unknown;
	/** Updates a watched value and notifies subscribers. */
	update(name: string, value: unknown): void;
	/** Returns all watched values as a shallow object snapshot. */
	getSnapshot?(): Record<string, unknown>;
	/** Subscribes to watched-data events. */
	listen?: (eventName: string, listener: (...args: any[]) => void) => unknown;
	/** Removes a watched-data event subscription. */
	unlisten?: (eventName: string, listener: unknown) => void;
}

/** Service registry contract available through MusicNotebookContext. */
type RegistryService = {
	/** Returns the requested named service. */
	subscribe: (serviceName: string) => any;
};

/** React context value shared across Music Notebook presentation components. */
type MusicNotebookContextValue = {
	/** Application metadata. */
	app: MusicNotebookAppContext;
	/** Watched app data service, when one is available. */
	appData?: AppDataService | null;
	/** Localization service, when one is available. */
	localize: LocalizeService | null;
	/** Active locale code. */
	locale: string;
	/** Runtime service registry, when one is available. */
	registry: RegistryService | null;
};

/** Paragraph formatting settings applied through the active editor surface. */
type ParagraphFormatOverrideMap = {
	alignment: boolean;
	bold: boolean;
	fontSize: boolean;
	italic: boolean;
	keepWithNext: boolean;
	paddingAfter: boolean;
	paddingBefore: boolean;
	start: boolean;
	underline: boolean;
};

/** Paragraph formatting settings applied through the active editor surface. */
type ParagraphFormatSettings = {
	/** Paragraph alignment, with left represented as the default unset Quill alignment. */
	alignment: 'left' | 'center' | 'right' | 'justify';
	/** Whether paragraph text is bold. */
	bold: boolean;
	/** Paragraph font size in pixels. */
	fontSize: number;
	/** Whether paragraph text is italicized. */
	italic: boolean;
	/** Whether the paragraph should stay on the same page as the following paragraph when paginated. */
	keepWithNext: boolean;
	/** Paragraph padding after, in CSS pixels. */
	paddingAfter: number;
	/** Paragraph padding before, in CSS pixels. */
	paddingBefore: number;
	/** How the paragraph starts relative to previous blocks or page boundaries. */
	start: 'continuous' | 'full-line' | 'next-page';
	/** Document-global paragraph style applied to the paragraph. */
	styleId: string;
	/** Which effective values are direct paragraph overrides rather than inherited values. */
	overrides: ParagraphFormatOverrideMap;
	/** Whether paragraph text is underlined. */
	underline: boolean;
};
