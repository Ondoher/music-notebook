# React Cleanup

## Purpose

Record the completed post-POC React cleanup that brought the POC-era React components in line with the repository React code standard before MVP implementation.

The repository standard treats function components as extreme exceptions.
Substantial components should be class components, especially when they own state, refs, lifecycle behavior, handlers, or multiple semantic regions.

## Status

Post-POC React cleanup is complete.

The remaining work is MVP implementation feature work, not hook-to-class cleanup.
Future React components should follow the standards in [React Code](README.md) and should be added with focused tests where behavior is nontrivial.

## Completed Inventory

Class-based or production-shaped enough for MVP planning:

- `src/mn/main/App.jsx`
- `src/mn/features/app/components/AppShell.jsx`
- `src/mn/features/editor/components/EditorPage.jsx`
- `src/mn/components/LocaleString.jsx`
- `src/mn/components/TextInput.jsx`
- `src/mn/components/BaseSelect.jsx`
- `src/mn/components/BaseCheckbox.jsx`
- `src/mn/components/BaseRadioButtons.jsx`
- `src/mn/components/HelperText.jsx`
- `src/mn/components/KeyPicker.jsx`
- `src/mn/components/ChordBuilder.jsx`
- `src/mn/components/ProgressionBuilder.jsx`
- `src/mn/components/ScaleBuilder.jsx`
- `src/mn/components/ChordText.jsx`
- `src/mn/components/ChordInput.jsx`
- `src/mn/components/ScaleInput.jsx`
- `src/mn/features/music-object/components/MusicEmbedDialog.jsx`
- `src/mn/components/MusicPreview.jsx`
- `src/mn/components/Button.jsx`
- `src/mn/common/MusicNotebookProvider.jsx`

Recently converted:

- `src/mn/features/music-object/components/MusicEmbedView.jsx`

`MusicEmbedView.jsx` is now a class component.
It still owns dialog state, payload updates, playback control, and resize behavior, but those responsibilities are now organized as class state, lifecycle cleanup, and focused instance methods.

Final cleanup status:

- no substantial hook-based function components remain under `src/mn`
- any remaining React cleanup should focus on smaller follow-up simplification, test coverage, and future inline chord components rather than hook-to-class conversion

## Completed Cleanup Plan

1. Document the class-component default in the React topic and keep function components only for true tiny stateless exceptions. Done.
2. Convert the newly added base form controls first. Done:
   - `TextInput`
   - `BaseSelect`
   - `BaseCheckbox`
   - `BaseRadioButtons`
3. Keep `localized-text.js` as a plain utility module. Done.
4. Convert small shared components next. Done:
   - `HelperText`
   - `KeyPicker`
5. Reshape chord editing before converting builder components, so cleanup work targets the component structure we intend to keep. Done for the post-POC baseline with `ChordText` and `ChordInput`.
6. Convert builder components after their shared dependencies are stable. Done as thin wrappers for now:
   - `ChordBuilder`
   - `ProgressionBuilder`
   - `ScaleBuilder`
7. Break larger renders into focused render methods with semantic names. Done for the cleanup target components; continue this pattern in future MVP components.
8. Extract the music embed edit dialog into a dedicated dialog component before converting `MusicEmbedView`. Done as `src/mn/features/music-object/components/MusicEmbedDialog.jsx`.
9. Extract nested music embed subcomponents into feature-local or shared files before converting the large embed component. Done:
   - `MusicPreview`, `StaffPreview`, and `KeyboardPreview` are now extracted as class components in `src/mn/components/MusicPreview.jsx`.
   - `MusicDisplayOptions` is now extracted as a class component in `src/mn/features/music-object/components/MusicDisplayOptions.jsx`.
   - shared music helper functions are now extracted to `src/mn/shared/music_helper.js`.
10. Convert `MusicEmbedView` last, after dialog, preview, and display subcomponents are isolated. Done.
11. Run `npm run test:ui` after each cleanup slice. Passed after `MusicEmbedView` conversion.

## Verification

- `npm run test:ui` passed after the final cleanup slice: `113 SUCCESS`.
- Static search found no substantial hook-based JSX components under `src/mn`.
- Known non-failing noise remains: MUI Dialog/Transition `act(...)` warnings and module directive warnings.

## Chord Input Direction

Do not spend cleanup effort polishing `ChordBuilder` and `ProgressionBuilder` as separate long-term components.
They represent one editor concept: editing a chord embed.
The difference is the input method used to specify the chord.

The target shape is a unified chord input made from smaller class components:

- `ChordText` handles the editable chord value, input-kind-specific validation, focus, blur, and raw text changes.
- `ChordInput` owns the grouped chord editor state and combines chord text, input kind, key, key quality, inversion, and arpeggiation.
- `KeyPicker` should remain the shared key-context picker, combining the key input with key quality when the caller needs tonal context.
- Existing chord-name, Roman numeral degree, and numeric degree entry become input kinds of the same editor rather than separate edit modes.
- The current `ChordBuilder` and `ProgressionBuilder` should become thin compatibility wrappers or be removed once call sites use the unified editor.

The unified chord input should support these input kinds:

- `chordName` resolves direct chord names such as `Cdim7`.
- `romanDegree` resolves Roman numeral chord degrees such as `ii` or `V7`.
- `numberDegree` resolves numeric degrees such as `2`, using the selected key quality to determine the default chord quality.

Key and key quality are part of the combined editor context and should be edited through the shared key picker when key quality is shown.
Changing key or key quality must immediately rebuild the resolved notes for input kinds affected by those fields, especially numeric chord degrees.
Once this works reliably, the visible separate chord-degree edit mode can be removed from the dialog.

Roman numeral input and direct chord-name input should behave the same where their quality notation overlaps.
The parser and typing normalization should support:

- `dim` and `diminished` as aliases for diminished quality, displayed as `°`
- `aug` and `augmented` as aliases for augmented quality, displayed as `+`
- `m7b5` and `ø7` as standard half-diminished spellings
- possibly MuseScore-compatible `0` as a half-diminished compatibility alias

The text field must preserve the user's spaces while typing.
Parser resolution can trim or normalize a value internally, but the controlled input should not eat trailing spaces or rewrite chord aliases while the user is typing.

The fuller parsing direction is tracked in [Chord Name Parsing](../mvp/chord-name-parsing.md).
That note should be treated as the current source of truth for direct chord-name parsing, slash bass/inversion normalization, and the `chord-symbol` investigation.

Roman numeral capitalization is meaningful:

- lowercase Roman numerals specify minor quality unless another quality marker overrides it
- uppercase Roman numerals specify major quality unless another quality marker overrides it
- numeric degrees specify the default diatonic quality for the selected key quality

Example: in `C minor`, numeric `2` resolves to the diatonic diminished second-degree chord, while Roman `ii` remains an explicitly minor second-degree chord.

The helper text belongs to the grouped chord editor, not only the text field.
Use a MUI `FormControl`/`FormLabel` group pattern similar to the shared form controls:

- Valid state shows the friendly resolved chord name.
- Warning state can be used while typing when the parser does not yet recognize the value.
- Error state is used after blur, required validation, or save/submit attempts.
- Warning should not set `aria-invalid` or `role="alert"`.
- Error should use the existing assertive helper/error behavior.

Helper status has been added and should be used by grouped music inputs:

- `default` for normal helper text.
- `warning` for non-blocking parser uncertainty while typing.
- `error` for blocking validation errors.

Do not keep obsolete compatibility props solely for old call sites.
If a component still depends on the old `error` prop shape, update the component.

## Scale Input Direction

Do not spend cleanup effort polishing scale root and scale mode as unrelated fields.
Scale editing should use a single grouped scale input component.

The target shape is a unified scale input made from smaller class components:

- `ScaleInput` owns the grouped scale editor state and combines the scale key/root with the scale mode selection.
- The scale mode combo box belongs inside `ScaleInput`, not as a separate ad hoc field at each call site.
- `ScaleBuilder` should become a thin compatibility wrapper or be removed once call sites use the unified scale input.

The grouped scale input should follow the same helper-text pattern as chord input:

- Helper text belongs to the grouped scale editor.
- Valid state can show the friendly resolved scale name.
- Warning state can be used while typing when the scale parser does not yet recognize the value.
- Error state is used after blur, required validation, or save/submit attempts.

## Hook Migration Notes

- `useState` becomes `this.state` and `this.setState`.
- `useMemo` becomes computed methods unless measurement proves caching is needed.
- `useCallback` becomes class methods.
- `useEffect` cleanup becomes `componentWillUnmount`.
- `useLayoutEffect` becomes `componentDidMount` and `componentDidUpdate`.
- `useRef` becomes `React.createRef()` or instance fields.
- Context access should use `static contextType = MusicNotebookContext` when needed.

## Risks

The highest-risk cleanup item was `MusicEmbedView`.
It still owns dialog state, payload updates, playback cleanup, resize behavior, and mode transitions, but staff rendering, keyboard rendering, display options, player loadable ownership, and shared music helpers have been extracted.

Any future cleanup should keep those behavior paths covered by UI tests.

The current Quill embed creates a separate React root.
Context has been bridged with `MusicNotebookProvider` and watched app data such as locale.
Any further component extraction must preserve that bridge so localized shared components work both inside the main app root and inside embed-owned roots.

## Done Means

- No substantial function components remain in `src/mn`.
- Any remaining function component is explicitly tiny, stateless, and justified by the React code topic.
- Shared form controls are class components using `MUI`, localization, and accessible labels/descriptions.
- Music embed subcomponents are split enough that `MusicEmbedView` no longer contains multiple unrelated presentation components in one file.
- `npm run test:ui` passes after the cleanup.

Done as of the post-POC cleanup checkpoint.
