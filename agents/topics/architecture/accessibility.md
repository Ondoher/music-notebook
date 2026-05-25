# Accessibility

## Purpose

Capture accessibility expectations and checks for `music-notebook`, especially where custom editor embeds and third-party visual components carry semantic meaning.

This note should be used alongside:

- [Localization And Accessibility](/c:/dev/music-notebook/agents/topics/architecture/localization-accessibility.md)
- [Quill Integration](/c:/dev/music-notebook/agents/topics/architecture/quill-integration.md)

## Contrast Targets

Use the WCAG 2.2 contrast requirements as the baseline.

Reference:

- [WCAG 2.2, Success Criterion 1.4.3 Contrast Minimum](https://www.w3.org/TR/WCAG22/#contrast-minimum)
- [WCAG 2.2, Success Criterion 1.4.11 Non-text Contrast](https://www.w3.org/TR/WCAG22/#non-text-contrast)

Important values:

- normal text, AA: `4.5:1`
- large text, AA: `3:1`
- normal text, AAA/enhanced: `7:1`
- large text, AAA/enhanced: `4.5:1`
- meaningful non-text UI indicators and graphical object states, AA: `3:1`

For music notebook embeds, highlighted notes are meaningful non-text information.
The baseline target should therefore be at least `3:1`, but color should not be the only signal.

## Keyboard Highlight Contrast Check

Current keyboard colors in the light theme:

- primary theme color: `#346f68`
- standard natural key: `#f6f5f3`
- standard accidental key: `#747474`
- dimmed natural key when highlights are present: `#edf0ec`
- dimmed accidental key when highlights are present: `#d0d7d4`
- highlighted natural key: `#477c76`
- highlighted accidental key: `#477c76`
- root marker: `#20242c`

Approximate contrast ratios:

| Pair | Ratio | Result |
| --- | ---: | --- |
| dimmed natural key vs highlighted natural key | `4.14:1` | passes `3:1` non-text target |
| dimmed accidental key vs highlighted accidental key | `3.25:1` | passes `3:1` non-text target |
| highlighted natural key vs root marker | `3.27:1` | passes `3:1` non-text target |
| highlighted accidental key vs root marker | `3.27:1` | passes `3:1` non-text target |
| highlighted natural key vs natural key label | `4.72:1` | passes `4.5:1` normal text target |
| standard accidental key vs standard natural key | `4.29:1` | maintains ordinary keyboard distinction when no highlights are present |

Conclusion:

The keyboard now has two visual modes.
Without highlights, it can use ordinary natural and accidental key colors.
When highlights are present, unhighlighted keys are dimmed and highlighted keys use the same darker overlay color.

This makes the highlight contrast consistent across natural and accidental keys.
The visual treatment should still keep a non-color cue, because highlighted notes carry semantic meaning.

## Keyboard Highlight Guidance

Keyboard highlights should use at least two signals:

- a color or value change with at least `3:1` contrast from the unhighlighted key state
- a non-color cue such as a strong border, underline, stripe, dot, icon marker, or label treatment

For chord and scale examples, the renderer should be able to represent:

- highlighted notes
- root note
- optional chord tones or scale degrees
- optional disabled or out-of-scope notes

Each state should be distinguishable without relying on hue alone.

## Current Recommendation

For the embedded keyboard POC, keep the semantic classes and improve the visual treatment:

- `.music-keyboard-key-highlighted`
- `.music-keyboard-key-root`

Prefer making highlighted notes visibly different through border weight, inner marker, or patterned accent instead of only changing the fill color.
This keeps the renderer usable for color-blind users and preserves the architecture direction that notebook embeds are semantic display objects, not interactive piano widgets.

## Embedded Object Screen Reader Follow-Ups

Quill does not provide a complete accessibility contract for custom embedded objects.
The Delta/blot model gives us a place to store and render the object, but the DOM semantics, accessible name, edit affordances, and keyboard behavior are our responsibility.

Do not rely on detecting whether a screen reader is running.
Browsers do not expose a reliable screen-reader-active flag, and changing behavior only for detected assistive technology is brittle.
Instead, make the normal embed behavior accessible by default.

Screen readers can change how keyboard interaction reaches the editor:

- browse or virtual cursor modes may intercept arrow keys
- `Tab` should still reach meaningful controls such as the embed edit action
- users may navigate by buttons, form fields, headings, landmarks, or rotor/quick-nav features
- Enter and Space behavior can vary by browser, screen reader, and whether the user is in browse mode or forms/focus mode
- contenteditable interactions can feel different from ordinary form controls, especially around selection and embedded objects

Design implications for music embeds:

- the rendered staff or keyboard needs a meaningful accessible name and, when useful, a concise description of the musical content
- the floating toolbar edit action must remain a real tabbable button, not only a hover affordance
- do not require custom keyboard gestures such as selecting an embed and pressing a single-letter shortcut to edit it
- visual-only previews can be `aria-hidden` only when an equivalent accessible label or description is provided elsewhere on the embed
- resize controls must be keyboard accessible, not only mouse handles
- floating controls should appear on both hover and focus-within

Follow-up testing should include at least NVDA with Chrome or Firefox, plus VoiceOver with Safari.

## Current Embed Control Status

The POC currently renders floating controls over each music object:

- an edit button that opens the dedicated music-object dialog
- a play/stop button that auditions the generated music
- a resize handle button in the bottom-right corner

Both controls are real buttons and become visible on hover or focus-within.
The resize handle supports pointer resizing and keyboard resizing in the component implementation.
Automated browser coverage currently verifies localized focusable controls for playback and resizing, and that pointer resizing persists `width` and `height` into the embed payload.

Remaining follow-up:

- manually verify keyboard resize behavior with real browser focus
- manually verify play/stop announcements with screen readers
- add screen-reader passes for the floating control model
- add richer accessible descriptions for the musical content itself, beyond the current object label
