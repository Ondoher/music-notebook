/** Primitive option value accepted by localized select-like controls. */
type SelectOptionValue = string | number;

/** Row count value accepted by MUI multiline text fields. */
type TextFieldRowCount = number | string;

/**
 * Visual priority for the shared button component.
 *
 * - **primary** - Uses the primary action styling.
 * - **secondary** - Uses the secondary action styling.
 */
type ButtonVariant = 'primary' | 'secondary';

/**
 * Size options for the shared button component.
 *
 * - **small** - Uses compact button spacing and type.
 * - **large** - Uses prominent button spacing and type.
 */
type ButtonSize = 'small' | 'large';

/** Option descriptor used by localized select-like controls. */
type SelectOption<Value extends SelectOptionValue = string> = {
	/** Stable option value submitted by the control. */
	value: Value;
	/** Visible option label, localized when requested by the component. */
	label: LocalizedText;
	/** Fallback text used when the localized label is unavailable. */
	fallback?: string;
	/** Accessible label override for icon-only or abbreviated options. */
	ariaLabel?: LocalizedText;
	/** Whether the option is unavailable for selection. */
	disabled?: boolean;
	/** Whether a visual separator should be rendered before this option. */
	dividerBefore?: boolean;
	/** Extra implementation-specific props forwarded to the rendered option. */
	props?: Record<string, unknown>;
};

/** Chord inversion choice shown in chord editors. */
type InversionOption = {
	/** Numeric inversion index, where zero is root position. */
	value: number;
	/** Human-readable label for the inversion. */
	label: string;
	/** Translation key for the inversion label. */
	phrase: string;
};

/**
 * Visual representation mode for a music embed.
 *
 * - **keyboard** - Renders notes on the piano keyboard view.
 * - **staff** - Renders notes on the staff notation view.
 */
type KeyboardDisplayMode = 'keyboard' | 'staff';

/**
 * Harmonic key mode used when resolving numeric chord degrees.
 *
 * - **major** - Resolves numeric chord degrees using major-key defaults.
 * - **minor** - Resolves numeric chord degrees using minor-key defaults.
 */
type KeyMode =
	| 'major'
	| 'minor'
	| 'harmonic-minor'
	| 'major-pentatonic'
	| 'minor-pentatonic'
	| 'major-blues'
	| 'minor-blues'
	| 'ionian'
	| 'dorian'
	| 'phrygian'
	| 'lydian'
	| 'mixolydian'
	| 'aeolian'
	| 'locrian';

/**
 * Auto-detected chord text input kind.
 *
 * - **empty** - No meaningful chord text has been entered.
 * - **chordName** - Input is resolved as a direct chord name, such as `Cdim7`.
 * - **romanDegree** - Input is resolved as a Roman numeral chord degree, such as `ii` or `V7`.
 * - **numberDegree** - Input is resolved as a numeric chord degree, such as `2`.
 */
type ChordTextInputKind = 'empty' | 'chordName' | 'romanDegree' | 'numberDegree';

/** Options used when resolving chord text into a music build result. */
type ChordTextResolveOptions = {
	/** Whether playback should arpeggiate notes. */
	arpeggiate?: boolean;
	/** Numeric chord inversion index. */
	inversion?: number;
};

/** Resolved chord text state emitted by ChordText. */
type ChordTextChange = {
	/** Auto-detected input kind. */
	inputKind: ChordTextInputKind;
	/** Resolved music build result for the current text and key context. */
	result: MusicBuildResult;
	/** Raw text field value. */
	value: string;
};

/**
 * Scale type values supported by scale input.
 *
 * - **major** - Builds a major scale.
 * - **minor** - Builds a natural minor scale.
 * - **harmonic-minor** - Builds a harmonic minor scale.
 * - **major-pentatonic** - Builds a major pentatonic scale.
 * - **minor-pentatonic** - Builds a minor pentatonic scale.
 * - **major-blues** - Builds a major blues scale.
 * - **minor-blues** - Builds a minor blues scale.
 */
type ScaleTypeValue = 'major' | 'minor' | 'harmonic-minor' | 'major-pentatonic' | 'minor-pentatonic' | 'major-blues' | 'minor-blues';

/**
 * Edit panel shown by the music embed dialog.
 *
 * - **none** - Shows shared display settings without a builder panel.
 * - **chord** - Shows chord editing controls, including chord degree entry.
 * - **scale** - Shows scale editing controls.
 */
type MusicEmbedEditMode = 'none' | 'chord' | 'scale';

/** Caption template stored with a music embed. */
type MusicEmbedCaption = {
	/** User-authored caption template. May include context-aware tokens such as `{{short}}`, `{{long}}`, and `{{key}}`. */
	template: string;
};

/** Formatting choices for a music embed caption. */
type MusicEmbedCaptionFormat = {
	alignment: 'left' | 'center' | 'right';
	bold: boolean;
	fontSize: number;
	italic: boolean;
	styleId?: string;
	underline: boolean;
};

/** Formatting choices for a music embed object. */
type MusicEmbedFormat = {
	alignment: 'left' | 'center' | 'right';
	caption: MusicEmbedCaptionFormat;
};

/** Serializable music embed payload used by Quill and editor components. */
type KeyboardPayload = {
	/** Stable embed identifier. */
	id?: string;
	/** Display label for the embed. */
	label: string;
	/** Notes represented by the embed, generally including octave. */
	notes: string[];
	/** Whether the embed is currently shown as keyboard or staff. */
	displayMode?: KeyboardDisplayMode;
	/** Optional user-authored caption template. */
	caption?: MusicEmbedCaption;
	/** Optional object and caption formatting. */
	format?: MusicEmbedFormat;
	/** Key used for spelling and display. */
	displayKey?: string;
	/** Major/minor mode paired with displayKey. */
	displayKeyMode?: KeyMode;
	/** Source chord identifier or symbol used to rebuild the embed. */
	chordId?: string;
	/** Source scale identifier used to rebuild the embed. */
	scaleId?: string;
	/** Source progression identifier used to rebuild the embed. */
	progressionId?: string;
	/** Raw progression field value, including numeric degree input. */
	progressionInput?: string;
	/** Resolved chord symbol used when returning from degree editing. */
	sourceChordSymbol?: string;
	/** Root note for chord or scale construction. */
	rootNote?: string;
	/** Notes that should be visually emphasized. */
	highlightedNotes?: string[];
	/** Numeric chord inversion index. */
	inversion?: number;
	/** Whether playback should arpeggiate notes. */
	arpeggiate?: boolean;
	/** Whether the enharmonic display key should be preferred. */
	useEnharmonicKey?: boolean;
	/** Whether keyboard note labels are visible. */
	keyboardShowNoteNames?: boolean;
	/** Octave used when rendering notes on a staff. */
	staffOctave?: number;
	/** First keyboard note shown in the rendered range. */
	firstNote?: string;
	/** Last keyboard note shown in the rendered range. */
	lastNote?: string;
	/** Persisted embed width in pixels. */
	width?: number;
	/** Persisted embed height in pixels. */
	height?: number;
	/** Whether the editor should open immediately for this payload. */
	openEditor?: boolean;
};

/** Result returned by chord, scale, and progression builders. */
type MusicBuildResult<Payload extends KeyboardPayload = KeyboardPayload> = {
	/** Validation or build error message. */
	error: string;
	/** Whether the builder input resolved successfully. */
	isValid: boolean;
	/** Built embed payload, or null when input is invalid. */
	payload: Payload | null;
	/** Raw user input that produced the result. */
	input?: string;
	/** Numeric inversion selected for the result. */
	inversion?: number;
	/** Tonal chord metadata used to build the payload. */
	chord?: {
		/** Chord display name from the theory library. */
		name?: string;
		/** Chord notes returned by the theory library. */
		notes: string[];
		/** Additional theory-library chord fields. */
		[key: string]: unknown;
	};
	/** Tonal scale metadata used to build the payload. */
	scale?: {
		/** Scale display name from the theory library. */
		name?: string;
		/** Scale notes returned by the theory library. */
		notes: string[];
		/** Additional theory-library scale fields. */
		[key: string]: unknown;
	};
	/** Parsed Roman numeral metadata. */
	roman?: Record<string, unknown>;
	/** Resolved chord symbol for the result. */
	chordSymbol?: string;
	/** Roman numeral actually used after normalizing numeric input. */
	effectiveRomanNumeral?: string;
	/** Major/minor key mode used by numeric degree resolution. */
	keyMode?: KeyMode;
};

/** Staff-ready note description derived from a note name. */
type StaffNote = {
	/** Accidental label used for display and MusicXML. */
	accidentalName: string;
	/** MusicXML alter value. */
	alter: number;
	/** MIDI note number. */
	midiNumber: number;
	/** Original or resolved note name. */
	note: string;
	/** Octave number for staff placement. */
	octave: number;
	/** MusicXML step name. */
	step: string;
};

/** Standard React children type for component props. */
type ComponentChildren = React.ReactNode;

/**
 * MUI input variant values supported by base controls.
 *
 * - **filled** - Uses MUI's filled control styling.
 * - **outlined** - Uses MUI's outlined control styling.
 * - **standard** - Uses MUI's standard control styling.
 */
type MuiVariant = 'filled' | 'outlined' | 'standard';

/**
 * MUI size values supported by base controls.
 *
 * - **small** - Uses compact MUI control sizing.
 * - **medium** - Uses default MUI control sizing.
 */
type MuiSize = 'small' | 'medium';

/**
 * MUI margin values supported by base controls.
 *
 * - **dense** - Uses compact vertical spacing.
 * - **none** - Removes MUI form-control margin spacing.
 * - **normal** - Uses default vertical spacing.
 */
type MuiMargin = 'dense' | 'none' | 'normal';

/**
 * MUI color values supported by base form controls.
 *
 * - **primary** - Applies the theme primary color.
 * - **secondary** - Applies the theme secondary color.
 * - **error** - Applies the theme error color.
 * - **info** - Applies the theme info color.
 * - **success** - Applies the theme success color.
 * - **warning** - Applies the theme warning color.
 */
type MuiColor = 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';

/**
 * Base form-control props that are replaced by wrapper-specific behavior.
 *
 * - **onChange** - Replaced by wrapper-specific normalized change handlers.
 * - **variant** - Re-declared by wrappers that expose variant explicitly.
 */
type BaseMuiWrappedControlProp = 'onChange' | 'variant';

/** Shared subset of MUI form-control props exposed by base controls. */
type BaseMuiFormControlProps = {
	/** Theme color applied to the control. */
	color?: MuiColor;
	/** Whether the control is disabled. */
	disabled?: boolean;
	/** Whether the control should render focused styles. */
	focused?: boolean;
	/** Whether the control should fill its container width. */
	fullWidth?: boolean;
	/** Whether the visible label area is hidden. */
	hiddenLabel?: boolean;
	/** MUI margin density for the control. */
	margin?: MuiMargin;
	/** Whether the control is required. */
	required?: boolean;
	/** MUI control size. */
	size?: MuiSize;
	/** MUI system style override. */
	sx?: unknown;
	/** MUI visual variant. */
	variant?: MuiVariant;
};

/** Shared subset of MUI TextField props exposed by TextInput. */
type BaseMuiTextFieldProps = BaseMuiFormControlProps & {
	/** Whether the input should receive focus on mount. */
	autoFocus?: boolean;
	/** Initial uncontrolled value. */
	defaultValue?: unknown;
	/** Whether the input is disabled. */
	disabled?: boolean;
	/** Whether the input should render error styles. */
	error?: boolean;
	/** Whether the input should fill its container width. */
	fullWidth?: boolean;
	/** DOM id for the input. */
	id?: string;
	/** Ref forwarded to the underlying input. */
	inputRef?: unknown;
	/** Maximum row count for multiline input. */
	maxRows?: TextFieldRowCount;
	/** Minimum row count for multiline input. */
	minRows?: TextFieldRowCount;
	/** Whether the input accepts multiple lines. */
	multiline?: boolean;
	/** Form field name. */
	name?: string;
	/** Blur event handler from the underlying input. */
	onBlur?: (event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
	/** Change event handler from the underlying input. */
	onChange?: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
	/** Focus event handler from the underlying input. */
	onFocus?: (event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
	/** Placeholder text for empty input. */
	placeholder?: string;
	/** Whether the input is required. */
	required?: boolean;
	/** Fixed row count for multiline input. */
	rows?: TextFieldRowCount;
	/** HTML input type. */
	type?: string;
	/** Controlled input value. */
	value?: unknown;
};

/** Shared subset of MUI Select props exposed by BaseSelect. */
type BaseMuiSelectProps<Value extends SelectOptionValue = string> = {
	/** Whether the select should receive focus on mount. */
	autoFocus?: boolean;
	/** Whether the menu opens by default when uncontrolled. */
	defaultOpen?: boolean;
	/** Initial uncontrolled select value. */
	defaultValue?: Value;
	/** Whether the select is disabled. */
	disabled?: boolean;
	/** Whether an empty selected value should still render. */
	displayEmpty?: boolean;
	/** Form field name. */
	name?: string;
	/** Whether to render a native select element. */
	native?: boolean;
	/** Controlled open state for the options menu. */
	open?: boolean;
	/** Custom renderer for the selected value. */
	renderValue?: (value: Value) => React.ReactNode;
};

/** Shared subset of MUI Checkbox props exposed by BaseCheckbox. */
type BaseMuiCheckboxProps = {
	/** Controlled checked state. */
	checked?: boolean;
	/** Initial uncontrolled checked state. */
	defaultChecked?: boolean;
	/** Whether the checkbox is disabled. */
	disabled?: boolean;
	/** Whether the checkbox displays an indeterminate state. */
	indeterminate?: boolean;
	/** Form field name. */
	name?: string;
	/** Whether the checkbox is required. */
	required?: boolean;
	/** Submitted checkbox value. */
	value?: unknown;
};

/** Shared subset of MUI Radio props exposed by BaseRadioButtons. */
type BaseMuiRadioProps = {
	/** Controlled checked state. */
	checked?: boolean;
	/** Whether the radio is disabled. */
	disabled?: boolean;
	/** Form field name. */
	name?: string;
	/** Whether the radio is required. */
	required?: boolean;
	/** Submitted radio value. */
	value?: unknown;
};
