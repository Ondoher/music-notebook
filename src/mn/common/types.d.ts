/** Locale identifier used by the localization engine. */
type LocalizationLocale = string;

/** Primitive value accepted by translation replacement maps. */
type LocalizedReplacementValue = string | number;

/** Named replacement values applied when translating a phrase. */
type LocalizationReplacementMap = Record<string, LocalizedReplacementValue>;

/** Translatable phrase request used by localization-aware code. */
type LocalizedPhrase = {
	/** Translation key to resolve. */
	phrase: string;
	/** Text to show when the phrase is unavailable. */
	fallback?: string;
	/** Named replacement values passed to the translator. */
	replacements?: LocalizationReplacementMap;
	/** Cardinal value used for plural selection. */
	cardinal?: number;
	/** Locale override for this single phrase. */
	locale?: LocalizationLocale;
};

/** Text that may be provided literally or as a translation request. */
type LocalizedText = string | LocalizedPhrase;

/** Localization service contract available through MusicNotebookContext. */
type LocalizeService = {
	/** Returns the currently active locale code. */
	getLocale: () => string;
	/** Subscribes to localization events. */
	listen?: (eventName: string, listener: (...args: any[]) => void) => unknown;
	/** Removes a localization event subscription. */
	unlisten?: (eventName: string, listener: unknown) => void;
	/** Translates a phrase in the active locale. */
	translate?: (phrase: string, replacements?: LocalizationReplacementMap, cardinal?: number) => string;
	/** Translates a phrase in a specific locale. */
	translateLocale?: (locale: string, phrase: string, replacements?: LocalizationReplacementMap, cardinal?: number) => string;
	/** Translates a localized markdown document in the active locale. */
	translateMarkdown?: (name: string, replacements?: LocalizationReplacementMap) => Promise<string>;
};

/** Cardinal plural rule names accepted in phrase maps. */
type LocalizationPluralRule = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';

/** Phrase value stored in flattened localization maps. */
type LocalizationPhraseValue = string | number | Partial<Record<LocalizationPluralRule, string>>;

/** Nested or flattened phrase map loaded into the localization engine. */
type LocalizationPhraseMap = Record<string, LocalizationPhraseValue | LocalizationPhraseMap>;

/** Flattened phrase map stored by one translator. */
type LocalizationFlatPhraseMap = Record<string, LocalizationPhraseValue>;

/** Date field name returned when resolving locale-specific date order. */
type LocalizationDatePart = 'month' | 'day' | 'date' | 'year';

/** Ordered date fields for the active locale. */
type LocalizationDateOrder = [LocalizationDatePart, LocalizationDatePart, LocalizationDatePart];

/** Event name emitted when localization state changes. */
type LocalizationEventName = 'changeLocale' | 'updated';

/** Event emitter supplied by the service wrapper around the localization engine. */
type LocalizationEventEmitter = (eventName: LocalizationEventName, ...args: unknown[]) => void;

/** Callback invoked for phrase keys matching a search expression. */
type LocalizationFindKeyCallback = (key: string, match: RegExpMatchArray) => void;

/** Options used when creating a locale translator. */
type TranslatorOptions = {
	/** Phrase map loaded into the translator. */
	phrases?: LocalizationPhraseMap;
	/** Locale identifier used for plural rules and language helpers. */
	locale?: LocalizationLocale;
};

/** Runtime classification of object phrase values. */
type TranslatorCardinalRuleCheck = (object: Record<string, unknown>) => boolean;

/** Value accepted by the plain localized-text resolver. */
type LocalizedTextResolverValue = LocalizedText | null | undefined | false;
