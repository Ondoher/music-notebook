# MVP Topic

## Purpose

Use this topic to define the first usable `music-notebook` product after the editor/embed POC.

The MVP should turn the proven POC mechanics into a coherent small application without pretending that every future architecture question is settled.

## Current MVP Thesis

The MVP is an editor-first music notebook where a user can:

- write rich text notes
- add tables to notes
- jump between notebook sections with visible tabs
- switch the editor between continuous view and page view
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
- visible tabs for jumping between notebook sections
- add, delete, and rename sections from the document tab list
- drag-and-drop tab reordering
- continuous editor view
- page editor view
- view toggle between page and continuous modes
- document zoom
- possible standard top menu in addition to formatting and icon toolbar controls
- page breaks
- portrait and landscape page orientation
- 8.5x11 Letter and A4 paper sizes
- global page margins
- paragraph styling with space before and space after
- paragraph indentation as a paragraph setting
- title paragraph style
- at least one header paragraph style
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
- keyboard embed insertion
- staff embed insertion
- table insertion
- dedicated music-object edit dialog
- visually simple embedded object rendering
- optional captions for music embeds
- accessible embedded object toolbar with edit, play, border, and resize controls
- music embeds default to half the effective page width
- music embed captions appear under the embed
- music embeds can convert between keyboard and staff modes through the edit dialog
- document save/load path behind a persistence service
- manual document save
- save status indicator
- unsaved changes warning
- document created and updated timestamps
- document rename
- document serialization that wraps editor content plus music-object payloads
- document save consolidates Quill Deltas into a unified notebook state
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
- basic notebook section labels
- clear empty document state
- color support if a spike proves the scope is manageable
- widow and orphan control if feasible
- reasonable keyboard-only access to object controls
- localized labels for controls and status text
- all edit-dialog fields use `MUI` controls, with localized labels and accessible names/descriptions
- help content that supports first-use learning without turning the app into a tutorial
- shared tests for document serialization
- UI tests for the highest-risk editor/embed workflows
- preservation of the in-progress anonymous document after account creation
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

Color support is a serious MVP consideration, but the exact scope requires a spike before it becomes a firm feature commitment.
The MVP should include at least a title paragraph style and one header paragraph style.
Broader named style support needs investigation and may be skipped if it does not prove useful enough for MVP.
Multi-column document layout needs investigation before deciding whether to cut it from MVP.
Page breaks are required.
Page view and export should support portrait and landscape orientation as global document settings.
The MVP should support at least 8.5x11 Letter and A4 paper sizes as global document settings.
The MVP should support global page margins.
Paragraph styling should include at least normal font controls plus space before, space after, and indentation.
Paragraph settings may be used to keep paragraphs together, including to support multi-paragraph numbered or bulleted list items.
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
- login and account-creation password fields should use an adapted `BasePasswordInput` pattern from `modmod`
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

## Embedded Object Controls

Music object embeds should expose a toolbar on hover or focus.

Music object embeds should support an optional caption.
Captions should appear under the embed.
Caption formatting should inherit the preceding context by default, with a possible settings hover button if needed.
Music embeds should default to half the effective page width.

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
MVP embed alignment is limited to text wrap or new line only.
Embed content remains limited to a single chord or scale unless later investigation expands it.
The current POC embed edit options should be treated as the minimum MVP editing functionality.

Editing update:

- key selection for chord/progression editing includes major and minor modes
- scale editing is excluded from this major/minor key-mode behavior
- chord progression editing uses the default chord quality implied by the selected key mode
- numeric progression input is supported as an alternative to Roman numerals
- numeric progression input avoids relying on Roman numeral capitalization to encode major/minor quality
- numeric input is recognized directly from the field value
- switching between major and minor modes immediately rebuilds the current numeric chord degree and updates the keyboard or staff preview
- example: in `C`, numeric degree `2` resolves to `D-F-A` in major mode and `D-F-Ab` in minor mode

## Notebook Section Tabs

Notebook section tabs should be visible along the top only.

Tab behavior:

- tabs may be color coded
- tabs may compress to fit more sections across the top
- compressed tabs should expand on hover, focus/tab entry, or selection
- tab scrolling is out of scope
- an ellipsis-style overflow selector may be used for tabs that do not fit
- add, delete, and rename section actions should live in the tab list
- tabs should support drag-and-drop reordering
- default section name is `New Tab`
- sections may be empty
- deleting a section with content should require confirmation

The tab interaction must remain accessible for keyboard and tablet users.

## Table Scope

Tables are an MVP feature, but table support can be intentionally limited.

MVP table support should include:

- table borders
- header row or header column support
- basic row and column editing

MVP table support may exclude:

- nested tables
- music/object embeds inside table cells
- spreadsheet-like behavior
- complex table styling

The goal is useful notebook tables, not a full table editor.

## Paragraph Formatting Scope

Tentative starting point for paragraph formatting:

- paragraph style
- alignment
- space before
- space after
- paragraph indentation
- keep lines or paragraphs together
- page break before or explicit page break
- widow and orphan control if feasible
- numbered lists
- bulleted lists
- list continuation and multi-paragraph list support

This list should be trimmed to the required MVP set after investigation.

## Inline Formatting Scope

Tentative starting point for inline formatting:

- font/typeface, probably, but may be limited to paragraph styles
- size, but may be limited to paragraph styles
- bold
- italics
- underline
- color, depending on the color spike

This list should be trimmed to the required MVP set after investigation.

## Architecture Priorities

The MVP should create these seams early:

- document model and serialization
- persistence service
- authentication/account service
- export service
- music-object payload normalization
- editor/embed integration

The document model is the most important MVP planning item.
The document remains the main product surface.

Preferred direction:

- treat the Quill Delta as the editor stream
- keep music-object payloads explicit and identifiable
- wrap both in a notebook document format owned by the app, not by Quill
- consolidate Quill Deltas, document settings, section metadata, and music-object payloads into one saved notebook state
- allow the POC payload shape to be translated rather than frozen
- keep the editor/document architecture compatible with future multi-user editing
- model visible section tabs as part of the document-focused workflow
- place notebook section tabs strictly along the top
- keep continuous view and page view as editor presentation modes unless the document model needs otherwise
- treat document zoom as transient app view state, not persisted document data
- use Quill's available undo/redo behavior across embeds and section changes for MVP
- treat embeds as a character for selection behavior if possible
- treat any standard top menu as a supporting document command surface
- treat `MusicXML` as the native music specification
- use `tonal` as the preferred music theory library for chords, scales, and progressions
- allow temporary conversion into library-specific formats for rendering, playback, or export adapters
- store notebook documents in `MongoDB` through a service boundary
- keep account/auth mechanics separate from the document model where practical

## POC Pieces To Carry Forward

- custom Quill embed/blot direction
- keyboard and staff display modes as music-object variants
- dedicated dialog editing as the default object-editing flow
- current POC embed edit options as the minimum editing baseline
- accessible hover/focus toolbar for small object actions
- width and height in object payloads
- generated `MusicXML` as the staff/playback payload bridge
- UI tests around editor/embed behavior

## POC Pieces To Rework

- large music embed React implementation
- native edit-dialog form controls; MVP edit fields should move to `MUI` controls
- `modmod` `PasswordInput` should be adapted when account creation and login UI are implemented
- POC-shaped payload as the only durable document structure
- any shell layout that exists only to support the spike
- renderer/playback coupling that makes document serialization harder
- debug-only document JSON as the only readout path

## First MVP Decisions To Make

1. What is the first notebook document format?
2. Is the editor feature the app shell, or does it sit inside a thin shell?
3. What is the first `MongoDB` document shape for users and notebooks?
4. What `PDF` library or export strategy is viable for the MVP document shape?
5. Which renderer/playback libraries are good enough to keep through MVP?
6. What is the first refactor boundary for the music embed component?
7. What exact challenge/salt/password-verifier flow should auth use?
8. How should the anonymous document be preserved when a user creates an account?
9. Should anonymous work survive page refresh, or only the current browser session?
10. What should happen if an anonymous user tries to export before signing up?
11. Are visible tabs persisted notebook sections, app navigation affordances, or both?
12. Can each notebook section own its own editor stream, or is there one stream with section anchors?
13. Does page view affect only presentation, or does it create persistent page/layout metadata?
14. Should `PDF` export mirror page view exactly in MVP?
15. If `PDF` export is cut as a last resort, what replaces it in the MVP user promise?
16. Are page headers and footers part of MVP page view or `PDF` export?

## Suggested Build Order

1. Define the notebook document model.
2. Add shared tests for serialization and music-object extraction.
3. Wire the editor to stream out a notebook document instead of only debug JSON.
4. Define the minimal user/account model.
5. Add the first auth service boundary.
6. Add a `MongoDB` persistence service around the document shape.
7. Add a minimal save/load UI that does not dominate the editor.
8. Add account-gated save/export handling for anonymous users.
9. Harden the music embed component boundaries.
10. Add the first `PDF` export service path.
11. Tighten accessibility, localization, and UI tests around the MVP workflow.

## Open Questions

Anything in this section remains an open question until it is explicitly answered and moved into the decided MVP scope.

### Document Basics

- What is the minimum useful `MongoDB` schema for notebook documents?
- Should MVP save whole documents, revisions, or both?
- How should Quill Deltas be consolidated into the unified saved notebook state?
- How should document title behavior work?
- How should duplicate or save-as behavior work?
- What is the new document flow?

### Sections And Tabs

- How should section tabs be represented in the notebook document model?
- How should compressed top tabs behave for overflow, color coding, hover, focus, and selection?
- Are visible tabs persisted notebook sections, app navigation affordances, or both?
- Can each notebook section own its own editor stream, or is there one stream with section anchors?
- What is the maximum practical number of visible tabs before compression or ellipsis overflow selection?

### Editor Behavior

- How should continuous/page view preference be stored: per user, per document, or transient session state?
- Where should view commands live for page view and continuous view?
- Where should document zoom controls live?
- What should find/search include for MVP?
- Can embeds be treated as a single character in Quill selection behavior?
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

- What color scope is appropriate for MVP: text color, highlight color, table color, object border color, or a smaller subset?
- Can color support meet accessibility and export requirements without expanding the MVP too far?
- Beyond title and one header paragraph style, are named styles useful enough for MVP, or should the editor keep simpler direct formatting?
- If named styles exist, are they document-level styles, application presets, or export-only helpers?
- Is multi-column document layout useful enough for MVP, and can it work with page view, export, and tablet layout?
- Can paragraph space before/after be represented cleanly in Quill Deltas and `PDF` export?
- Can Quill support multiple paragraphs inside a single numbered or bulleted list item cleanly enough for editing, serialization, and export, or should paragraph keep-together settings model that behavior?
- Is widow/orphan control feasible with the chosen editor and export path?

### Tables

- What table implementation fits Quill, serialization, accessibility, and `PDF` export well enough for MVP?
- What should the insert table size picker look like?
- How should add/delete row and column controls work?
- Should MVP support header row, header column, or both?
- What table border presets are needed?
- Should MVP support cell alignment?
- Can tables split across pages?
- How should table headers behave across page breaks?

### Music Embeds

- What is the accessible interaction pattern for embed toolbars across mouse, keyboard, and tablet touch?
- How should optional music embed captions be edited, serialized, and exported?
- Which renderer/playback libraries are good enough to keep through MVP?
- Which render/playback libraries require temporary conversion away from `MusicXML`, and where should those adapters live?
- Are there any music theory needs for MVP that `tonal` does not cover well?
- Should playback include count-in or tempo controls?
- Should caption settings be exposed through a hover/focus control?
- Does MVP need any embed content beyond a single chord or scale?
- What exact payload shape should preserve key major/minor mode and original numeric progression input in the durable notebook document model?
- Should numeric progression input support only single degrees `1` through `7`, or later accept richer degree syntax?
- Can MIDI input improve music embed creation or editing without turning MVP into a composition tool?
- What browser and device support constraints apply to MIDI input?

### Page And Export

- Does page view affect only presentation, or does it create persistent page/layout metadata?
- Should `PDF` export mirror page view exactly in MVP?
- If `PDF` export is cut as a last resort, what replaces it in the MVP user promise?
- Are page headers and footers part of MVP page view or `PDF` export?
- How should page breaks be represented in the editor stream and exported document?
- Should notebook documents support page headers and footers, and if so, are they document-wide or section-specific?
- How should global Letter/A4 page size and portrait/landscape orientation be represented in the document model and export path?
- Are global page margins enough for MVP, or is there a later need for section-specific margins?
- Which `PDF` library best supports Quill content, custom embeds, page breaks, table borders/headers, and paragraph spacing?
- Should MVP prefer `Puppeteer`/embedded Chrome export over a direct `PDF` generation library for fidelity?
- Should page numbering be supported?
- What are export filename defaults?
- Should print support be separate from `PDF` export?
- Should export support current section, full notebook, or both?
- Should users see a `PDF` preview before export?
- How are page breaks shown in continuous mode?
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

- Quill tables
- multi-paragraph list items
- page breaks and page view
- `PDF` export via `Puppeteer`
- offline/PWA behavior
- color support
- columns
- MIDI input
- handwriting input

## Stretch Goals

- end-to-end encryption for notebook document contents after MVP
- multi-user document editing built on the Quill-based editor foundation after MVP
- fuller music composition workflows after the notebook/document experience is stable
- handwriting input for tablet users if a suitable library is found
- MIDI input for music embeds if investigation shows it fits the document workflow
- richer offline-first PWA behavior after the core save/load model is stable

## Done Means

The MVP is done when a user can try the editor anonymously, create an account, save a small music notebook document to `MongoDB`, reload it, add text plus keyboard/staff objects, edit and resize those objects, and export a basic `PDF` without depending on debug-only POC paths.

The application can still be small.
The important thing is that its core document loop is real.

## Related Topics

- [Music Notebook App Architecture](../architecture/app-architecture.md)
- [Quill Integration](../architecture/quill-integration.md)
- [Testing Strategy](../testing/testing-strategy.md)
- [Initial POC](../poc/initial-poc.md)
