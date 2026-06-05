# MVP Implementation Plan

## Purpose

Track the first implementation slices for the MVP.

This plan is intentionally practical.
It should describe the next buildable steps without trying to settle every later product question.

## Current Status

The first MVP implementation task was to lay out the main app shell.
That first slice is now implemented enough to serve as the current shell baseline.

The current app layout includes:

- main command surface
- document editor toolbar
- editor surface
- bottom document tabs

This establishes the visible frame for MVP work. Account flow and the first
document persistence slice are now visible in the UI; export, read view, and
final document serialization are still future slices.
The first table editing slice is also active through `quill-table-up` and the
dedicated `table` feature.

The first-pass document model also exists.
It owns document settings, typography defaults, document paragraph styles, tabs, active tab state, per-tab Quill editor content, and generic objects.
See [Document Model](document-model.md).

Additional MVP slices now implemented:

- document-format was renamed from the earlier page-format idea and now means document-wide formatting
- the reusable `document-format` service reads/writes page settings and base font size through `document-model`
- the `css-vars` service provides a reusable runtime bridge for CSS custom properties
- the `paragraph-format` feature adds Format > Paragraph, a paragraph format dialog, and toolbar controls for style, font size, and alignment
- the editor toolbar is grouped so text formatting, paragraph controls, and insert controls are visually separated
- music-object embeds now use a feature controller plus controller-owned embed sessions for object actions
- music-object edit and format dialogs live under the `music-object` feature, while reusable preview/key/chord components remain shared
- music-object captions support context-aware tokens and basic caption formatting
- music-object embeds now follow the image-like inline-leaf model, with
  width-driven natural-height rendering and tables for intentional side-by-side
  layout
- account creation, login, logout, session restore, bearer-token refresh, and account status UI exist
- the document feature registers New, Open, Save, Save as, Rename, and Delete menu items
- Save/Open/New/Rename flows exist, including unsaved-work prompts and account-gated save messaging
- server document routes can list, create, update, save-as, rename, duplicate, get, and delete Mongo-backed documents
- localized markdown support exists through the server markdown feature, markdown model, and shared markdown/info components
- table insertion, table row/column selection, keyboard cell navigation, column resizing, fit/distribute arrangement, and selection-aware row/column/table context-menu commands are implemented through the `table` feature using the chosen TableUp path
- split-table context menu commands use table-owned Delta reconstruction; command-level coverage and manual edit-view testing work, while broader save/reload and rich-content hardening remain part of table implementation follow-up
- current split-view paged preview relies on a live Quill-root clone and
  preview-only CSS; large TableUp tables now render in the right-hand
  read-only pane after the preview CSS overrides the edit-view TableUp wrapper
  sizing, while broader table pagination/export fidelity remains open
- internal keyboard music-object copy/paste now uses semantic embed HTML and a
  feature-registered Quill clipboard matcher rather than copying rendered
  control text
- `editor-interactions` and `editor-views` provide editor-owned service seams for feature event opt-in and feature-requested React view mounting

The MVP now distinguishes editing from paginated reading:

- edit view
- read view
- split view

Start with edit view.
Edit view is the `Quill`-native continuous editing stream.
In edit view, the area below the main menu is filled by the editor toolbar and editor surface.
Page size still controls the wrapping width, but edit view does not promise exact automatic pagination.

Read view is the paginated document layout view.
Read view should render page boxes from the notebook document model and editor stream, honor page size, orientation, margins, and manual page-break objects, and become the basis for print/PDF preview.
Read view is expected to be harder because it has page geometry, page breaks, export fidelity, and print-like layout implications.
Defer read view until the continuous edit view and document model are stable.

Split view is a likely implementation compromise after basic read view exists.
It should keep the Quill editor as the editing surface while rendering a synchronized read-only page/layout pane beside it.
This is especially useful for columns, pagination, table layout, and export-sensitive block flow without making Quill act like a live paginated word processor.

## First Layout Slice

The implemented first layout separates four command/document regions:

1. Main command surface
2. Editor toolbar
3. Editor surface
4. Bottom document tabs

### Main Command Surface

Use the direction in [Main Menu](main-menu.md).

Current behavior is partly real and partly structural:

- render a web-app command bar
- show product-shaped menu groups such as `Document`, `Insert`, `Format`, `View`, and `Help`
- show account status in the top-right shell area rather than as a normal main-menu group
- keep the current document name out of the visible app header
- update the browser title with the current document name when document state exists
- document menu Save is real; Export is still future
- route commands through callbacks or controller/view-service methods, even if many are placeholders at first

Avoid building a desktop-style menubar.
This should feel like a web app with grouped commands.

### Editor Toolbar

Use the direction in [Editor Toolbar](editor-toolbar.md).

Initial toolbar scope:

- inline text actions
- list and simple paragraph-structure actions
- insert-at-caret actions
- paragraph style, font size, and alignment controls
- paragraph format command/dialog for lower-frequency paragraph settings

The toolbar should not own document lifecycle, account, export, or object-specific controls.

### Editor Surface

The editor surface should remain the primary visual focus.

Initial surface expectations:

- preserve the current Quill-based editor
- implement edit view first
- let the toolbar and editor fill the full area under the main menu
- leave read view for a later slice
- load and save active-tab Quill content through `document-model`
- model manual page breaks as Quill stream objects so edit view, read view, and export can all honor the same document structure
- keep embedded-object hover/focus controls attached to embedded objects, not the app toolbar
- avoid introducing a side panel unless a later MVP decision requires it
- keep document layout styling in CSS, not buried in MUI `sx` props

## Completed Build Steps

1. Identified the current app shell and editor mounting path.
2. Created an app shell that owns the main menu, editor region, and document tabs.
3. Added a main command surface component backed by the `main-menu` service.
4. Added an editor toolbar component backed by the `editor-toolbar` and `action-registry` services.
5. Placed the existing Quill editor surface below the toolbar.
6. Kept current keyboard/staff insertion behavior working.
7. Added document tabs at the bottom of edit view.
8. Wired tab add, select, rename, and reorder controls to `document-model`.
9. Wired `EditorPage` to load and save active-tab Quill content through `document-model`.
10. Added tests for shell rendering, menu/toolbar command reachability, document tabs, and active-tab editor content loading.
11. Added document-format and paragraph-format features.
12. Added default document typography and paragraph styles.
13. Added music-object captions, object formatting, and controller-owned embed sessions.
14. Added account creation, login, logout, persistent login-session cookies, and bearer-token refresh.
15. Added top-right account status UI and `account-ui` cross-feature launch service.
16. Added server document persistence feature with authenticated Mongo-backed routes.
17. Added document save/open/new/save-as/rename flows and dialogs.
18. Added last-open-document account metadata and restore-on-login/session behavior.
19. Added localized markdown route/model/components and info/help dialog helpers.
20. Added see-white-space toolbar toggle as a visual editor aid.
21. Added table insertion and table feature ownership for row/column selection, context menu mounting, table commands, keyboard cell navigation, and column resizing.
22. Added editor interaction and view registry services so features can opt into editor events and request editor-mounted UI without moving feature behavior into `EditorPage`.

## Suggested Next Build Steps

The current major goal is to harden document persistence and document editing
polish now that save/open are real.

1. Finish document Delete and Duplicate UI flows.
2. Harden document serialization tests around styles, paragraph formats, music-object captions, object formats, and saved server snapshots.
3. Preserve the current anonymous document through successful account creation if feasible.
4. Complete inline-leaf music-object caret/selection and natural-sizing polish without changing document layout.
5. Harden table save/reload, paste policy, accessibility, split-table behavior, read-view behavior, and export behavior.
6. Add delete and join tab UI with confirmation.
7. Add explicit page-break objects in the Quill stream.
8. Instrument Paged.js/table preview layout before adding any structural table
   pagination fallback, and keep edit-view split-table work separate from
   read-view pagination.
9. Add read view only after continuous edit view, tab behavior, and document serialization are stable.
10. Add split view after the first read-view renderer exists.

## Implementation Constraints

- substantial React components should be class components
- use direct MUI imports
- keep shared command/menu components under `src/mn/components` if they are reusable
- keep feature-specific editor layout under the editor feature until it is clearly shared
- use localized labels for visible menu and toolbar text
- icon-only buttons need accessible names and hover/focus help
- do not render raw `MUI Dialog` inside large feature components
- do not move document-changing behavior into the menu component itself

## Early Non-Goals

This first slice does not need to implement:

- real export
- style editing and style creation
- keyboard shortcut registry
- mobile collapsed command layout
- read view
- automatic pagination

The point is to establish the shell shape and command placement so later MVP work has somewhere intentional to land.

## Open Questions

- Should `Save` and `Export` be persistent visible buttons or only live under `Document`?
- In edit view, should bottom tabs sit above or below any future status bar?
- Which tab actions should be available from the tab strip before the main menu also exposes them?
- Should insert commands be duplicated in both the main command surface and editor toolbar?
- What is the first browser-title format for unnamed and named documents?
- Which remaining placeholder menu items should stay visible before their real services exist?
- Which parts of the existing editor toolbar should be preserved during the first layout pass?
- What is the exact continuous-mode height contract between the main menu, editor toolbar, and editor surface?
