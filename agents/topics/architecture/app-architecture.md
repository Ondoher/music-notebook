# Music Notebook App Architecture

## Purpose

Capture the parts of the architecture that are specific to `music-notebook` rather than the general `polylith` plus `REMVC` model.

Use [Foundation Architecture](foundation-architecture.md) for the reusable architectural framing and conventions.

## Current Product Shape

The application is a music notebook with an editor-first experience.

Current working product assumptions:

- the central surface is a rich editor
- users should be able to embed music-related objects into the document flow
- the first known display modes are keyboards and musical staffs
- the current keyboard and staff rendering component choices are provisional
- the shell outside the editor matters, but it is secondary to getting the editor and embed mechanics right
- saving and persistence were intentionally deferred during the first spike and now need MVP planning

The most important early architectural consequence is that the document editor is not just one feature among many. It is likely the primary composition surface around which the rest of the app is organized.

Another important product/architecture note:

- the rendering requirement matters more than loyalty to any currently named keyboard or staff library
- if a simpler rendering component can satisfy the document use case, it is a better early fit
- all else being equal, components that work with `MusicXML` are preferred

## App-Specific Direction

### 1. Editor-Centered Composition

The editor should be treated as the main interaction model, not as a text box embedded inside a conventional multi-panel app.

Current preferred direction:

- `Quill` is the primary editing surface
- embedded music objects live inside or adjacent to the document stream
- the shell should support the editor rather than compete with it
- major sections or tabs may exist, but they should not dilute the editor-first model

Practical implication:

- the earliest architecture should optimize for document composition, object embedding, and focused editing flows before broader application concerns such as persistence or collaboration

### 2. Music-Notebook Domain Mapping

The general model/service boundary probably maps here to concerns such as:

- notebook/document data
- embedded object data
- `MusicXML` parsing or conversion
- export flows
- eventual persistence

This boundary is worth preserving early because the app is likely to accumulate multiple document representations over time.

## Proposed Early Boundaries

These are not final, but they are useful initial seams.

### Editor Surface

Owns:

- mounting and configuring `Quill`
- the document flow
- selection behavior
- insertion points for embedded objects
- coordination with surrounding editor UI

Should not yet own:

- permanent persistence decisions
- backend authentication concerns
- collaboration or sync behavior

### Embedded Music Objects

Own:

- document-stream representation
- rendering contracts inside the editor
- object-specific editing behavior
- translation between editor embedding and music payload data

Likely examples:

- keyboard embed
- staff embed

### Document Representation

Owns:

- notebook/document structure beyond raw UI concerns
- the relationship between editor content and embedded object payloads
- the distinction between notebook format and `MusicXML` music payloads

This is likely to become one of the most important architectural seams in the app.

### Persistence Services

Should remain abstract for now.

Early preferred direction:

- define service seams early
- allow spike code to save nothing or save to mocks
- avoid letting early UI choices force a backend shape prematurely

### Export Services

Own:

- `PDF` generation
- possibly later user-visible `MusicXML` import/export

This should stay separate from editor mechanics as much as possible, even if export initially depends on editor state.

## Inconsistencies And Open Questions

This section is intentionally first-class. These are the main places where the app-specific plan is not fully coherent yet.

### 1. The Executor Role Is Defined, But Its Concrete Inputs Are Not Yet Fully Enumerated

The executor role is now clear:

- load the initial services
- identify the first controller to hand off to

That handoff may depend on external conditions such as login state or URL information.

Not clear yet:

- which startup conditions will actually exist in v1
- whether notebook-open state, import state, or deep links should affect the initial handoff
- how much of that decision lives in one executor service versus helper services it consults

This matters because it affects how much startup branching should exist before the app enters the main editor flow.

### 2. The Editor Is Described As Both Core UI And Potential Feature

There is a mild structural tension between:

- a feature-oriented Polylith app
- an editor-first app where one surface dominates almost everything

Not clear yet:

- whether the editor should be the shell
- whether the editor is one feature mounted inside a broader shell
- whether object-specific tools are peer features or editor-owned subviews

This is probably the most important structure question after the embed model itself.

### 3. `MusicXML` Is Called The Native Music Payload Format, But Not The Full Document Format

Current notes are consistent that `MusicXML` matters, but not yet clear about scope.

Not clear yet:

- whether `MusicXML` represents only embedded music objects
- whether a notebook document wraps multiple `MusicXML` payloads plus editor content
- whether the notebook format should be editor-native, object-native, or export-native

This has major consequences for saving, import/export, and future migrations.

### 4. The Embed Model Is Now The First Proven Technical Seam

The first spike centered on `Quill` embed mechanics.
The current POC uses a custom Quill embed/blot and proved that path well enough to continue.

Now clearer:

- a custom blot/embed is viable enough for the first real application phase
- the first payload can round-trip through Quill Deltas
- one embed type can support multiple display modes through payload fields
- floating controls plus a dedicated dialog are workable for first-pass object editing
- width/height can be persisted in the embed payload and updated through the existing embed-change path
- generated `MusicXML` can feed staff rendering and basic playback

Still not clear yet:

- whether to use structured block wrappers
- whether to use placeholders with sidecar object data
- whether the POC payload shape should evolve into a notebook document model or be translated into a separate durable format
- how much of the POC object-editing UI should survive once a real document model exists

This is no longer a blocker for application planning.
The next architecture question is how to wrap the Quill Delta and music-object payloads in a durable notebook document model.

### 4.5. Rendering Library Choice Is Intentionally Flexible

The current candidate libraries were chosen mainly because they can render the needed visuals.

Still worth validating:

- whether `opensheetmusicdisplay` is the simplest viable path for staff rendering
- whether `react-piano` is the simplest viable path for keyboard rendering
- whether a smaller or simpler rendering option would fit the first real application phase better
- whether `@music-i18n/musicxml-player` should remain the playback path after the POC

Current preferred direction:

- choose the simplest component or library that can render the needed result well enough
- if two options are otherwise comparable, prefer the one that works better with `MusicXML`
- do not overcommit to an initial library choice if it adds complexity without helping the document/embed model
- keep playback behind the `player` feature service so the editor feature does not own the playback loadable or player lifecycle

### 5. Persistence Is Deferred, But Some Architectural Decisions Depend On It

Deferring persistence is a good spike choice, but it creates some ambiguity.

Not clear yet:

- what minimum document serialization shape is needed even for local testing
- whether temporary save/load seams should preserve realistic future constraints
- how much the initial document model should anticipate backend storage, local files, or both

The right stance for now is probably:

- keep persistence abstracted
- still define a minimal document contract early enough to support realistic spikes

### 6. Tabs Are Mentioned, But Their Role Is Underspecified

The notes say the app will have tab displays to jump to major sections, but the role of tabs is still fuzzy.

Not clear yet:

- whether tabs are notebook sections
- whether tabs are editor tool areas
- whether tabs are feature navigation
- whether tabs coexist with a left-nav or replace it

This matters because `modmod` uses tabs as a feature/subview mechanic, while this app may need tabs as part of the document workflow itself.

### 7. Inline Editing Versus Side-Panel Editing Is Still Unsettled

The architecture depends heavily on how embedded objects are edited.

Not clear yet:

- whether selection opens a properties panel
- whether editing should happen in a dedicated dialog by default
- how lightweight object adjustments, if any, should happen without opening that dialog

This will affect controller boundaries, view layering, and likely the object model itself.

Current preferred direction:

- embedded keyboard and staff objects should primarily render inside the document
- richer editing can open in a dedicated editor dialog
- the document surface does not need to host full inline editing for those objects in the first architecture phase
- lightweight floating controls can handle small object actions such as edit and resize

## Practical Near-Term Guidance

With the post-POC cleanup complete, the safest MVP planning path seems to be:

1. Treat the editor as the center of the app.
2. Keep persistence behind services and avoid hardcoding a backend model.
3. Keep the custom embed path as the leading editor-object implementation.
4. Design the durable document model before broadening the app shell.
5. Build new substantial React presentation components as class components and use the shared component/domain helper layers created during cleanup.

## Suggested Next Docs

During MVP planning, this note should probably split into smaller topic docs such as:

- feature mechanics
- build and asset flow
- document model and serialization
- editor embed architecture
- persistence and export boundaries
