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
- saving and persistence now have a first MongoDB-backed MVP slice, while export and read-view layout still need planning

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

This is one of the most important architectural seams in the app.
The first-pass implementation is the `document-model` service under `src/mn/models`.
It owns tabs, active tab state, per-tab editor content, document settings, typography defaults, document paragraph styles, and generic objects.
The persistence schema is still open, so the current model snapshot should be treated as the implementation seam rather than the final database contract.

Current formatting-related seams:

- `document-format` is a global reusable service for document-level page and typography settings
- the `document-format` feature controller owns menu/dialog orchestration for those document-wide settings
- `paragraph-format` owns paragraph style selection, direct paragraph formatting, alignment, and start behavior
- document styles are stored with the document, not as hardcoded UI-only presets
- `css-vars` is a reusable service for reading and writing CSS custom properties where document or app styling needs a runtime bridge

The old page-format naming should be avoided.
The app has document formatting, not per-page formatting.

### Persistence Services

The first persistence slice is implemented for accounts and documents.
It should still be treated as a service boundary, not as permission to couple
the document model directly to MongoDB.

Current direction:

- document-model owns the client document snapshot and dirty state
- document feature owns client save/open/new/rename flow and dialogs
- server document feature owns authenticated Express routes and Mongo access
- account/auth identifies ownership through bearer tokens
- the client does not send `accountId` for document operations
- the client sends `X-Music-Notebook-App-Id`; the server combines app id and authenticated account id as document scope
- Mongo records wrap the notebook document content with metadata such as name, size, created/modified/locked times, app id, and account id

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
- width is the primary persisted scale input and can be updated through the
  existing embed-change path; legacy height metadata may remain, but rendered
  height is natural and should not clip previews or captions
- generated `MusicXML` can feed staff rendering and basic playback
- music-object behavior belongs behind the `music-object-controller` and controller-owned embed sessions, while the Quill blot remains the Quill adapter
- music-object captions can carry a template plus caption formatting, including style, size, alignment, bold, italic, and underline
- caption templates currently support `{{short}}`, `{{long}}`, and `{{key}}`
- music objects are large inline Quill embed leaves, similar to images; tables or a future explicit layout container own intentional side-by-side music layout

Still not clear yet:

- whether to use structured block wrappers
- whether to use placeholders with sidecar object data
- whether the POC payload shape should evolve into a notebook document model or be translated into a separate durable format
- how much of the POC object-editing UI should survive once a real document model exists
- whether object/caption styles should always reference paragraph styles or later use a separate style type

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

### 5. Persistence Exists, But The Durable Notebook Format Is Still Young

The first MongoDB path exists and is good enough for MVP hardening.

Now clearer:

- accounts use app-owned UUIDs
- documents use app-owned UUIDs
- document APIs are account-scoped from bearer auth
- document records carry app id, account id, name, JSON content, JSON byte size, created/modified timestamps, and a future `lockedAt` field
- list APIs return metadata; full document APIs include content

Still not clear yet:

- whether saved document revisions should be whole snapshots, patches, or both
- how locked documents will behave once local PWA editing is implemented
- whether duplicate/save-as should enforce name conflicts exactly like create/rename
- where sharing metadata should live when read-only sharing is introduced later

### 6. Tabs Are Document Metadata

Notebook tabs are now a document-model concept, not feature navigation and not Quill objects.

Current implementation:

- tabs live in the `document-model` service
- each tab owns one Quill Delta payload
- the active tab determines which payload `EditorPage` is editing
- tab metadata is persisted as part of the notebook document snapshot
- bottom tabs in edit view are rendered by the app feature
- tab add, select, rename, and reorder controls call document-model operations
- Quill loads active-tab content from the model and writes user edits back to the active tab

This separates document structure from application navigation.
Feature navigation can still exist separately later, but notebook tabs should be treated as part of the user's document.

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

With the post-POC cleanup complete and the first account/document persistence
slices underway, the safest MVP implementation path is:

1. Treat the editor as the center of the app.
2. Keep persistence behind services and avoid coupling the document model directly to MongoDB.
3. Keep the custom embed path as the leading editor-object implementation.
4. Harden the first-pass document model before committing to a final durable notebook format.
5. Build new substantial React presentation components as class components and use the shared component/domain helper layers created during cleanup.
6. Use cross-feature UI services for deliberate workflow bridges such as document save prompting account login.

## Suggested Next Docs

The broad architecture topic is now split into smaller topic docs. Use:

- feature mechanics
- build and asset flow
- document model and serialization
- editor embed architecture
- persistence and export boundaries
