# MVP Topic

## Purpose

Use this topic to define the first usable `music-notebook` product after the editor/embed POC.

The MVP should turn the proven POC mechanics into a coherent small application without pretending that every future architecture question is settled.

## Current Status

The editor/embed POC is proven and the post-POC React cleanup is complete.

MVP implementation is now underway.
The first-pass notebook document model exists as the `document-model` service.
The first account/session slice and Mongo-backed document persistence slice also exist.
The document model is still the client implementation seam for tabs, active editor content, document settings, and generic document objects; the server document record wraps that snapshot with ownership and metadata.
The first table implementation slice is now active through `quill-table-up` and a dedicated `table` feature.
That slice includes table insertion, row/column selection, keyboard cell navigation, column resizing, a feature-owned context menu view, and row/column/table operations.

Near-term planning should cover:

- hardening document save/open/new/rename/delete flows
- completing remaining document commands such as delete and duplicate UI
- hardening notebook document serialization around the current `document-model` snapshot
- Quill Delta consolidation with structured inline chord objects and larger music-object payloads
- document-level settings such as page layout and chord display style
- hardening table paste, table serialization/reload confidence, read-view pagination, and export behavior
- persistence and auth service seams as they move from first pass to durable behavior
- PDF export boundary and viable export strategy
- inline chord object insertion/editing behavior
- chord parser/normalizer implementation strategy, including whether to use `chord-symbol`
- account-gated save/export flow for anonymous users

For context bootstrap, assume:

- the POC mechanics are proven
- the first-pass document model and backend persistence wrapper are implemented, but the durable notebook format is not final
- account creation, login, logout, session restore, bearer refresh, and last-open-document metadata are implemented
- document list/create/save/open/save-as/rename/duplicate/delete routes exist server-side
- client document new/open/save/save-as/rename flows exist; delete/duplicate UI still needs hardening
- React cleanup is done and new substantial React components should be class components
- shared music editing controls now live in `src/mn/components`
- shared music theory helpers now live flat under `src/mn/shared`
- playback is behind the `player` feature service
- `accounts` owns account status, dialogs, `account-ui`, and logout intent flow
- `document` owns document command dialogs and save/open/rename orchestration
- `table` owns table selection, interaction handling, context-menu view registration, and table operation commands
- notebook tabs are persisted document metadata, not Quill objects
- chord parsing decisions are tracked in [Chord Name Parsing](chord-name-parsing.md)

## Current Implementation Baseline

Current MVP implementation pieces:

- `document-model` service in `src/mn/models/document-model.js`
- document typography default of 12px
- document-global paragraph styles: `Normal`, `Header 1`, `Header 2`, and `Header 3`
- main app shell with menu, editor region, and bottom document tabs
- bottom document tabs rendered by `src/mn/features/app/components/DocumentTabs.jsx`
- tab add, select, rename, and reorder through the document model
- tab rename starts on double click
- tab drag-and-drop reordering uses `dnd-kit`
- `EditorPage` loads Quill content from the active document tab and writes user edits back to that tab
- `document-format` service plus feature controller for document-level page size, orientation, margins, and base font size
- `paragraph-format` feature for paragraph style, direct paragraph formatting, alignment, and start behavior
- `editor-toolbar` service for grouped editor toolbar controls
- `music-object` feature owns keyboard/staff embed behavior, edit dialog, object-format dialog, and embed sessions
- `player` feature owns MusicXML playback through a registry service
- `table` feature owns table selection, keyboard navigation, context-menu view registration, and row/column/table operation commands
- `editor-interactions` lets features register Quill/editor DOM event handlers without moving feature behavior into `EditorPage`
- `editor-views` lets features register named React views and request that `EditorPage` mount them with feature-provided props

See [Document Model](document-model.md) for the current document-model service contract.

## Current MVP Thesis

The MVP is an editor-first music notebook where a user can:

- write rich text notes
- add tables to notes
- jump between notebook tabs
- write in an edit view backed by the continuous `Quill` editor stream
- review document layout in a read view
- insert page breaks
- insert a keyboard music object
- insert a staff music object
- edit those objects in a focused dialog
- try the editor in a low-friction anonymous mode
- create a simple username/password account with no email requirement
- save and reload notebook documents through a `MongoDB`-backed persistence seam
- export saved documents to `PDF` through an explicit export boundary if a viable library path is found

The MVP should preserve the POC's strongest finding:

- a custom `Quill` embed can carry structured music objects in the document flow

It should not preserve every POC implementation detail as production structure.

The application should remain document focused.
Account, persistence, export, and shell features should support the notebook document experience rather than become the center of the product.

## Target Audience

The MVP targets music theory instruction and simple music-aware note taking.

Example users:

- students taking notes for a music theory class
- instructors preparing notebook-style teaching material
- learners who need text, tables, keyboard diagrams, staff snippets, and short playback examples in one document

The app is not positioned as composition software for MVP.
Music objects support explanation, illustration, and study rather than full composition workflows.

## Product Scope

### Must Have

- single editor-first document surface
- document-focused application flow
- visible tabs for jumping between notebook tabs
- add, delete, rename, join, and reorder tabs from the document tab list
- drag-and-drop tab reordering
- edit view backed by the continuous `Quill` editor stream
- read view that renders paginated document layout
- view toggle between edit and read modes
- document zoom
- possible standard top menu in addition to formatting and icon toolbar controls
- page breaks
- portrait and landscape page orientation
- 8.5x11 Letter and A4 paper sizes
- global page margins
- paragraph styling with space before and space after
- paragraph indentation as a paragraph setting
- font size as a paragraph setting
- predefined paragraph styles: Normal, Header 1, Header 2, and Header 3
- rich text editing through `Quill`
- text-only paste
- text-only copy
- keyboard shortcuts for at least bold, italic, underline, and clear formatting
- likely find/search within document
- spellcheck disabled
- numbered lists
- bulleted lists
- multiple paragraphs inside numbered and bulleted list items
- table support in notebook content
- `MusicXML` as the native music specification for music payloads
- `tonal` as the preferred music theory library
- inline chord objects created from typed ASCII chord text
- keyboard embed insertion
- staff embed insertion
- table insertion
- dedicated music-object edit dialog
- visually simple embedded object rendering
- optional captions for music embeds
- music embed caption text can include context-aware `{{short}}`, `{{long}}`, and `{{key}}` tokens for values such as chord notation, friendly chord labels, keys, or scales
- music embed caption formatting with style, font size, alignment, bold, italic, and underline
- accessible embedded object toolbar with edit, play, border, and resize controls
- music embeds default to the available content width
- music embed rendering is width-driven and natural-height, without clipping
  captions or forcing a fixed preview height
- music embed captions appear under the embed
- music embeds can convert between keyboard and staff modes through the edit dialog
- inline chord objects render as formatted chord symbols inside the text flow
- inline chord objects can be edited through a simple floating editor field
- document save/load path behind a persistence service
- manual document save
- save status indicator
- unsaved changes warning
- document created and updated timestamps
- document rename
- document serialization that wraps editor content plus music-object payloads
- document save consolidates Quill Deltas into a unified notebook state
- document-level chord display style, with local inline/object overrides only when needed
- `MongoDB` as the first concrete persistence target
- simple username/password account creation
- password flow that avoids sending plain-text passwords to the server
- user-based auth token
- bearer tokens in request headers
- login rate limiting, with limit TBD
- username enumeration prevention using best practices
- document ownership checks
- anonymous mode for trying the editor before account creation
- save/export gated behind account creation or sign-in
- desktop and tablet layout support
- progressive web app foundation
- general help
- context-specific help
- app usage help
- music theory help
- basic `PDF` export boundary, unless no viable library path is found

### Should Have

- basic document title or notebook name
- current document name appears in the browser title, not as persistent on-screen header text
- basic notebook section labels
- clear empty document state
- color support if a spike proves the scope is manageable
- widow and orphan control if feasible
- reasonable keyboard-only access to object controls
- localized labels for controls and status text
- all edit-dialog fields use `MUI` controls, with localized labels and accessible names/descriptions
- grouped music edit fields should use shared `MUI`-based components where practical so localization, helper text, and accessibility behavior remain consistent
- help content that supports first-use learning without turning the app into a tutorial
- shared tests for document serialization
- UI tests for the highest-risk editor/embed workflows
- preservation of the in-progress anonymous document after account creation
- session restore through `HttpOnly` cookie and fresh bearer-token exchange
- last-open-document restore after successful login/session restore
- notebook-style background lines if they do not complicate editing or export

### Can Wait

- sync or collaboration
- multi-notebook library management
- complex navigation or app shell
- polished long-term document browser
- email collection or verification
- password reset and account recovery
- MFA
- end-to-end encryption
- multi-user editing
- final renderer/playback library commitment
- broad import/export beyond initial `PDF`
- cutting `PDF` export, except as a last resort
- inline full-featured music editing inside the document stream
- full music composition workflows
- phone-optimized layout
- dark mode
- presentation or slideshow mode
- non-music embeds such as drawing canvases
- tab stops or tab-based layout support
- superscript and subscript formatting
- all-caps formatting
- small-caps formatting
- rich external paste/import preservation
- rich external copy/export-to-clipboard preservation
- scrolling tab strip behavior
- first-run tips

## Device Targets

The MVP should target desktop and tablet devices as a progressive web app.

Tablet support matters because the document-focused editor and music-object controls should remain usable on touch-oriented medium screens.
Phones are not a primary MVP target, and the app does not need to be optimized for phone-sized workflows yet.

Handwriting input may become useful for tablet support if a good library fits the app.
It is not required for MVP.

Offline mode is a serious consideration for the PWA direction, especially for tablet use and document-focused writing.
The exact MVP offline commitment is undecided until investigation.

Document typography and paragraph styles are now part of the document model.
New documents default to 12px base typography.
The current default styles are `Normal`, `Header 1`, `Header 2`, and `Header 3`.
Header styles are bold, use sizes 25, 20, and 15, and start on a full line.
Style selection is available in paragraph formatting and the toolbar.
Paragraph direct formatting should preserve which properties were changed so inherited style changes still apply to untouched properties.
For now, paragraph formatting can reset all direct overrides back to the selected style; per-property reset can wait.

Color support is a likely MVP implementation area, but the exact scope still requires a spike before it becomes a firm feature commitment.
If font/text color is included, it should be treated as a shared formatting capability across paragraph formatting, selected text formatting, and object/caption formatting rather than a one-off control.
The likely implementation path is to adapt `modmod`'s `ColorSelector` / `ColorPickerDialog` pattern into the local Music Notebook shared component layer.
Color should follow a clear cascade:

1. document/default style
2. paragraph style
3. inline selected-text formatting
4. local object or caption formatting

Inline color choices override paragraph styles, and paragraph styles override document defaults.
Music embed captions and object text should inherit from document or paragraph context by default, with local object formatting only when the object explicitly overrides that inherited color.
The MVP now includes a few predefined document paragraph styles.
Broader named style management, style editing, and style creation remain later steps.
Multi-column document layout needs investigation before deciding whether to cut it from MVP.
Page breaks are required and should be represented as explicit objects in the `Quill` editor stream.
Read view and export should support portrait and landscape orientation as global document settings.
Edit view is the first implementation target: the area under the main menu should be filled by the editor toolbar and editor surface.
Edit view uses the global page size as a wrapping width, but it does not promise exact automatic pagination.
Read view is deferred until the continuous edit view and document model are stable.
Read view is where automatic page overflow and page boxes belong.
The MVP should support at least 8.5x11 Letter and A4 paper sizes as global document settings.
The MVP should support global page margins.
Paragraph styling should include at least font size, space before, space after, and indentation.
Paragraph settings may be used to keep paragraphs together, including to support multi-paragraph numbered or bulleted list items.
Paragraph settings should include start behavior values for continuous flow, start on a full line, and next page.
Start on full line is a block-start option for paragraphs, headings, tables, and other blocks.
Next page is primarily a read-view/export instruction unless edit view later adds a simple visible marker.
Widow and orphan control is strongly desired, but likely needs investigation across editor rendering and `PDF` export.
The `PDF` library/export path is still an open question.
If no good `PDF` library or export strategy can support the required document shape, `PDF` export may be cut from MVP, but only as a last resort.
Using embedded Chrome through `Puppeteer` is an acceptable `PDF` export strategy if it gives the best fidelity for editor-rendered documents.

## Account And Access Model

The MVP should allow users to begin with as little friction as possible.

Anonymous mode:

- user can open the app and start writing immediately
- user can create and edit keyboard/staff music objects in the current session
- user cannot save documents while anonymous
- user cannot export documents while anonymous
- save and export actions should guide the user toward account creation or sign-in
- the in-progress anonymous document should be preserved through account creation if feasible

Account mode:

- user creates an account with a username and password
- email address is not required for MVP
- authenticated users can save, reload, and export documents
- login and account-creation password fields use the adapted shared `PasswordInput` pattern from `modmod`
- password fields should include a localized accessible visibility toggle
- account-creation password fields may include optional localized complexity-rule feedback

Password handling direction:

- passwords should not be sent to the server in plain text
- client requests a salt or login/register challenge from the server before submitting password-derived material
- client hashes the password before submission
- server stores password verification data, not the raw password
- server-side storage should still avoid treating the client hash as a reusable plain password
- MVP does not include end-to-end encryption for notebook document contents
Auth should use a user-based token, likely sent as a bearer token in request headers.
Login attempts should be rate limited, with the exact number still TBD.
Username enumeration prevention should follow best practices.
Document ownership checks are required.
MFA is out of scope for MVP.
Password reset is only possible if email is supplied, and email remains out of scope unless the account model changes.
Privacy guarantees are limited without end-to-end encryption.

Near-term implementation note:

- document persistence is the current major product slice
- save is gated behind account creation or sign-in
- account creation and login are implemented before the first real save UI
- the anonymous in-progress document should be preserved through that account transition if feasible

## Embedded Object Controls

Music object embeds should expose a toolbar on hover or focus.

Music object embeds should support an optional caption.
Captions should appear under the embed.
Caption text is edited in the music-object edit dialog.
Caption text can include `{{short}}`, `{{long}}`, and `{{key}}` tokens.
Caption formatting is edited in the music-object format dialog.
Current caption formatting includes style, font size, alignment, bold, italic, and underline.
Caption formatting should inherit document/style context by default, with local object formatting only when explicitly set.
Music embeds are large inline Quill embed leaves, similar to image embeds. Text
does not wrap around them through float-style wrapping.
Side-by-side music layout should use tables or a later explicit layout container.
Music embeds should default to the available content width, clamped by shared
music-object layout limits.
Music embed width is the primary resize/scale value. The rendered height should
come from the preview content: keyboard previews compute their host height from
the piano width/key ratio, staff previews scale the generated SVG naturally, and
captions remain visible below the preview.

Minimum toolbar actions:

- edit
- play
- border controls
- resize

The toolbar must be accessible.
The controls should be reachable without hover, including keyboard and touch-oriented access paths.
Embeds should delete like a character.
Duplicate should work through copy/paste.
Keyboard/staff conversion should happen in the edit dialog, matching the POC direction.
MVP embed alignment is provisional under the inline/image-like model and should
be reconciled with paragraph alignment and table-cell layout before it is
treated as a durable layout contract.
Embed content remains limited to a single chord or scale unless later investigation expands it.
The current POC embed edit options should be treated as the minimum MVP editing functionality.

## Inline Chord Objects

Inline chord objects are distinct from larger keyboard/staff music embeds.

The user should be able to type an ASCII chord symbol in the editor and have the app replace it with a properly formatted inline chord object.

The inline chord object should:

- stay in the text flow
- render as a compact formatted chord symbol
- inherit the document-level chord display style by default
- allow a local display-style override only when a specific chord needs different presentation
- preserve the source chord text or enough normalized data to reopen editing
- use the same chord parser/normalizer as the music-object dialog
- support direct chord names first, with Roman and numeric input considered if the shared parser makes that practical
- expose a simple floating editor field when selected or activated
- avoid opening the full music-object edit dialog for ordinary inline chord edits
- round-trip through the notebook document model as structured data, not only styled text

The floating editor field should be intentionally small.
It is for correcting or replacing the inline chord symbol, not for configuring keyboard/staff display, playback, or embed sizing.

Editing update:

- key selection for chord/progression editing includes major and minor modes
- scale editing is excluded from this major/minor key-mode behavior
- chord editing is moving toward one unified input that auto-detects direct chord names, Roman numeral degrees, and numeric degrees
- the older separate chord-name and chord-degree edit modes may be removed once the unified input is proven in the dialog
- numeric chord input uses the default chord quality implied by the selected key quality
- key quality is the shared tonal-context selector for major, minor, modal, pentatonic, and blues scale contexts; scale editing should use that selector rather than a separate mode dropdown
- numeric chord input is supported as an alternative to Roman numerals
- numeric chord input avoids relying on Roman numeral capitalization to encode major/minor quality
- numeric input is recognized directly from the field value
- switching between major and minor modes immediately rebuilds the current numeric chord degree and updates the keyboard or staff preview
- example: in `C`, numeric degree `2` resolves to `D-F-A` in major mode and `D-F-Ab` in minor mode
- Roman numeral capitalization remains explicit quality notation: lowercase `ii` means a minor second-degree chord, uppercase `II` means a major second-degree chord
- in a minor key, numeric `2` should resolve to the diatonic diminished second-degree chord, but Roman `ii` should remain a minor chord unless the user explicitly enters diminished notation
- Roman numeral and direct chord-name input should support the same quality aliases where their syntax overlaps
- accepted diminished aliases should include `dim` and `diminished`, normalized for display to `°`
- accepted augmented aliases should include `aug` and `augmented`, normalized for display to `+`
- accepted half-diminished aliases should include `m7b5`, `ø7`, and possibly MuseScore-compatible `0`
- chord text input should preserve spaces while typing, including trailing spaces, while parser resolution may trim for interpretation
- chord text input should not rewrite the user's visible text while typing
- examples: `iidim`, `ii diminished`, and `Cdim` should resolve as diminished; `iaug` and `Caug` should resolve as augmented; `viim7b5`, `viiø7`, and possibly `vii07` should resolve as half-diminished

## Notebook Tabs

Notebook tabs are persisted document metadata.
Each tab owns one Quill editor content payload, and the active tab determines which payload the editor is currently editing.
Tabs are not Quill objects.

In edit view, tabs should appear at the bottom of the screen.
In read view, tab placement may become configurable.

Tab behavior:

- tabs may be color coded
- tabs may compress to fit more tabs in the available strip
- compressed tabs should expand on hover, focus/tab entry, or selection
- tab scrolling is out of scope
- an ellipsis-style overflow selector may be used for tabs that do not fit
- add, delete, rename, join, and reorder actions should live in the tab list
- tabs should support drag-and-drop reordering
- the default tab title is intentionally unsettled; the model currently allows an empty title
- tabs may be empty
- deleting or joining a tab with content should require confirmation

Current implementation:

- tabs render at the bottom in edit view
- single click selects a tab
- double click edits the tab name inline
- plus adds a tab after the active tab
- right-side arrow buttons reorder the active tab left or right
- drag-and-drop reorders tabs
- delete and join are model operations but do not yet have finished UI controls

The tab interaction must remain accessible for keyboard and tablet users.

## Table Scope

Tables are an MVP feature, but table support can be intentionally limited.

The current implementation uses `quill-table-up` plus a dedicated local
`table` feature.
See [Quill Table Up Spike](quill-table-up-spike.md).

MVP table support should include:

- table borders
- header row or header column support
- basic row and column editing
- music/object embeds inside table cells
- row and column selection affordances
- keyboard navigation from cell to cell
- column width resizing

MVP table support may exclude:

- nested tables
- merged/split cells
- pasted external table preservation
- spreadsheet-like behavior
- complex table styling

The goal is useful notebook tables, not a full table editor.
Current table interaction work supports row/column selection, drag selection
for multiple columns, `Tab`/`Shift+Tab` cell navigation, adding a row from the
last cell, column resizing, a selection-aware context menu, and basic
insert/delete row/column/table operations.
Tables may visually extend beyond the page content width while editing; the
page margin/content guide should remain tied to the effective page width so the
user can size the table back to fit.

## Paragraph Formatting Scope

Tentative starting point for paragraph formatting:

- paragraph style
- font size
- font/text color, if color support is included
- alignment
- space before
- space after
- paragraph indentation
- keep lines or paragraphs together
- page break before or explicit page break
- start on next full line / block-start behavior
- widow and orphan control if feasible
- numbered lists
- bulleted lists
- list continuation and multi-paragraph list support

This list should be trimmed to the required MVP set after investigation.

## Inline Formatting Scope

Tentative starting point for inline formatting:

- font/typeface, probably, but may be limited to paragraph styles
- bold
- italics
- underline
- font/text color, if color support is included

This list should be trimmed to the required MVP set after investigation.

## Architecture Priorities

The MVP should create these seams early:

- document model and serialization
- persistence service
- authentication/account service
- export service
- music-object payload normalization
- editor/embed integration

The document model is the most important MVP implementation seam.
The document remains the main product surface.

Preferred direction:

- treat the Quill Delta as the editor stream
- keep music-object payloads explicit and identifiable
- wrap both in a notebook document format owned by the app, not by Quill
- consolidate per-tab Quill Deltas, document settings, tab metadata, and music-object payloads into one saved notebook state
- allow the POC payload shape to be translated rather than frozen
- keep the editor/document architecture compatible with future multi-user editing
- model visible tabs as part of the persisted notebook document
- place notebook tabs at the bottom in edit view
- treat edit view and read view as distinct document presentations
- keep edit view `Quill`-native and continuous
- keep read view paginated and layout-focused, likely using a separate renderer over the notebook document model/editor stream
- store manual page breaks as stream objects, but treat automatic page boundaries as computed layout metadata
- treat document zoom as transient app view state, not persisted document data
- use Quill's available undo/redo behavior across embeds while treating tab operations as document-model operations
- treat embeds as a character for selection behavior if possible
- treat any standard top menu as a supporting document command surface
- treat `MusicXML` as the native music specification
- use `tonal` as the preferred music theory library for chords, scales, and progressions
- allow temporary conversion into library-specific formats for rendering, playback, or export adapters
- store notebook documents in `MongoDB` through a service boundary
- scope saved documents by app id and authenticated account id
- use app-owned UUIDs for accounts and documents
- keep account/auth mechanics separate from the document model where practical

## POC Pieces To Carry Forward

- custom Quill embed/blot direction
- keyboard and staff display modes as music-object variants
- dedicated dialog editing as the default object-editing flow
- current POC embed edit options as the minimum editing baseline
- accessible hover/focus toolbar for small object actions
- width-driven object sizing, with legacy height payload compatibility where
  older POC-shaped data still carries it
- generated `MusicXML` as the staff/playback payload bridge
- UI tests around editor/embed behavior

## POC Pieces To Rework

- large music embed React implementation
- any remaining native edit-dialog form controls; MVP edit fields should use shared `MUI`-based controls
- `modmod`-derived password input has been adapted for account creation and login UI
- POC-shaped payload as the only durable document structure
- any shell layout that exists only to support the spike
- renderer/playback coupling that makes document serialization harder
- debug-only document JSON as the only readout path

## Current Decision Frontier

Resolved enough for implementation:

- account records use app-owned UUIDs, normalized usernames, password hash versioning, optional email, and last-open-document metadata
- auth uses deterministic username salts, client-side password hashing, durable `HttpOnly` session cookies, and short-lived bearer tokens
- MongoDB is the first concrete account/session/document persistence target
- saved documents are scoped by app id and authenticated account id
- the first saved document record wraps `document-model` JSON content with name, size, created/modified timestamps, and `lockedAt`

Still open:

1. What is the first durable notebook document format beyond the current `document-model` snapshot?
2. What `PDF` library or export strategy is viable for the MVP document shape?
3. Which renderer/playback libraries are good enough to keep through MVP?
4. How should the anonymous document be preserved when a user creates an account?
5. Should anonymous work survive page refresh, or only the current browser session?
6. What should happen if an anonymous user tries to export before signing up?
7. What is the first visible naming convention for a newly added tab?
8. What exact confirmation flow should joining tabs use?
9. Does read view affect only presentation, or does it create persistent page/layout metadata beyond manual page-break objects?
10. Should `PDF` export mirror read view exactly in MVP?
11. If `PDF` export is cut as a last resort, what replaces it in the MVP user promise?
12. Are page headers and footers part of MVP read view or `PDF` export?

## Suggested Build Order

1. Harden the current notebook document model and serialization tests.
2. Finish the current document command flows, especially delete and duplicate.
3. Tighten save/open/new/logout unsaved-work prompts.
4. Preserve the anonymous in-progress document through successful account creation if feasible.
5. Harden the MongoDB persistence service around the current document shape.
6. Harden account-gated save/export handling for anonymous users.
7. Continue editor/embed selection, caret, and natural-sizing polish for large inline music objects.
8. Add delete/join tab UI with confirmation flows.
9. Add explicit page-break objects in the editor stream.
10. Harden the music embed component boundaries.
11. Add the first `PDF` export service path.
12. Tighten accessibility, localization, and UI tests around the MVP workflow.

## Open Questions

Anything in this section remains an open question until it is explicitly answered and moved into the decided MVP scope.

### Document Basics

- Should MVP save whole documents, revisions, or both?
- How should Quill Deltas be consolidated into the unified saved notebook state?
- How should document title editing work if the current name is shown in the browser title rather than as persistent on-screen text?
- Should duplicate and save-as use identical name-conflict behavior to create and rename?
- How should delete and duplicate fit into the current document flow?

### Tabs

- What is the first visible naming convention for a newly added tab?
- How should compressed tabs behave for overflow, color coding, hover, focus, and selection?
- Should a new tab become active immediately when added from inside the current tab?
- Should joining tabs append source content, insert at the current cursor, or offer both later?
- What is the maximum practical number of visible tabs before compression or ellipsis overflow selection?

### Editor Behavior

- How should edit/read view preference be stored: per user, per document, or transient session state?
- Where should view commands live for edit view and read view?
- Where should document zoom controls live?
- What should find/search include for MVP?
- Can embeds be treated as a single character in Quill selection behavior?
- Should pasted or inserted image embeds be supported in MVP, and if so, should Quill image sources be stored as external URLs, data URLs, or app-managed uploaded assets? See [Paste](paste.md).
- How should the UI prevent page breaks inside tables?
- Can continuing bullets/numbering after page breaks in a list be handled through paragraph style or list style behavior?
- What are the default font, paragraph style, and visual theme?

### Menus, Toolbars, And Help

- Where should insert commands live for keyboard, staff, and table: formatting toolbar, icon toolbar, top menu, or a dedicated insert control?
- Is a standard top menu needed, or can formatting plus icon toolbar controls carry the MVP command set?
- If a top menu exists, should it be limited to undo, redo, save, save as, open, export, help, and about?
- Where should general help live, and how should context-specific help appear without interrupting writing?
- What should the help menu structure be?
- How should keyboard shortcuts be discoverable?
- Should context help include a help button within modal contexts?
- What content belongs in About?

### Edit Dialog Controls

- What `MUI` field components should be standard for text input, selects, checkboxes, numeric fields, and grouped music controls?
- How should localized labels, helper text, validation errors, and accessible descriptions be wired consistently across all edit-dialog fields?
- Which field interactions need UI tests for keyboard access and screen reader naming?

### Formatting

- What final color scope is appropriate for MVP: paragraph font color, selected text color, object/caption font color, highlight color, table color, object border color, or a smaller subset?
- Can likely MVP color support meet accessibility and export requirements without expanding the MVP too far?
- What shared palette or token system should paragraph, text, and object formatting use?
- How should the app adapt `modmod`'s `ColorSelector` / `ColorPickerDialog` pattern for paragraph, text, and object color picking?
- Should MVP expose font picking at all, and if so, should it apply to paragraph styles, inline text, music embed captions, object labels, or only a constrained preset set?
- Beyond title and a few predefined header styles, are named styles useful enough for MVP, or should the editor keep simpler direct formatting?
- If named styles exist, are they document-level styles, application presets, or export-only helpers?
- Is multi-column document layout useful enough for MVP, and can it work with read view, export, and tablet layout?
- Can paragraph space before/after be represented cleanly in Quill Deltas and `PDF` export?
- Should start-on-full-line be a direct paragraph option, a default on heading/table styles, or both?
- Can Quill support multiple paragraphs inside a single numbered or bulleted list item cleanly enough for editing, serialization, and export, or should paragraph keep-together settings model that behavior?
- Is widow/orphan control feasible with the chosen editor and export path?

### Tables

- Does `quill-table-up` remain stable enough through save/reload, paste, read view, and `PDF` export to keep as the MVP table implementation? See [Quill Table Up Spike](quill-table-up-spike.md).
- What should the insert table size picker look like?
- Should MVP support header row, header column, or both?
- What table border presets are needed?
- Should MVP support cell alignment?
- Can tables split across pages?
- How should table headers behave across page breaks?

### Music Embeds

- What is the accessible interaction pattern for embed toolbars across mouse, keyboard, and tablet touch?
- How should music embed caption templates and formatting serialize into the final durable notebook schema and export to `PDF`?
- Should music embed captions and object text ever allow font-family picking, or should they use document styles and constrained presets?
- What table-cell and explicit layout-container controls are needed for side-by-side music embeds?
- Which renderer/playback libraries are good enough to keep through MVP?
- Which render/playback libraries require temporary conversion away from `MusicXML`, and where should those adapters live?
- Are there any music theory needs for MVP that `tonal` does not cover well?
- Should playback include count-in or tempo controls?
- Should caption settings be exposed through a hover/focus control?
- Does MVP need any embed content beyond a single chord or scale?
- What exact payload shape should preserve key quality and original numeric progression input in the durable notebook document model?
- Should numeric progression input support only single degrees `1` through `7`, or later accept richer degree syntax?
- When should the separate chord-degree edit mode be removed from the dialog after unified chord input is fully proven?
- Which additional typed music-symbol aliases should the parser support beyond diminished, augmented, and half-diminished?
- Can MIDI input improve music embed creation or editing without turning MVP into a composition tool?
- What browser and device support constraints apply to MIDI input?

### Page And Export

- Does read view affect only presentation, or does it create persistent page/layout metadata beyond manual page-break objects?
- Should `PDF` export mirror read view exactly in MVP?
- If `PDF` export is cut as a last resort, what replaces it in the MVP user promise?
- Are page headers and footers part of MVP read view or `PDF` export?
- How should image embeds be laid out, constrained, persisted, and exported in read view and `PDF` output? See [Paste](paste.md).
- How should page breaks be represented in the editor stream and exported document?
- Should notebook documents support page headers and footers, and if so, are they document-wide or tab-specific?
- How should global Letter/A4 page size and portrait/landscape orientation be represented in the document model and export path?
- Are global page margins enough for MVP, or is there a later need for tab-specific margins?
- Which `PDF` library best supports Quill content, custom embeds, page breaks, table borders/headers, and paragraph spacing?
- Should MVP prefer `Puppeteer`/embedded Chrome export over a direct `PDF` generation library for fidelity?
- Should page numbering be supported?
- What are export filename defaults?
- Should print support be separate from `PDF` export?
- Should export support current tab, full notebook, or both?
- Should users see a `PDF` preview before export?
- How are manual page breaks shown in edit view?
- How does read view indicate automatic page overflow?
- Do notebook-style background lines appear in exported `PDF`?

### Accounts And Security

- What exact client/server password hashing and verification protocol should MVP use?
- What password complexity rules should account creation enforce and display?
- Should password complexity feedback appear live while typing, only after blur, or only after submit?
- Should the server also apply a slow server-side hash to the client-derived verifier before storage?
- How should salts, challenges, and password upgrades be represented in the user record?
- Should usernames be case-sensitive, case-preserving but case-insensitive, or normalized?
- What username and password constraints are acceptable without adding too much signup friction?
- Is end-to-end encryption a post-MVP direction, or intentionally outside the product model?
- What are the sign-in/session duration rules?
- How should logout behave?
- Should MVP support change password?
- Should MVP support delete account?
- How should user-based auth tokens be stored?
- What is the exact login rate limit?
- How should username enumeration prevention be implemented?
- How are document ownership checks enforced at every document endpoint?
- Should MVP support backup/export of raw notebook data?
- What privacy policy expectations apply even without email collection?
- If email is optionally supplied later, should password reset become available?
- How should CSRF protections work with bearer tokens?
- What replay prevention is needed for auth and document save requests?
- How should the app prevent iframe embedding?
- Where should final escaping/sanitization happen for database writes and UI rendering?
- What values should remain unescaped while in transit so structured document data stays intact?

### Anonymous Mode

- Does anonymous mode persist to browser storage, or does it disappear on refresh?
- Can an anonymous document be attached to a new account without requiring a special migration path?
- Should export require a saved document, or only an authenticated user?
- What should anonymous users see when attempting save or export?

### Sharing And Collaboration

- Is there a need for document ownership/sharing in MVP, or strictly private documents?
- What document and persistence choices keep future Quill-based multi-user editing practical?

### Devices, PWA, And Offline

- What is the smallest tablet viewport the MVP should actively support?
- What minimum behavior should phone users get if they open the app anyway?
- Is there a handwriting input library that fits the editor/document model well enough to adopt later?
- What PWA capabilities are MVP: installability, offline shell, offline anonymous editing, or background sync?
- How should PWA offline behavior interact with authenticated Mongo-backed documents?
- Is offline mode required for MVP, or should MVP only preserve an installable online-first PWA foundation?
- If offline editing is supported, what conflict and sync model is acceptable before multi-user editing exists?
- Should MVP preserve local drafts?
- What happens if save fails?
- Should there be a network status indicator?

### Accessibility

- All accessibility decisions should be documented with references to applicable standards and any other useful implementation references.
- What is the required focus order for toolbar, tabs, embed controls, and editor content?
- What screen reader labels are needed for music embeds?
- Should MVP include reduced-motion handling?
- Is the high contrast level sufficient without dark mode?
- What touch target sizes are required for tablet?

### Investigation Spikes

- Quill tables, including the current `quill-table-up` implementation path
- multi-paragraph list items
- page breaks and read view
- `PDF` export via `Puppeteer`
- offline/PWA behavior
- color support
- columns
- alphaTab for post-MVP tablature, Guitar Pro import, and practice/playback objects
- pitchy for post-MVP microphone pitch detection and voice exercise objects
- MIDI input
- exercise objects
- guided score capture from MIDI input
- handwriting input

## Stretch Goals

- end-to-end encryption for notebook document contents after MVP
- multi-user document editing built on the Quill-based editor foundation after MVP
- fuller music composition workflows after the notebook/document experience is stable
- handwriting input for tablet users if a suitable library is found
- MIDI input for music embeds if investigation shows it fits the document workflow
- tablature and Guitar Pro import through alphaTab if a spike proves it fits the notebook object model
- voice-aware exercise objects using pitchy if a spike proves browser microphone pitch detection is stable enough
- exercise objects for short note/chord practice sequences
- guided MIDI-to-score insertion after the notebook MVP is stable
- richer offline-first PWA behavior after the core save/load model is stable

### Exercise Objects

Exercise objects are a post-MVP stretch goal.
They would let a user define short practice or teaching sequences made from notes, chords, scales, and octave ranges.

Possible exercise settings:

- note and chord sequence patterns
- scale sweep direction and range
- octave sweep direction and range
- key and mode
- time signature
- tempo
- beat style, such as straight, swing, or waltz
- repeat count or loop behavior

This should stay distinct from full composition workflows.
The goal is structured practice material that can be rendered, played, and reused inside a notebook document.

### Guided MIDI Score Capture

Guided MIDI score capture is not an MVP feature and may be further out than the first post-MVP work.
The idea is to let a user capture raw MIDI note events and then guide the app toward a first approximation of a score.

The app could ask for interpretation settings such as:

- key
- time signature
- tempo or quantization grid
- clef or staff assignment
- pickup measure behavior
- whether the capture is melody, chords, or a simple two-hand keyboard pattern

The durable model should preserve both the raw MIDI capture and the user's interpretation choices so the generated score can be revisited.
The generated representation should target `MusicXML`, with enough editing controls to correct rhythm, spelling, ties, voices, measures, and notation details.

This remains document-supporting functionality, not a pivot into full composition software.

## Done Means

The MVP is done when a user can try the editor anonymously, create an account, save a small music notebook document to `MongoDB`, reload it, add text plus keyboard/staff objects, edit and resize those objects, and export a basic `PDF` without depending on debug-only POC paths.

The application can still be small.
The important thing is that its core document loop is real.

## Related Topics

- [Base Dialog Design](base-dialog.md)
- [Accounts](accounts.md)
- [alphaTab Investigation](alphatab-investigation.md)
- [Chord Name Parsing](chord-name-parsing.md)
- [Document Model](document-model.md)
- [Editor Toolbar](editor-toolbar.md)
- [MVP Implementation Plan](implementation-plan.md)
- [Main Menu](main-menu.md)
- [Paged View Mode Spike](paged-view-mode-spike.md)
- [Paste](paste.md)
- [Pitchy Voice Exercise Investigation](pitchy-voice-exercises.md)
- [Quill Embed Navigation](quill-embed-navigation.md)
- [Quill Table Up Spike](quill-table-up-spike.md)
- [View Mode](view-mode.md)
- [Music Notebook App Architecture](../architecture/app-architecture.md)
- [Quill Integration](../architecture/quill-integration.md)
- [Testing Strategy](../testing/testing-strategy.md)
- [Initial POC](../poc/initial-poc.md)
- [React Cleanup](../react-code/react-cleanup.md)
