# Localization And Accessibility

## Purpose

Capture the current architecture stance that localization and accessibility are first-class product concerns for `music-notebook`.

This is especially important because the app combines:

- a rich text editor
- custom embedded music objects
- third-party rendering components
- dialogs and tool surfaces
- eventual export workflows

Those pieces can easily become hard to translate or hard to use accessibly if the constraints are added late.

## First-Class Direction

Localization and accessibility should be considered part of the component and architecture contract from the POC onward.

That did not mean the first spike had to support every locale or every assistive workflow perfectly.

It does mean:

- user-facing strings should move through a localization layer
- component choices should consider accessibility support
- custom document objects should have meaningful labels and descriptions
- editor and embed workflows should preserve predictable focus behavior
- tests should cover important accessibility and localization seams as they appear

## Localization Direction

For the POC, use a cleaned-up version of the `modmod` localization framework.

Useful pieces to borrow:

- phrase JSON files such as `phrases/en-US.json`
- a pure translator for phrase lookup, replacements, and plural forms
- a localization service registered as `localize`
- React context exposure for components
- a small `LocaleString` component for rendered phrase keys

Skip translated markdown for now because that path depends on server-side support.

The POC localization layer should support:

- phrase keys
- replacement values
- plural categories through `Intl.PluralRules`
- locale/date helper methods where useful
- missing-key warnings that are clear during development

Current preferred behavior:

- avoid hardcoded user-visible strings in reusable components
- use full-sentence phrase keys rather than assembling grammar from fragments
- keep initial locale data small and expand it as UI surfaces become real

## Accessibility Direction

Material UI gives the app a useful accessibility baseline for common controls.

Use MUI where practical for:

- buttons
- icon buttons
- menus
- dialogs
- form fields
- toolbar controls
- validation and helper text

But MUI does not solve accessibility for:

- the `Quill` document surface
- embedded keyboard objects
- embedded staff objects
- custom SVG/canvas/music renderers
- focus transitions between document objects and editing dialogs

Those areas need explicit attention.

## Component Selection Guidance

When choosing third-party components, accessibility should be part of the selection criteria.

Prefer components that provide:

- keyboard navigation support
- documented ARIA behavior
- meaningful labels or hooks for labeling
- controllable focus behavior
- semantic DOM where possible
- ways to provide non-visual descriptions for rendered music objects

Avoid components that only produce inaccessible visuals unless the app can wrap them with an adequate accessible representation.

## Reusing `modmod` Components

When the app needs a localizable component or a component with accessibility support, check `c:\dev\modmod` before building from scratch.

Useful candidates may include:

- localized inputs
- localized select/radio/checkbox wrappers
- dialog components
- helper text and validation message components
- accessible button patterns
- info/help text components

Some of the accessibility support in `modmod` may be messier than this app ultimately wants.

That is acceptable for POC borrowing. Treat those components as a working base:

- preserve useful behavior and test coverage
- simplify awkward implementation details when bringing them over
- rename `ModModContext` usage to `MusicNotebookContext`
- keep localized text flowing through the `localize` service
- verify accessible names, labels, helper text, and focus behavior after porting

The goal is not to copy `modmod` blindly.
The goal is to avoid rediscovering solved component patterns while still improving them where `music-notebook` has clearer requirements.

## Embedded Music Object Guidance

Embedded objects should not be treated as visual-only blobs.

Each object should eventually have:

- a document-stream representation
- a visible rendering
- an accessible name
- a useful description or summary
- a predictable selection/focus behavior
- an editing path that works from keyboard input

For example:

- a keyboard embed should be identifiable as a keyboard/chord/scale object
- a staff embed should be identifiable as notation, with enough metadata to describe its contents
- selecting an embed should not trap focus or make the surrounding document unusable

## Testing Guidance

As the POC grows, add tests for:

- phrase lookup and replacements
- plural behavior
- missing-key behavior
- component rendering through localized labels
- accessible names for important controls
- focus movement into and out of embed editing dialogs
- keyboard-triggered insertion and editing flows

The first goal is not exhaustive coverage.
The first goal is to keep the architecture honest while the editor/embed model is still forming.

## Current POC Status

The POC now has a working localization layer adapted from `modmod`:

- phrase data lives under `src/mn/phrases`
- translator behavior covers phrase lookup, replacements, plural categories, and missing keys
- `MusicNotebookContext` exposes the localization service to React components
- `LocaleString` renders localized phrase keys
- `HelperText` provides a reusable accessible helper/error text pattern

The current music-object editor and document controls are localized through this layer.
Browser coverage includes translator behavior, `LocaleString`, `HelperText`, and localized music-object controls such as playback and resize.

Still unresolved:

- richer localized descriptions for musical content, especially staffs and chord/scale examples
- manual screen-reader passes through the Quill document surface and floating object controls
- focus behavior review for the object dialog once the POC component is split into production-shaped components

## Practical Rule

When adding a new user-facing component, ask:

1. Where does its display text come from?
2. What is its accessible name?
3. Can it be reached and operated by keyboard where appropriate?
4. If it renders music visually, what non-visual description does the document model preserve?

If those questions cannot be answered yet, record the gap near the component or in the relevant architecture note.
