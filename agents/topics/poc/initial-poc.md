# Initial POC

## Purpose

Capture the scope and intent of the first `music-notebook` proof of concept.

This note records the first spike.
It is not the final product plan and not the final architecture.

Use it to keep track of:

- what the first POC is trying to prove
- what is intentionally out of scope
- what questions the POC should answer
- what should be treated as learning versus permanent structure

Read this together with:

- [Music Notebook App Architecture](../architecture/app-architecture.md)
- [Foundation Architecture](../architecture/foundation-architecture.md)
- [Testing Strategy](../testing/testing-strategy.md)

## Outcome Summary

The initial POC succeeded.

It proved that `Quill` can act as the editor-first composition surface while carrying structured embedded music objects in the document flow.
It also proved that one custom embed payload can support both keyboard and staff display modes, round-trip through Quill Deltas, open a dedicated object editor dialog, resize in the document, and provide a basic playback audition.

The main handoff into application planning is now:

- keep the custom embed/blot path as the leading implementation direction
- treat the POC payload as useful learning, not the final notebook format
- split the large POC React implementation into intentional class-based components and shared domain helpers before hardening it
- design a real document model that can wrap editor content plus music-object payloads without overfitting to raw Quill internals

## Core Goal

The initial POC should prove that an editor-first music notebook can be built around `Quill` with embedded music-related objects in the document flow.

The current top priority is not feature breadth.
It is learning the shape of the editor/object relationship well enough to make better architecture decisions afterward.

The concrete end goal of the POC is to be able to construct a `Quill` document containing:

- an embedded keyboard
- an embedded staff

The keyboard may be interactive, but that is secondary.
The main intent of both objects is that they render correctly as part of the document experience.

The broader goal is to prove that this UI representation can be streamed in and out, meaning:

- the document and its embedded objects can be constructed into the editor
- the editor state can be read back out in a structured way

The current keyboard and staff rendering library choices are flexible.
If a simpler rendering option can satisfy the POC, that is preferable to preserving an initially named library.
All else being equal, a component that works better with `MusicXML` is preferred.

## What The POC Should Prove

The first POC should answer these high-value questions:

- can `Quill` serve as the main composition surface for this app
- what is the most workable first embed model for music-related objects
- how should an embedded object appear inside the document stream
- how should selection and editing of that object behave
- what minimum document representation is needed to support that flow
- can a document containing an embedded keyboard and embedded staff be streamed into and back out of the editor without losing the intended structure

If the POC answers those well, it will have done its job even if the surrounding app shell remains crude.

## Primary Technical Target

The first technical target was:

- mount `Quill` in the main display
- prove working embedded music object paths for both a keyboard and a staff

That remains the center of the spike, and the first implementation path is now in place:

- `Quill` is mounted as the editor-first surface.
- A custom `music-keyboard` blot carries the music object payload in the Delta.
- The same music object can render as either keyboard or staff through `displayMode`.
- Toolbar buttons insert either keyboard-first or staff-first objects and immediately open the edit dialog.
- The object can be read back out through the debug document JSON.

## Recommended Scope

The POC should ideally include:

- a minimal app shell
- a mounted `Quill` editor
- one working path for inserting an embedded keyboard
- one working path for inserting an embedded staff
- working rendering paths for both embedded objects
- one working path for reading the structured document state back out
- enough temporary document structure to preserve the concept of editor content plus embedded object data

That is enough to learn a lot without prematurely building the whole application.

The rendering implementations do not need to prove final long-term library choices.
They need to prove that the document can carry the rendered objects successfully.

## Final POC Implementation Status

The POC implementation moved beyond placeholder rendering:

- keyboard rendering uses `react-piano`
- staff rendering uses `opensheetmusicdisplay` from generated `MusicXML`
- chord, scale, and chord-degree payloads are built with `tonal`
- the edit dialog supports display mode, key, enharmonic-key handling, chord/scale/chord-degree/none modes, staff octave, chord arpeggiation, and keyboard note-name display
- embedded objects persist `width` and `height` and can be resized in the document
- staff SVG output scales inside the embed and is pinned to the top-left
- document text uses `Comic Neue`; dialog controls use the application font
- object-level floating controls provide edit, playback, and resize affordances
- playback uses `@music-i18n/musicxml-player` through a Polylith loadable and generated `MusicXML`

The current code is intentionally still POC-shaped.
In particular, the main music embed renderer contains too many responsibilities in one function component.
That should be treated as implementation debt to resolve during the application-planning and hardening phase, not as a reason to discount the POC result.

## Post-POC Editing Update

The POC is still considered complete, but the current edit dialog should be updated or used as the proving ground for one additional editing behavior:

- key selection for chord/progression editing may include major or minor
- scale editing is excluded from this major/minor key-mode behavior
- chord progression editing should use the default chord quality implied by the selected key mode
- numeric progression input may be supported as an alternative to Roman numerals
- numeric progression input can avoid relying on Roman numeral capitalization to encode major/minor quality
- numeric input may be recognized directly from the field value

This should be treated as a targeted follow-up to the proven POC editing model, not as a reason to reopen the original POC success criteria.

## Explicitly Out Of Scope

These areas should stay secondary or deferred unless they become necessary to support the core spike:

- production-grade persistence
- authentication
- backend storage
- sync or collaboration
- encryption
- import/export breadth beyond what is needed for learning
- polished app-wide navigation
- final feature boundaries
- production-ready styling or layout refinement
- long-term commitment to any specific keyboard or staff rendering library

The goal is not to avoid these forever.
The goal is to avoid letting them distract from the most important unknown.

## Key Questions The POC Should Resolve

### 1. Embed Representation

We need to learn which approach is most workable:

- custom blot/embed
- structured block wrapper
- placeholder plus sidecar object data

This is likely the single most important technical question in the spike.

### 2. Editing Model

We need to learn how the user should interact with embedded objects:

- side-panel editing
- focused secondary editor
- dedicated editor dialog

The answer may differ by object type, but the first POC should still give us a default direction.

For the keyboard specifically, interactivity is optional for the first spike.
Rendering viability is the higher priority.

Current preferred direction:

- embedded keyboard and staff objects render inside the document
- richer editing can open in a dedicated editor dialog
- inline interaction inside Quill should stay lightweight
- floating document controls can provide small object actions such as edit and resize

### 3. Document Shape

We need to learn what minimum notebook/document representation is required.

Specifically:

- what belongs in the editor stream
- what belongs in embedded object payloads
- how those relate to `MusicXML`

### 4. Shell Relationship

We need to learn how much shell is actually needed around the editor.

The current hypothesis is:

- the editor is the center
- the shell supports it

The POC should test whether that feels structurally right in practice.

## Proposed POC Boundaries

### POC Owns

- editor mounting
- embed insertion experiment
- embed rendering experiment
- first interaction model for an embedded object
- temporary document/service seam

### POC Does Not Need To Finalize

- final notebook file format
- backend model
- long-term feature partitioning
- permanent persistence mechanism
- final tab/navigation structure

## Success Criteria

The POC should be considered successful if it gives us confidence about the editor/embed seam.

Concrete success signals:

- `Quill` is mounted and usable as the main editing surface: achieved for the POC
- an embedded keyboard can be inserted into the document flow: achieved
- an embedded staff can be inserted into the document flow: achieved through the same music object with `displayMode: "staff"`
- both objects can be rendered in a way that feels structurally viable: achieved for POC purposes
- the document structure can be streamed into the editor and read back out in a structured way: achieved through the Quill Delta/debug JSON path
- there is a workable selection or editing path for at least the first embedded-object workflow: achieved with floating edit control plus dialog
- we can describe the resulting document representation clearly enough to guide the next round of architecture: achieved, with the caveat that the POC payload should be translated into a real document model rather than preserved as-is
- playback can audition the embedded music object: achieved as a POC add-on, not a requirement for the original spike

It is acceptable for the POC to succeed using simpler rendering components than the initially named ones, as long as the rendering and document-structure goals are met.

The POC does not need to prove every future requirement.
It needs to reduce uncertainty around the most important one.

## Failure Conditions Worth Watching

These outcomes would be especially informative even if the POC still counts as progress:

- `Quill` embed behavior is too limiting or too awkward for the needed object model
- inline object interaction becomes structurally messy
- the document representation becomes brittle too quickly
- `MusicXML` integration feels too mismatched with the editor model

If one of those happens, the POC is still valuable because it tells us where to change direction.

## Testing Guidance For The POC

The POC should not skip testing entirely, but it should test the right seams.

Recommended focus:

- shared tests for any document-shape or conversion logic we introduce
- UI tests for real editor/embed behavior that depends on browser rendering
- light service-level tests where a temporary seam has meaningful behavior

The first spike does not need exhaustive coverage.
It does need enough testing to preserve what we learn.

## What To Preserve After The POC

Even if the first implementation is partly disposable, these outputs should be treated as durable:

- conclusions about the embed model
- conclusions about the editing model
- conclusions about document representation constraints
- useful shared test helpers
- any service seams that clearly match long-term architecture

## What May Be Disposable

The following may be temporary and should not be overprotected:

- crude shell layout
- placeholder controls
- throwaway insertion UI
- temporary mock persistence behavior
- early folder placement that exists only to support learning

## Recommended Next Step After The POC

The next step is real application planning.
Convert the findings into:

- updated architecture notes
- refined app-specific boundaries
- a clearer feature/mechanics plan
- a more intentional document model note

Near-term planning should focus on:

- document model and serialization
- persistence and save/load seams
- export boundaries, especially PDF and later MusicXML export
- component refactoring around the React code shape guidance
- deciding which POC render/playback libraries remain good enough for the first real application phase
