# Music Notebook Starting Notes

## Purpose

This file is the lightweight starting index for the repo.

Use it to:

- get oriented quickly
- see the current high-level direction
- jump to the canonical topic notes

Detailed architecture, testing, and POC guidance should live in the topic docs rather than be duplicated here.

## Current Snapshot

- App: `music-notebook`
- Architecture direction: `polylith` with `REMVC`
- Main editor direction: `Quill`
- Product direction: editor-first UI
- Native music payload format: `MusicXML`
- Initial export target: `PDF`
- Current implementation mode: post-POC cleanup complete; MVP implementation is underway with active editor, music-object, table, persistence, and view-mode slices

## Current Priorities

- keep the proven `Quill` custom embed model while hardening the first-pass notebook document model, paragraph formatting, styles, and music-object formatting
- continue MVP implementation around document persistence, document commands, inline chord objects, music-object payloads, table editing, read/view mode, and export seams
- keep the completed post-POC React cleanup as the component baseline: class components, shared `MUI`-based form controls, localized labels, accessible helper text, and extracted shared music components
- use the current docs as the context bootstrap before starting new MVP code, then update topic notes when decisions change
- keep persistence, export, auth, and future app-shell work behind clear service/document seams
- document save/open/rename now exists as the active MVP persistence slice; the next work should harden remaining document commands, selection/editing polish, and export/read-view seams

## Important Current Defaults

- current Polylith, not Polylith 2.0, is the planning baseline
- persistence now has a first concrete MongoDB slice behind server/client services; keep the document model and server document API separated
- `document-format` is document-wide formatting; there is no per-page format feature
- document defaults include 12px typography and four paragraph styles: `Normal`, `Header 1`, `Header 2`, and `Header 3`
- paragraph formatting includes style, font size, bold, italic, underline, alignment, and start behavior (`continuous`, `full-line`, `next-page`)
- paragraph direct formatting overrides its style; styles override document defaults; style changes should affect paragraphs that inherit unchanged properties
- keyboard/staff editing opens in a feature-owned dedicated `MUI` dialog component under `music-object`
- `MUI` `Dialog` should not be rendered directly inside unrelated feature components
- the rendered document object should stay visually simple, with floating controls for edit, playback, and resize
- rendering requirements matter more than loyalty to an initially named rendering library
- all else being equal, components with better `MusicXML` compatibility are preferred
- substantial React presentation components should use class components unless they are tiny, stateless helpers
- shared edit fields should use the local `Base*`/shared component layer where practical for localization and accessibility
- reusable music presentation pieces, such as the preview, chord input/selector, and key selector, should remain shared; feature-specific dialogs belong under the owning feature
- music-object embeds use a controller-owned embed session; Quill blots are allowed a limited adapter exception but should delegate behavior to controllers/sessions
- Quill-owned detached React roots are allowed for embeds; ordinary dialogs and feature UI should render under the main app root
- music-object captions support context-aware `{{short}}`, `{{long}}`, and `{{key}}` tokens
- music-object caption formatting currently includes style, font size, alignment, bold, italic, and underline
- music-object embeds use Quill's regular inline embed behavior; do not change the embed mode casually because it breaks cursor behavior
- music-object rendering is width-driven and natural-height: width is the primary scale input, captions render below the preview, and wrappers should not clip content with a fixed height
- tables are the current MVP path for intentional side-by-side music layout; table support lives in the `table` feature, uses `quill-table-up`, and owns its selection, context menu, and row/column operation behavior
- the cleanup goal for tables is not Quill agnosticism; `editor-surface` can expose Quill-aware readonly/controlled helpers, while table semantics such as cell/row/column meaning should live in the `table` feature
- editor features can opt into editor DOM/Quill events through the `editor-interactions` service, and features can register named React views for `EditorPage` to mount through the `editor-views` service
- playback is owned by the `player` feature through a registry service; editor components should use that service rather than importing player loadables directly
- chord entry is moving toward one unified input that auto-detects direct chord names, Roman numeral degrees, and numeric degrees
- inline chord objects are now an MVP requirement: typed ASCII chord text in the editor should become a formatted structured chord object with a small floating editor field
- chord display style should be a document-level/global setting by default, with local inline/object overrides only when needed
- numeric chord degrees use the selected key quality to infer the default chord quality
- chord-name parsing design lives in the MVP topic; current direction is to preserve typed text while normalizing internally, include slash bass/inversion in the normalizer result, avoid nonstandard `o/` half-diminished shortcuts, and investigate `chord-symbol` before hand-writing a full direct chord parser
- key quality is the shared selector for major, minor, modal, pentatonic, and blues scale contexts; scale editing should not use a separate mode dropdown
- `MusicXML` and playback/staff rendering should use the same normalized note source for the same input
- account identity uses app-owned UUIDs rather than Mongo-assigned `_id` values
- authenticated document requests use short-lived bearer tokens; durable login sessions live in `HttpOnly` cookies and can refresh bearer tokens
- every client server request goes through `io`, which adds JSON headers, `Accept-Language`, `X-Music-Notebook-App-Id`, and bearer authorization when available

## Recent Verification Notes

- `npm run test:ui -- --grep ViewModeService` passed after the read-only paged-preview table CSS fix: `328 SUCCESS`
- `npm run test:ui -- --grep TableController` passed after the current table context-menu split-table attempt: `330 SUCCESS`
- the UI test loop can now run continuously with `npm run test:ui:watch`; it performs an initial `polylith test mn`, starts `polylith test mn -w`, and runs Karma in watch mode through `karma.watch.conf.cjs`
- current logged watcher files are `.codex-logs/ui-test-build-watch.log` and `.codex-logs/ui-test-karma-watch.log`; latest observed watcher result after the selected-column right-click regression was `334 SUCCESS`
- static search found no substantial hook-based JSX components under `src/mn` after cleanup
- known non-failing noise includes MUI Dialog `act(...)` warnings, React lifecycle/flushSync warnings around Quill/table/editor mount paths, module directive warnings, and OSMD SkyBottomLineCalculator warnings
- if behavior looks stale in the browser, restart the watcher; it has failed to pick up changed build specifications during recent work
- current music-object layout direction: back out text flow/floating behavior and keep music embeds as large inline leaves, with tables for intentional side-by-side layout
- current music-object rendering direction: keyboard previews compute their own host height from width/key ratio, staff previews scale their SVG naturally, and zeroed wrapper text metrics suppress Quill guard-text artifacts
- current read-only paged-preview table status: large TableUp tables now render after stronger preview-only rules override the edit-view `.ql-table-wrapper` `inline-block` / `max-content` behavior; keep table pagination/export fidelity as open hardening work
- current table direction: table row/column gutter selection, keyboard cell navigation, column resize, fit-to-width/distribute-columns arrangement commands, selected-column right-click context preservation, and selection-aware row/column/table context-menu commands are implemented; table paste, edit-view split-table, table pagination, and export fidelity remain open
- current table cleanup direction: move remaining `EditorPage` dependencies in priority order through Quill-aware `editor-surface` access, table-owned insertion/navigation/TableSelection gate/focus behavior, generic wide-content layout contributions, table-owned CSS/assets, then a Quill contribution seam; details live in `agents/topics/architecture/temporary-cleanup.md`
- current table cell-click focus status: click-in-cell means text editing, not table selection; the current behavior is a hybrid of native caret placement for text hits, Quill range fallback by TableUp cell blot for blank cell space, and a music-embed special case
- current wide-layout direction: assume any feature can exceed page width; replace table-specific overflow scanning with a generic wide-content contribution API, using tables as the first contributor
- current split-table command status: context menu items for splitting above/below the selected row exist, but manual browser testing shows the second half is lost or the operation otherwise does not produce two durable tables; do not continue patching this blindly without a deeper TableUp/Parchment strategy

## Read First

For a fresh agent, read these in order:

- [Foundation Architecture](agents/topics/architecture/foundation-architecture.md)
- [REMVC Architecture](agents/topics/architecture/remvc-architecture.md)
- [Music Notebook App Architecture](agents/topics/architecture/app-architecture.md)
- [Feature Mechanics](agents/topics/architecture/feature-mechanics.md)
- [Build System](agents/topics/architecture/build-system.md)
- [Build And Asset Flow](agents/topics/architecture/build-and-assets.md)
- [Quill Integration](agents/topics/architecture/quill-integration.md)
- [UI Component Layer](agents/topics/architecture/ui-component-layer.md)
- [Localization And Accessibility](agents/topics/architecture/localization-accessibility.md)
- [MVP Topic](agents/topics/mvp/README.md)
- [Accounts](agents/topics/mvp/accounts.md)
- [Document Model](agents/topics/mvp/document-model.md)
- [Main Menu](agents/topics/mvp/main-menu.md)
- [Editor Toolbar](agents/topics/mvp/editor-toolbar.md)
- [View Mode](agents/topics/mvp/view-mode.md)
- [Paged View Mode Spike](agents/topics/mvp/paged-view-mode-spike.md)
- [Paste](agents/topics/mvp/paste.md)
- [Quill Embed Navigation](agents/topics/mvp/quill-embed-navigation.md)
- [Quill Table Up Spike](agents/topics/mvp/quill-table-up-spike.md)
- [Chord Name Parsing](agents/topics/mvp/chord-name-parsing.md)
- [React Code](agents/topics/react-code/README.md)
- [React Cleanup](agents/topics/react-code/react-cleanup.md)
- [Standards](agents/topics/standards/README.md)
- [Testing Strategy](agents/topics/testing/testing-strategy.md)
- [Initial POC](agents/topics/poc/initial-poc.md)

## Topic Map

### Architecture

- [Architecture Index](agents/topics/architecture/README.md)
- [Foundation Architecture](agents/topics/architecture/foundation-architecture.md)
  - general Polylith + `REMVC` model
  - executor, registry, service/model boundaries
- [REMVC Architecture](agents/topics/architecture/remvc-architecture.md)
  - model, controller, view, and React presentation boundaries
  - controller-owned sessions and Quill embed exceptions
- [Music Notebook App Architecture](agents/topics/architecture/app-architecture.md)
  - app-specific structure
  - document, embed, persistence, and export seams
  - product-specific open questions
- [Feature Mechanics](agents/topics/architecture/feature-mechanics.md)
  - feature startup, service files, and `.d.ts` conventions
  - current pattern for services such as `player`
- [Build System](agents/topics/architecture/build-system.md)
  - app builds
  - feature inclusion
  - synthetic modules
  - frontend test build flow
- [Quill Integration](agents/topics/architecture/quill-integration.md)
  - Quill document model
  - embed strategy options
  - rendering/dialog-editing guidance
- [UI Component Layer](agents/topics/architecture/ui-component-layer.md)
  - MUI as base component layer
  - CSS variables and cascade layers
  - CSS-first editor styling boundary
- [Localization And Accessibility](agents/topics/architecture/localization-accessibility.md)
  - localization as a first-class app concern
  - accessibility expectations for editor, embeds, and third-party components
  - component selection and testing guidance

### Testing

- [Testing Index](agents/topics/testing/README.md)
- [Testing Strategy](agents/topics/testing/testing-strategy.md)
  - server/shared/ui lanes
  - Polylith-coupled UI testing
  - test ownership and harness direction

### MVP

- [MVP Topic](agents/topics/mvp/README.md)
  - first usable product scope
  - POC carry-forward and rework guidance
  - document, persistence, and export priorities
- [Accounts](agents/topics/mvp/accounts.md)
  - account records, auth tokens, sessions, account UI, and logout intents
- [Document Model](agents/topics/mvp/document-model.md)
  - first-pass notebook model service
  - tabs, active tab content, settings, styles, typography, generic objects, and document persistence
- [Main Menu](agents/topics/mvp/main-menu.md)
  - app command surface and document command placement
- [Editor Toolbar](agents/topics/mvp/editor-toolbar.md)
  - editor toolbar service
  - current formatting and insert controls
- [View Mode](agents/topics/mvp/view-mode.md)
  - edit/read/split view direction
  - pagination and columns implementation path
- [Paged View Mode Spike](agents/topics/mvp/paged-view-mode-spike.md)
  - quick split-pane Quill plus Paged.js read-view investigation
- [Paste](agents/topics/mvp/paste.md)
  - Quill clipboard behavior
  - images, tables, rich paste, and custom object paste policy
- [Quill Embed Navigation](agents/topics/mvp/quill-embed-navigation.md)
  - image-like inline music embed navigation and selection behavior
  - retired side-by-side floated embed model
- [Quill Table Up Spike](agents/topics/mvp/quill-table-up-spike.md)
  - current table implementation status and remaining table risks

### POC

- [POC Index](agents/topics/poc/README.md)
- [Initial POC](agents/topics/poc/initial-poc.md)
  - spike goal
  - scope and out-of-scope
  - success criteria
  - questions the spike should answer

## External References

- [modmod](../modmod)
  - strongest current reference for testing setup and practical Polylith app usage
- [poly-gc-react architecture notes](../poly-gc-react/agents/topics/architecture/README.md)
  - strongest reference for topic-style architecture synthesis
- [polylith](../polylith)
  - underlying platform repo for current Polylith behavior
