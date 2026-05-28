# Quill Integration

## Purpose

Capture the main integration considerations for using `Quill` as the core editor in `music-notebook`.

This note is about:

- how `Quill` fits the app architecture
- the document model implications of using Quill
- embedded object mechanics
- rendering versus interactivity tradeoffs
- practical risks and recommendations after the first spike

This note is written after the first POC and post-POC cleanup, with MVP implementation planning now active.
It should be treated as a working integration guide, not a final specification.

## Why Quill Fits The App

`Quill` is a strong candidate for this app because it provides:

- a document-oriented editing surface
- a structured internal model rather than raw HTML editing
- support for custom embedded content
- event and selection APIs that can support editor-driven workflows

For `music-notebook`, that aligns well with the current product direction:

- the app is editor-first
- the document is the central composition surface
- the document needs to contain non-text music-related objects

The key question is not whether Quill can edit text.
It is whether Quill can serve as the main notebook surface while carrying embedded music objects in a structurally workable way.

## Core Quill Concepts That Matter Here

### Delta Model

Quill uses a structured document model built around Deltas.

That matters because:

- document content is not just freeform DOM
- insertions, updates, and serialization can be expressed structurally
- embeds become part of the document model rather than just arbitrary DOM fragments

For this app, that is a good match for eventual stream-in and stream-out behavior.

Practical implication:

- we should think in terms of document structure and operations, not just rendered HTML

### Blots And Embeds

Quill supports custom content through blots, including embeds.

This is the main mechanism likely to matter for:

- embedded keyboards
- embedded staffs
- future music-related document objects

The most important early architectural question is whether the first embed implementation should be:

- a true custom embed/blot
- a more structured block wrapper strategy
- a placeholder representation with sidecar object data

This note does not lock that decision, but Quill's embed model is the most native place to start the investigation.

### Selection And Change Events

Quill provides editor state, selection, and change events.

That matters because embedded objects are not just passive render output.
The app needs to know:

- when the user inserts an object
- when the user selects or focuses near an object
- when document structure changes

Those hooks are likely to be important for both the editor shell and any later side-panel or properties workflows.

## Quill In Music Notebook

The current target is to support a `Quill` document containing:

- inline chord objects
- an embedded keyboard
- an embedded staff

The POC implemented this as one custom Quill embed type, `music-keyboard`, whose payload includes a `displayMode` field.
Despite the blot name, it now represents a more general music object that can render as either a keyboard or staff.

Inline chord objects are a separate, text-flow object type.
They should be created when the user types an ASCII chord symbol in the editor and the app replaces that text with a properly formatted chord object.
They should use the shared chord parser/normalizer, preserve enough source/normalized data to edit and round-trip, and remain much lighter than keyboard/staff embeds.
They should inherit the document-level chord display style by default, with a local display-style override only when a specific object needs different presentation.

The main intent of those embedded objects is rendering.

The keyboard may be interactive, but interactivity is secondary to:

- document placement
- stable rendering
- structural read/write behavior

That suggests an important integration rule:

- prefer embedded objects that behave like renderable document units first
- add deeper interactivity only if it does not fight the editor model

It also suggests a component-selection rule:

- prefer the simplest rendering component that satisfies the in-document use case
- if rendering options are otherwise comparable, prefer the one with better `MusicXML` compatibility
- do not assume the first keyboard or staff library choice is permanent

## Recommended Integration Direction

### 1. Treat Quill As The Source Of Editor Structure

Quill should be treated as the main editor/document surface, not just a widget wrapped around some other hidden document system.

That means:

- the document stream should be represented in a way Quill can own
- embedded objects should have a clear representation within or alongside the Quill model
- stream-in and stream-out behavior should map cleanly to that representation

### 2. Prefer Rendering-First Embeds

The first spike confirmed that embedded keyboard and staff objects should be treated primarily as renderable document objects.

This is important because deeply interactive embedded widgets often create tension with rich-text editor behavior:

- focus handling gets messy
- selection expectations can become confusing
- keyboard input can conflict with editor shortcuts and caret behavior
- serialization semantics become harder to keep clean

So the safest first move is:

- make them render well
- make them structurally insertable
- make them structurally readable back out

### 3. Keep The Embedded Object Contract Explicit

Even if the exact Quill mechanism changes, each embedded object should have a clear contract.

That contract should answer:

- how it is represented in the document
- what payload it carries
- how it renders
- how it is identified when reading the document back out
- how editing is initiated

This is important because the app will likely need a notebook format that is not identical to raw Quill internals forever.

### 4. Separate Render Concerns From Payload Concerns

The renderable keyboard or staff should not be the only representation of the object.

We will likely need a distinction between:

- render representation
- object payload
- document representation

For example:

- the staff may render from music data
- the payload may include a `MusicXML` fragment or related structure
- the notebook document may store the relationship between the Quill stream and the object payload

That separation will matter when the app later grows export, persistence, or migration behavior.

## Main Technical Options

### Option 1: Custom Quill Embed/Blot

Strengths:

- most native to Quill's document model
- likely the cleanest conceptual match for embedded document objects
- easier to think of the object as a real part of the document stream

Risks:

- custom blot behavior can become tricky
- interactive nested UI can be awkward
- editing and selection behavior may need careful design

### Option 2: Structured Block Wrapper

Strengths:

- may be easier to reason about as a block-level document region
- can provide a more visible container around the music object

Risks:

- may be less native than a true embed
- can drift toward ad hoc DOM management if not kept disciplined

### Option 3: Placeholder Plus Sidecar Data

Strengths:

- simpler to serialize in some cases
- can reduce pressure on Quill internals during the first spike

Risks:

- weaker document fidelity
- more indirection between what the user sees and what the document actually means
- can become a temporary hack that is hard to evolve cleanly

## Rendering Library Notes

The current candidate libraries were chosen primarily for rendering capability, not because the app necessarily needs all of their deeper behavior.

That means the right evaluation question is:

- what is the simplest way to render a keyboard in-document
- what is the simplest way to render a staff in-document

If a simpler rendering option works well enough, that remains preferable for the first real application phase.

Practical implication:

- library choice should be treated as an implementation detail in service of the embed/rendering model
- `MusicXML` compatibility should act as a meaningful selection advantage when rendering options are otherwise close
- the document architecture should not be overfit to one rendering package too early

### Current Music Object Renderer Spike

The first real music-object renderer spike used React inside the custom `music-keyboard` Quill blot.
Keyboard display uses `react-piano`.
Staff display uses `opensheetmusicdisplay` from generated `MusicXML`.
Playback uses the `player` registry service, which owns the `@music-i18n/musicxml-player` Polylith loadable and plays generated `MusicXML`.

This keeps the Quill/Delta contract stable while replacing the initial hand-built keyboard DOM with an actual React component.

Current findings:

- `react-piano` is viable enough for keyboard display in the POC
- `opensheetmusicdisplay` is viable enough to prove staff notation, key signatures, clefs, and chord rendering from music payloads
- `@music-i18n/musicxml-player` is viable enough to audition generated MusicXML through the player service and its loadable
- keep the payload shape independent from `react-piano` internals
- keep inline interaction minimal while Quill owns document input
- treat audio playback as an object action, not as a reason to make the embed itself highly interactive

This is still provisional.
The main thing being tested is whether a real React-rendered music component can live inside the document flow without making selection, serialization, or focus behavior brittle.

Because each Quill embed mounts its own React root, normal React context from the main app root does not automatically reach embedded components.
The current direction is to bridge app context explicitly:

- use `MusicNotebookProvider` around embed-owned React roots
- expose watched app data, starting with locale, through the shared app-data service
- configure embed roots with the same localization and context values needed by shared components

This keeps localized `MUI`-based controls usable both in the main app tree and in Quill-owned embed roots.

### Current Embed Payload Shape

The POC payload currently carries:

- `id`
- `displayMode`
- `label`
- `notes`
- optional `highlightedNotes`
- optional `displayKey`
- optional chord, scale, and progression identifiers
- optional source chord symbol, root note, and inversion
- optional `arpeggiate` as a chord/chord-degree specification option
- staff options such as `staffOctave`
- keyboard options such as `keyboardShowNoteNames`
- sizing fields `width` and `height`

`openEditor` is a transient insertion flag, not persisted in the normalized Delta payload.

This payload began as a POC-shaped structure.
It is useful enough to test the editor/embed seam, but MVP planning should translate it into an intentional notebook object model rather than treat it as the final file format.

## Stream-In / Stream-Out Implications

One of the most important app-specific requirements is that the UI representation can be streamed in and out.

For Quill, that means we need to be able to:

- construct a document that includes inline chord objects and larger embedded objects
- load that structured content into the editor
- read the document back out
- preserve enough structure to identify inline chord, embedded keyboard, and embedded staff objects reliably

Practical implication:

- rendering alone is not enough
- structural round-tripping remains part of the core document contract

If an embed renders nicely but cannot be read back out in a clean, stable way, that is not enough.

## Editing Model Notes

Quill can host embedded content, but there is an important difference between:

- renderable embedded document units
- mini-apps fully living inside the editor

The second model is riskier.

After the first spike, the safer assumption remains:

- insertion happens through editor or shell controls
- selection happens within the document
- editing can open a dedicated dialog or focused editor surface

That model is likely less fragile than trying to make each embedded object behave like a fully independent rich interactive widget inside Quill from day one.

Current preferred direction for `music-notebook`:

- inline chord objects stay in the text flow and render as formatted chord symbols
- inline chord objects inherit the document-level chord display style unless they carry a local override
- typing an ASCII chord symbol can be replaced with an inline chord object once it is recognized and accepted
- selecting or activating an inline chord object can open a small floating editor field for editing the chord text
- inline chord editing should not open the full music-object dialog unless the user is converting or promoting the chord into a larger object
- embedded keyboard and staff objects render as part of the document
- selecting or activating one can launch a dedicated editor dialog
- inline interaction inside Quill should be kept minimal unless a later need clearly justifies more
- small floating controls are acceptable for object-level actions such as edit, playback, and resize
- resize is part of the embed payload and updates the Quill Delta through the existing embed-change path
- the edit dialog should live as a reusable shared component rather than as a large subtree inside the editor feature
- the current shared dialog component is `src/mn/components/MusicEmbedDialog.jsx`
- playback belongs behind the `player` feature service; editor components should call `player.play(payload)` and `player.stop()` rather than importing the playback loadable directly
- edit fields should use shared `MUI`-based components where available for localization and accessibility behavior
- chord editing is moving toward one unified input that auto-detects direct chord names, Roman numeral degrees, and numeric degrees
- numeric chord degrees use the selected key mode to infer default diatonic quality, while Roman numeral capitalization remains explicit quality notation
- chord-name parsing details are tracked in [Chord Name Parsing](../mvp/chord-name-parsing.md), including the current direction to preserve typed text, normalize internally, include slash bass/inversion in the normalizer result, and investigate `chord-symbol`

## Risks

The main integration risks are:

- custom embed mechanics may be more awkward than expected
- focus and selection behavior may become fragile
- keyboard interactivity may conflict with editor input handling
- the document representation may become too coupled to Quill-specific internals
- `MusicXML` payload needs may not map cleanly to the first embed representation

These risks are why the initial POC was valuable, and why the next phase should design a real notebook document model before hardening the POC payload.

## POC Findings To Carry Forward

The first spike answered the highest-value Quill questions well enough to continue:

1. Can we insert both a keyboard and a staff as structurally meaningful document objects?
2. Can they render reliably inside the document flow?
3. Can the resulting document be read back out with enough structure to identify both object types and payloads?
4. Does the initial selection/editing behavior confirm that dedicated-dialog editing is sufficient, or reveal a need for lighter in-document adjustments?

Those questions were answered well enough for the first POC.
Quill remains viable for the app's first architecture phase, with the important follow-up that the POC payload should be translated into an intentional notebook document model rather than treated as the final durable format.

## Practical Rule Of Thumb

When choosing between a simpler Quill integration and a more interactive one, prefer the option that preserves:

- document clarity
- round-trip structure
- predictable editor behavior

over the option that offers richer embedded interactivity but makes the editor model brittle.
