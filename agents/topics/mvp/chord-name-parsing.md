# Chord Name Parsing

## Purpose

Track the MVP design for parsing chord text before it is handed to `tonal`.

The app is moving toward one unified chord input that can recognize direct chord names, Roman numeral analysis, and numeric/Nashville-inspired degree input.
That input needs a deliberate parser and normalizer rather than a growing collection of regular-expression aliases.

The same parser should also support inline chord objects in the editor.
For inline chords, the user types an ASCII chord symbol in the document, the editor replaces it with a properly formatted chord object, and the user can later edit it through a small floating editor field.

## Goal

Create a chord parser that can:

- accept common chord-symbol spellings users are likely to type
- normalize those spellings into symbols `tonal` can resolve
- preserve the visible field text the user typed while they are editing
- preserve the user's musical intent when `tonal` accepts only some aliases
- produce a stable stored display label
- produce a friendly helper name for learning and accessibility
- support direct chord roots, Roman numeral roots, and numeric roots with a shared suffix language
- provide enough structured data for both music-object dialog payloads and inline chord objects

`tonal` should remain the music-theory resolver and validator after normalization.
It should not be the only parser for user input.

The parser should not rewrite the visible input while the user is typing.
Normalization is an internal interpretation step.
Canonical display labels can be used after a value is accepted into the music-object payload.

Inline chord conversion is one of those acceptance points.
The typed editor text should remain ordinary text while the user is typing, then be replaced by a structured inline chord object when the editor command or recognition rule accepts it.

## Parser Shape

Most chord specification systems can be treated as:

```text
root specifier + chord suffix/modifiers + optional slash bass
```

The root specifier differs by input system:

- direct chord root: `C`, `F#`, `Bb`
- Roman numeral root: `I`, `ii`, `bVII`
- numeric root: `1`, `2`, `b7`

The suffix/modifier language should be shared where possible:

- quality: major, minor, diminished, half-diminished, augmented
- sevenths: `7`, `maj7`, `M7`, `dim7`
- suspensions: `sus`, `sus2`, `sus4`
- extensions: `9`, `11`, `13`
- alterations: `b5`, `#5`, `b9`, `#9`, `#11`, `b13`
- additions and omissions: `add9`, `no3`
- slash bass: `/E`, `/3`, `/V`

The parser should resolve the root first, normalize the suffix second, then resolve the optional slash bass using the same root system unless the bass is explicitly a note name.

## Normalizer Result

The normalizer should return structured data rather than a bare string.

Example shape:

```js
{
	input: 'CM7aug5',
	inputKind: 'chordName',
	normalized: 'Cmaj7#5',
	display: 'Cmaj7#5',
	friendlyName: 'C augmented major seventh',
	bass: null,
	inversion: 0,
}
```

`normalized` is for `tonal`.
`display` is for payload labels and ids.
`friendlyName` is for helper text and accessible descriptions.
`bass` and `inversion` capture slash-chord meaning after parsing so downstream builders do not need to infer it again from a display string.

When no custom friendly name exists, the app can fall back to `tonal`'s `chord.name` if it is useful.

For a slash chord, the normalized result should preserve both the normalized chord symbol and the resolved bass/inversion:

```js
{
	input: 'C/E',
	inputKind: 'chordName',
	normalized: 'C/E',
	display: 'C/E',
	friendlyName: 'C major over E',
	bass: 'E',
	inversion: 1,
}
```

If the bass does not map to a chord tone, `bass` should still preserve the resolved bass note and `inversion` should remain `0` or `null` until the app decides how to represent non-chord bass tones.

## Tonal Boundary

`tonal` accepts many symbols but does not always provide friendly names for all valid chord types.

For example:

```text
C+7
Caug7
C7#5
```

These resolve to the correct notes, but `tonal` may report a weak friendly name such as `C `.

The app should not treat `tonal`'s friendly name as the only source of truth.
The parser should derive friendly names from the user's chord grammar when that gives a clearer result.

## Labels And Names

The app should keep these concepts separate:

- input text: what the user typed
- normalized symbol: what is sent to `tonal`
- display label: compact stored/rendered chord label, such as `C7#11`
- display style: the formatting policy used to render compact chord labels
- friendly name: readable helper text, such as `C dominant seventh sharp eleven`
- tonal name: `tonal`'s recognized name, such as `C lydian dominant seventh`

For user-facing helper text, prefer the parser-derived friendly name when available because it explains the typed symbol.
Use `tonal` names as a fallback or secondary interpretation.

## Display Style

Chord display style should be separate from chord parsing.

The parser should produce structured chord data and one or more compact display labels.
The renderer should decide how that data appears.

The first useful display styles are:

- `plain`: compact text-style chord symbols such as `Cmaj7#11`, `Cm7b5`, or `Cdim7`
- `jazz`: lead-sheet-style rendering with music symbols and typography such as `Δ`, `ø`, `°`, and superscripted extensions or alterations where appropriate

Plain style is the conservative, text-like display.
It should stay close to common ASCII chord-chart notation so it is easy to read, copy, search, and compare with typed input.

Examples:

```text
Cmaj7
Cm7b5
Cdim7
C7#11
C/G
```

Plain style may still use real accidentals or symbols when the source data calls for them, but it should not depend on specialized music typography.
It is the best default for dense editing surfaces, tests, storage previews, and environments where fonts or superscript rendering may be unreliable.

Jazz style is the polished lead-sheet display.
It may use music-specific symbols, spacing, and vertical positioning to make chord suffixes scan like printed charts.

Examples:

- CΔ<sup>7</sup>
- Cø<sup>7</sup>
- C°<sup>7</sup>
- C<sup>7♯11</sup>
- C/G, with the bass separated but visually subordinate

Jazz style may:

- render major seventh as CΔ<sup>7</sup> instead of `Cmaj7`
- render half-diminished as Cø<sup>7</sup> instead of `Cm7b5`
- render diminished as C° or C°<sup>7</sup>
- superscript extensions such as `7`, `9`, `11`, and `13`
- superscript or stack alterations such as `b9`, `#9`, `#11`, and `b13`
- use chord-symbol-specific font metrics if a suitable font is available

Jazz style should not change the parsed chord meaning.
It is a rendering choice, not a different parser.

In Markdown docs, use raw HTML superscript examples because the renderer supports them:

- CΔ<sup>7</sup>, C<sup>7♯11</sup>, Cø<sup>7</sup>
- Unicode fallbacks such as CΔ⁷, C⁷♯¹¹, and Cø⁷ are acceptable when HTML rendering is unavailable

The preferred default is a global document setting.
Inline chord objects and larger music objects should inherit the document chord display style unless they explicitly carry a local override.

This lets a notebook switch from plain to jazz chord rendering without reparsing or rewriting every inline chord object.
Local overrides should exist only for cases where a specific chord needs a different presentation than the surrounding document.

The durable object data should therefore distinguish:

- parsed chord structure
- source/typed input
- normalized symbol
- compact display label
- inherited or overridden display style

Inline chord objects should use Quill inline embeds so the app controls the rendered DOM.
That means jazz display does not need to be encoded entirely with Unicode characters.
The renderer can build semantic markup from the parsed chord parts and style it with CSS.

Example jazz-rendered inline chord DOM:

```html
<span class="mn-inline-chord" data-chord-id="...">
	<span class="mn-inline-chord-root">C</span>
	<span class="mn-inline-chord-quality">Δ</span>
	<sup class="mn-inline-chord-extension">7</sup>
	<sup class="mn-inline-chord-alteration">♯11</sup>
</span>
```

This gives the app control over:

- superscript positioning
- subscript or visually subordinate bass notation
- stacked alterations
- spacing and chord-symbol font choice
- hover and focus affordances
- accessible labels and descriptions
- copy/paste fallback text

The stored chord object should stay semantic.
Display style should be applied at render time.

Whether the caret can move inside a rendered inline chord is undecided.
The first design can treat the inline chord object as one selectable unit, but final cursor behavior should be decided with the floating editor interaction.
Options include treating the chord as a single character, allowing internal cursor movement through rendered parts, or using single-character selection plus a focused floating text editor for actual editing.

## Direct Chord Examples

The normalizer should support common aliases:

```text
C                 -> C
Cm                -> Cm
Cmin              -> Cm
C-                -> Cm
Cdim              -> Cdim
C diminished      -> Cdim
C°                -> Cdim
Caug              -> Caug
C augmented       -> Caug
C+                -> C+
C7#5              -> C7#5
C7+5              -> C7#5
C7aug5            -> C7#5
C+7               -> C+7
Caug7             -> Caug7
CM7               -> Cmaj7
Cmaj7             -> Cmaj7
CM7#5             -> Cmaj7#5
CM7aug5           -> Cmaj7#5
Cø7               -> Cm7b5
C07               -> Cm7b5
```

Exact canonical display choices can be refined, but the parser should accept these spellings consistently.

Half-diminished support should use standard or externally documented spellings.
`m7b5` is the plain-text standard spelling.
`ø7` is the standard symbolic spelling.
MuseScore also supports `0` for half-diminished, so `C07` may be accepted as a compatibility alias.

The app should not support `o/` or `/o` as half-diminished shortcuts.
Those were considered during early cleanup, but they are not a standard users should have to learn.

## Roman And Numeric Entry

Roman numeral analysis and numeric/Nashville-inspired entry should share the suffix parser with direct chord names.

The root resolver changes:

```text
I7      -> root from Roman degree, suffix 7
iiø7    -> root from Roman degree, suffix half-diminished seventh
5sus4   -> root from numeric degree, suffix sus4
b7maj7  -> altered numeric degree, suffix maj7
```

The current app behavior intentionally differs from strict Nashville Number System in one place:

- selected key quality may influence default chord quality for unqualified numeric degrees

That means numeric `2` in `C major` can resolve differently from numeric `2` in `C minor`.

## Optional Key Quality

The key quality should probably become an explicit optional state:

```text
unspecified
major
minor
```

When key quality is unspecified, Roman and numeric input should follow the standard behavior implied by the typed root and modifiers.

When key quality is `major` or `minor`, unqualified numeric degree input can infer the default diatonic quality from that key quality.

This would allow the app to support both:

- standard Nashville-like numeric behavior
- app-specific diatonic numeric behavior

## Slash Chords

Slash chords should stay synchronized with inversion state.

Examples:

```text
C/E     -> C chord, first inversion
1/3     -> first scale degree chord with third scale degree in the bass
V/7     -> Roman-rooted chord with seventh degree in the bass
```

Direct note basses should be accepted for all systems when unambiguous.
Degree basses should resolve through the selected key context.

The normalizer result should include slash-bass information directly:

- `bass`: resolved bass note or degree target
- `bassInput`: optional original bass token, if useful for preserving user intent
- `inversion`: chord-tone inversion index when the bass is a chord tone
- `normalized`: full normalized symbol including the slash bass when valid for `tonal`
- `display`: compact display label including the slash bass

When a user changes the inversion dropdown, the app can update the chord text from this same model instead of separately reconstructing slash notation from `tonal`.

## Inline Chord Objects

Inline chord objects use the same parser but have a smaller interaction model than keyboard/staff embeds.

The editor should be able to:

- recognize typed ASCII chord text as a candidate chord symbol
- replace accepted text with a structured inline chord object
- render the object as a properly formatted compact chord symbol
- preserve the original typed input when useful for editing
- preserve the normalized/display/friendly-name data needed for validation, accessibility, and persistence
- reopen a small floating editor field when the inline chord is selected or activated

The inline chord object should not be stored as styled text only.
It should be a document object so later serialization, search, accessibility descriptions, and format normalization have a stable source of truth.

Inline chord editing should not use the full `MusicEmbedDialog`.
The full dialog is for larger keyboard/staff music objects.
The inline editor should be a focused text field that updates the inline chord object through the same parser/normalizer.

Direct chord names are the first required inline syntax because users will most often type symbols such as `C`, `Dm7`, `F#dim`, or `Bbmaj7` in prose.
Roman and numeric/Nashville-inspired inline chord syntax can use the same parser once key context and document-level meaning are clear.

## Accessibility And Localization

Compact chord labels are notation, not prose.
They should be preserved as symbols where possible.

Friendly names and helper text should be localizable later.
The parser should avoid hard-coding grammar fragments directly into rendered UI components.

The first implementation can produce English friendly names in shared parsing code, but the design should leave room to move those names behind localization keys or structured name parts.

## Implementation Direction

Likely first modules:

- `src/mn/shared/chord-normalizer.js`
- `src/mn/shared/chord-normalizer.d.ts`
- tests in `src/mn/shared/_tests`

`buildKeyboardChordPayload` should call the normalizer before calling `tonal`.

The normalizer should be covered with focused shared tests before it is threaded through the dialog.

Before hand-writing the complete direct chord-symbol grammar, investigate whether `chord-symbol` can own the hard part of direct chord parsing.
The package parses pop/rock/jazz chord symbols into structured root, bass, quality, intervals, alterations, additions, omissions, and normalized rendering data.
If it handles our required direct chord cases well, the app parser can focus on the part that is actually app-specific:

- detecting whether the root system is direct chord name, Roman numeral, or numeric/Nashville-inspired
- resolving Roman and numeric roots through the selected key context
- deciding how optional key quality affects default Roman/numeric chord quality
- preserving the user's typed text while using normalized data internally
- carrying slash bass and inversion state into the music-object payload
- carrying compact display and source data into inline chord objects
- choosing app display labels and friendly helper names

In that model, the app should find or resolve the root first, then delegate the remaining direct chord suffix/modifier parsing to `chord-symbol` where possible.
`tonal` may still be useful as a resolver, validator, or compatibility layer, but it would no longer need to bear the full burden of parsing user chord symbols.

## References

- MuseScore Studio handbook, chord symbols: https://handbook.musescore.org/text/chord-symbols
- Open Music Theory, chord symbols: https://viva.pressbooks.pub/openmusictheory/chapter/chord-symbols/
- Chord Farm notation guide: https://www.chord.farm/notation
- PianoChord chord-symbol guide: https://www.pianochord.org/chord-symbols.html
- chord-symbol package: https://www.npmjs.com/package/chord-symbol
- chord-symbol docs/demo: https://chord-symbol.netlify.app/

## Open Questions

- What canonical display spelling should the app prefer for augmented dominant seventh chords: `C+7`, `Caug7`, or `C7#5`?
- Should helper text prefer parser-derived names over `tonal` names in every case, or only when `tonal` names are missing or weak?
- Should the parser support polychords in MVP, or leave them out until there is a clear embed use case?
- How much of MuseScore's chord-symbol syntax should be accepted in the first pass?
- Should optional key quality be exposed as `None / Major / Minor`, or should the UI use different wording such as `Default harmony`?
- Should numeric degree input be renamed internally from `numberDegree` to `nashvilleDegree` or kept generic?
- Can `chord-symbol` cover enough direct chord parsing that the app only needs to resolve root systems and app-specific semantics?
- Should inline chord objects behave as a single cursor unit, allow cursor movement inside rendered parts, or use single-unit selection plus the floating editor for text editing?
