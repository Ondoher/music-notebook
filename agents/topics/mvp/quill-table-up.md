# Quill TableUp Implementation

## Purpose

Track the MVP product decision and current implementation status for using
`quill-table-up` as the notebook table implementation.

Tables are an MVP feature, but table support can stay intentionally limited. The goal is useful notebook tables, not a full spreadsheet or desktop word-processor table editor.

This topic tracks the decision to use `quill-table-up` for the MVP table path
and the remaining hardening work before the implementation is considered durable
across the full MVP workflow:

- editing simple notebook tables
- preserving a stable document representation
- supporting paste and copy behavior
- rendering in read view
- exporting to `PDF`
- meeting accessibility expectations

## Chosen Library

Package:

```text
quill-table-up
```

Current known metadata as of May 30, 2026:

- npm version: `3.5.2`
- description: `A table module for quill2.x`
- created: July 16, 2024
- last npm modified date: May 24, 2026
- license: MIT
- dependency: `@floating-ui/dom`
- repository: `https://github.com/zzxming/quill-table-up`

Decision basis:

- more active than older Quill table plugins such as `quill-better-table`
- explicitly targets Quill 2.x
- broad enough feature surface for the MVP table direction
- has local verification for the first MVP editing slice, but still needs
  hardening around save/reload depth, paste, read view, export, and advanced
  accessibility behavior

## Claimed Feature Areas To Verify

The library appears to claim support for:

- insert table
- insert and delete rows
- insert and delete columns
- delete table
- merge and split cells
- cell width and height controls
- cell border controls
- cell background color controls
- whole-table width as `100%` or fixed pixel width
- whole-table alignment left, center, and right
- line breaks in cells
- undo and redo support
- Quill formats inside cells
- context menu or table operation UI
- table selection
- table resize behavior
- virtual scrollbar behavior
- `<caption>`, `<th>`, `<thead>`, and `<tfoot>` support

Do not assume unimplemented or untested claims satisfy MVP. The current
implemented slice covers basic table editing, selection, resizing, and context
menu operations; paste, read view, export, and richer formatting still need
separate verification.

## MVP Table Requirements

Current MVP table scope says table support should include:

- table borders
- header row or header column support
- basic row and column editing

MVP may exclude:

- nested tables
- merged/split cells
- pasted external table preservation
- spreadsheet-like behavior
- complex table styling

Additional practical requirements:

- table content should serialize cleanly in the active tab's Quill Delta
- saved documents should reload without table corruption
- table rendering should be compatible with read view and `PDF` export
- table controls should be reachable by keyboard where practical
- unsupported pasted table features should degrade predictably

Current implemented slice:

- table insertion through the editor/table feature path
- row selection from the left table edge
- column selection from the top table edge
- drag selection for multiple columns
- `Tab` and `Shift+Tab` navigation between cells
- `Tab` from the last cell adds a new row; `Shift+Tab` from the first cell does not create a row
- interactive column width resizing
- a feature-owned, selection-aware context menu view
- insert row above/below, insert column left/right, delete row, delete column,
  and delete table operations
- table arrangement context-menu commands: fit to width and distribute columns
- split-table above/below context-menu commands are present again using
  Delta-level reconstruction; command-level coverage passes, manual edit-view
  testing works, and the follow-up hardening item has been handled separately
- music objects can render inside table cells; keyboard previews fit to the
  table cell width and preserve aspect ratio
- music-object resize handles are disabled inside table cells
- tables can render wider than the page content width in edit view while the
  page margin/content guide remains tied to the effective page width
- selected-column context-menu behavior preserves the selected column when
  right-clicking in the selected column/top selection area

Known open behavior:

- Arrow-left exit from the first table cell fails when the cell begins with a
  Quill embed such as an image or music object and has no preceding text leaf.
  Manual testing on June 5, 2026 reproduced the issue with ordinary pasted
  images in both inserted tables and externally pasted tables, so this is not
  specific to the music-object embed. A zero-width text prefix confirms the
  boundary needs a text leaf, but that adds an extra caret stop and should not
  be treated as the final fix. Keep this as a generic TableUp/Quill embed
  boundary issue to address later.

## Implementation Questions

### Package And Build Compatibility

- Does `quill-table-up` work with the repo's installed `quill ^2.0.3`?
- Does it bundle cleanly through the current Polylith/Rollup build?
- Does it require CSS or assets that need to be added to the feature build asset flow?
- Does it use DOM APIs, globals, or module formats that cause test-build problems?
- Does it conflict with current Quill configuration, toolbar registration, or custom music embeds?

### Editor Behavior

- Can the editor insert a table at the current caret?
- Can users move the caret into, through, and out of a table predictably?
- Do `Tab`, `Shift+Tab`, arrow keys, `Enter`, `Backspace`, and `Delete` behave acceptably?
- Can users add and delete rows and columns?
- Can users select cells or ranges if the library supports that?
- Does undo/redo work after table insert, edit, row/column operations, merge/split, and paste?
- Does table editing preserve surrounding document content and embedded music objects?

### Formatting Behavior

- Do bold, italic, underline, and links work inside cells?
- Does paragraph alignment work inside cells?
- Does header formatting work inside cells?
- Do lists work inside cells, and do they remain stable after undo/redo?
- Does cell background color work if color is still MVP scope?
- Do border controls map to a durable representation?
- Does the library support header row and header column semantics in a way read view/export can use?

### Width And Layout Behavior

- Can table width be fixed or percentage-based?
- Can column widths be set and persisted?
- Can cell widths/heights be resized by UI?
- How does a table behave when it is wider than the page content width?
- Can table width be constrained to the effective page width in edit view?
- Can read view use the same width model without layout drift?

### Delta And Serialization

- What Delta shape does `quill-table-up` produce?
- Does it use Quill's normal line attributes, custom embeds, custom attributes, or sidecar state?
- Is the Delta stable after save and reload?
- Does copy/paste inside the same editor preserve the table shape?
- Does cut/paste preserve the table shape?
- Does the table representation fit the current `document-model` active tab content shape?
- Does any library-owned data need to become a generic document object?

### Paste Behavior

- What happens when pasting simple HTML tables from a browser?
- What happens when pasting from Google Docs?
- What happens when pasting from Microsoft Word?
- What happens when pasting from Excel or Sheets?
- Does pasted table content preserve rows, columns, headers, and simple inline formatting?
- Does pasted table content introduce unsupported widths, styles, nested tables, or merged cells?
- Can unsupported table paste degrade to plain text or a simplified table?
- Does paste behavior align with the current MVP paste stance in [Paste](paste.md)?

### Read View And Export

- Can read view render the table from the saved Delta without mounting a live Quill editor?
- If read view must reuse Quill rendering, what does that imply for pagination and export?
- Can tables be kept together as a first MVP fallback?
- Can table rows be split across pages if needed?
- Can header rows repeat across page breaks?
- Can `PDF` export render borders, widths, header rows, and inline cell formatting reliably?
- Does the library create interactive-only DOM that should be stripped or transformed for read view/export?

### Accessibility

- Does the rendered table use semantic `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th>`, and `<td>` where appropriate?
- Are table operation controls keyboard reachable?
- Do context menus and resize controls have accessible labels?
- Can screen readers identify header rows or header cells?
- Does cell selection expose an understandable focus model?
- What additional app-level labels or helper text would be needed?

### Styling And Product Fit

- Can the table UI be styled to match the notebook editor without heavy global overrides?
- Does the library require imported CSS, shipped CSS assets, or both?
- Can feature-local table styles live under the editor or a future table feature asset path?
- Does the table UI feel too complex for the MVP notebook use case?

## Prototype Scope

The first local prototype has already become the small MVP editing slice.
Keep any further prototype work scoped to unanswered questions.

Original prototype behavior:

1. Register `quill-table-up` in the editor.
2. Add a toolbar/menu command to insert a table.
3. Add commands for insert row, delete row, insert column, and delete column.
4. Verify basic inline formatting and alignment inside cells.
5. Dump the active tab Delta after table operations.
6. Reload the Delta into a fresh editor instance.
7. Test copy/paste within the editor.
8. Test paste from one or two external table sources.

Keep high-risk table experiments isolated.
The first pass has now committed to a small `quill-table-up` based MVP editing
slice. Do not treat this as final table paste, pagination, export, or advanced
formatting behavior.

## Suggested Test Matrix

Minimum manual checks:

- insert `2 x 2` table
- insert `3 x 3` table
- type plain text in several cells
- apply bold, italic, underline, and alignment inside a cell
- add row above and below
- add column left and right
- delete row and column
- undo and redo each operation
- copy and paste a table inside the same document
- save Delta snapshot and reload it
- paste a simple HTML table from a browser page
- paste a table from Google Docs or Sheets
- place a music object before and after a table and verify it survives nearby edits

Optional checks:

- merged cells
- header row
- header column
- table width resize
- column width resize
- cell background color
- borders
- read-only rendering
- keyboard-only navigation

## Hardening Criteria

The chosen `quill-table-up` implementation is MVP-hardened when:

- it works with Quill 2.0.3 and the Polylith build
- its Delta representation is stable enough for `document-model`
- basic row and column editing is reliable
- simple cell formatting works
- undo/redo does not corrupt table structure
- copy/paste of app-created tables works
- unsupported external paste can be controlled
- read view/export can render the saved representation
- the UI can be made accessible enough for MVP

Revisit the implementation decision only if:

- it breaks the build or watcher
- it requires brittle global DOM hacks
- it stores essential state outside the Quill Delta without a clean persistence path
- it corrupts nearby custom music embeds
- undo/redo is unreliable
- it cannot be rendered outside a live editor for read view/export
- its UI is too complex or inaccessible for the MVP surface

## Historical Expected Output

The early verification work was expected to produce:

- a short recommendation: use `quill-table-up`, use built-in Quill tables, try another library, or defer table richness
- example Deltas for simple and formatted tables
- notes on required CSS/build changes
- notes on unsupported or risky paste cases
- notes on read-view/export implications
- a trimmed MVP table feature list

## Open Questions

- Should table commands appear in the editor toolbar, main insert menu, table context UI, or all three?
- Should MVP expose merge/split cells if the library supports it?
- Should MVP expose column width resizing?
- Should MVP support table captions?
- Should header row support be semantic or just visual styling?
- Should table paste be allowed before the table model is fully hardened?

## Implementation Log

### 2026-06-01 First Local Integration

Installed `quill-table-up` and registered it in `EditorPage` through the
active Quill modules configuration.

Local package facts:

- installed version: `3.5.2`
- peer dependency: `quill ^2.0.3`
- package exports ESM, TypeScript declarations, `index.css`, and
  `table-creator.css`
- direct dependency: `@floating-ui/dom`

Historical temporary editor-surface API:

- `editorSurface.insertTable(rows, columns)`
- `EditorPage.insertTable(rows, columns)` delegates to
  `quill.getModule(TableUp.moduleName).insertTable(rows, columns, 'user')`
- the app currently exposes an Insert > Table command that inserts a simple
  two-column table for UI testing

First focused test:

- inserts a `1 x 2` `quill-table-up` table
- inserts a staff music object into the left cell
- inserts a keyboard music object into the right cell
- verifies both rendered `.music-keyboard-embed` nodes are inside table cells
- verifies both custom music embeds remain in the saved Quill Delta
- verifies table cell attributes remain present in the Delta

Historical result from the first local integration:

- `npm run test:ui` passed with `252 SUCCESS`
- this answers the first important product question positively:
  `quill-table-up` can technically host current custom music embeds inside
  table cells
- follow-up music-object inline/natural-sizing work later passed the broader UI
  lane with `253 SUCCESS`; the current broader verification baseline is tracked
  in the later 2026-06-02 log below

Observed risk/noise:

- installing the package added four npm packages and npm reported the current
  audit state as `16 vulnerabilities`; this was not triaged during the initial
  verification
- test output now includes non-failing React `flushSync was called from inside
  a lifecycle method` warnings associated with `EditorPage`, likely triggered
  by `quill-table-up` internal DOM/selection behavior during editor mount
- the initial verification had not yet covered table save/reload across a fresh
  editor instance, keyboard navigation inside cells, undo/redo, resize behavior,
  read-view rendering, or export behavior
- table insertion is intentionally minimal for now: a fixed two-column command
  is enough to test the side-by-side music-object workflow before designing the
  final table size picker and formatting controls

Initial recommendation, now adopted:

- continue with `quill-table-up` as the MVP table implementation
- treat tables as the product answer for intentional side-by-side music layouts
- do not rely on adjacent floated embeds for structured side-by-side editing
- update the prior MVP caveat about excluding music embeds inside table cells
  if the next save/reload and interaction tests remain stable
- keep music embeds width-driven and natural-height inside table cells; table
  cells may constrain available width, but should not require object-specific
  fixed-height clipping for captions or previews

### 2026-06-02 First Feature-Owned Table Interaction Slice

The table work moved from an editor-local experiment into the `table` feature.

Implemented shape:

- `table` owns selection helpers, controller behavior, context-menu view
  registration, and table operation commands.
- `editor-interactions` lets the table feature opt into editor DOM and Quill
  events without putting table-specific behavior back into `EditorPage`.
- `editor-views` lets the table feature register a named context-menu view and
  request that `EditorPage` mount it with feature-provided props.
- `EditorPage` still owns the actual editor surface and supplies editor context
  such as the Quill instance, table module, table selection module, and cell
  helpers.

Table interaction behavior now covered:

- row selection from the left edge
- column selection from the top edge
- drag selection of multiple columns
- selection-aware context menu contents
- row/column/table context-menu commands
- `Tab`/`Shift+Tab` navigation across table cells
- new-row creation when tabbing from the last cell
- interactive column width resizing

Music-object behavior in table cells now covered:

- staff objects scale to the cell width
- keyboard objects fit to the cell width and maintain aspect ratio
- music-object resize controls are disabled inside table cells

Edit-view layout decision:

- tables may extend beyond the page content width while the page
  margin/content guide stays fixed to the effective page width
- the editor workspace expands horizontally enough to keep an oversized table's
  resize edge reachable

Recent verification:

- `npm run test:ui -- --grep "TableController|TableContextMenu|EditorViewsService|dispatches editor context"` passed with `307 SUCCESS`
- later `npm run test:ui -- --grep TableController` passed with `330 SUCCESS`
- known non-failing noise still includes MUI/React `act(...)` and
  lifecycle/flushSync warnings, module directive warnings, and OSMD layout
  warnings

Remaining risks:

- save/reload coverage should be broadened now that more table behavior is real
- edit-view split-table is reintroduced through Delta-level reconstruction; the
  follow-up hardening item has been handled separately
- external table paste remains a policy and compatibility question
- read-view and `PDF` export behavior are not final
- header row/column semantics, border presets, and richer table formatting are
  not yet resolved
- remaining table cleanup details live in
  [Temporary Architecture Cleanup Tracker](../architecture/temporary-cleanup.md);
  the current direction is Quill-aware editor-surface helpers, table-owned
  behavior, generic wide-content layout contributions, and removal of all
  table-specific semantics from `EditorPage`

### 2026-06-03 Paged Preview Table Pagination Investigation

The first split-view/paged-preview path is now rendering a detached clone of the
live Quill editor root through `Paged.js`.

Current read-view table baseline:

- do not structurally rewrite, split, or chunk `quill-table-up` tables before
  passing them to `Paged.js`
- rely on Paged's native table handling where possible
- treat `.ql-table-wrapper` as an ordinary block wrapper in paged preview rather
  than the edit-view `inline-block` / `max-content` wrapper
- let `table`, `tbody`, and `thead` break automatically
- keep `tr` rows together with `break-inside: avoid`
- keep this behavior preview-only; edit view still permits wide tables so the
  user can reach resize handles and size the table back to fit

Current paged preview CSS direction:

```css
.mn-paged-preview-document .ql-table-wrapper {
  display: block;
  width: auto;
  max-width: 100%;
  overflow: visible;
}

.mn-paged-preview-document table {
  width: 100%;
  max-width: 100%;
  break-inside: auto;
  page-break-inside: auto;
}

.mn-paged-preview-document tbody,
.mn-paged-preview-document thead {
  break-inside: auto;
  page-break-inside: auto;
}

.mn-paged-preview-document tr {
  break-inside: avoid;
  page-break-inside: avoid;
}
```

Resolved issue:

- large TableUp tables were not rendering in the read-only paged preview pane
  because edit-view table wrapper CSS had higher specificity than the
  preview-only table CSS
- the edit-view `.ql-table-wrapper` stayed `inline-block` / `max-content`,
  which made large tables unplaceable in the right-hand Paged.js pane
- stronger preview-only selectors now force TableUp wrappers/tables into a
  normal block, page-width, `table-layout: fixed` shape
- manual browser verification confirmed the large-table preview problem was
  fixed

Explicitly avoided for now:

- no preview-only table chunking
- no manual DOM restructuring such as lifting tables out of paragraphs
- no `display: contents` wrapper trick without a new instrumented pagination
  failure

Next hardening step:

- instrument the cloned preview DOM and/or Paged layout hooks for any remaining
  table pagination/export failure
- capture computed `display`, `break-inside`, width, height, and overflow for
  `.ql-table-wrapper`, `table`, `thead`, `tbody`, `tr`, `td`, and the cell
  content that contains music embeds
- confirm whether the first unplaceable unit is the wrapper, table body, a row,
  a cell, or an oversized music-object render

Verification:

- `npm run test:ui -- --grep ViewModeService` passed after the current
  preview-only CSS cleanup: `328 SUCCESS`

### 2026-06-03 Split-Table Context Menu Attempt

Goal:

- Add table context-menu commands that split one TableUp table into two tables
  above or below the selected row/range.

Implemented/attempted:

- Added `Split table above` and `Split table below` items to the feature-owned
  table context menu.
- Routed those commands through `table/controller.js`.
- Tried two structural approaches:
  - split at the table wrapper and re-key the trailing wrapper/tree
  - split the inner table blot first, clone column definitions into the new
    table, then split the wrapper around that new table
- Added focused controller/menu specs for the attempted split command shape.

Verification:

- `npm run test:ui -- --grep TableController` passed with `330 SUCCESS`.
- Earlier focused table/menu runs also passed, aside from known unrelated
  React/MUI warning noise and one unrelated music-object test flake in a broader
  grep run.

Manual result:

- Not working. The command can appear to split, but the second half is lost or
  the operation does not leave two durable independent TableUp tables.

Current hypothesis:

- `quill-table-up` and Parchment are optimizing/normalizing the split in a way
  that either merges adjacent structures, drops an invalid trailing fragment, or
  fails to preserve a complete valid second table tree.
- Tests that mock the blot shape are not enough; this needs a real TableUp/Quill
  integration reproduction against actual DOM, Delta, and optimizer behavior.

Next step:

- Do not keep patching the current command blindly.
- Build or reuse a real Quill/TableUp integration harness that:
  - creates a multi-row table with real TableUp blots
  - invokes the split command
  - inspects `quill.root.innerHTML`
  - inspects `quill.getContents()`
  - verifies that two tables and both row groups survive after `quill.update()`
- If TableUp does not support this cleanly through Parchment splitting, prefer a
  Delta-level or controlled HTML/import reconstruction strategy over direct DOM
  surgery.

### 2026-06-04 Split-Table Reintroduced

Implemented:

- Re-added `Split table above` and `Split table below` to the feature-owned
  table context menu.
- Replaced the failed wrapper/Parchment split strategy with a Delta-level
  reconstruction strategy:
  - read the selected TableUp table from `quill.getContents()`
  - partition whole rows above/below the selected row
  - replace the original table range with two complete TableUp table Deltas
  - assign fresh table, row, and column ids to both resulting tables
- Guardrails:
  - boundary splits that would create an empty table are refused
  - row spans that cross the split boundary are refused for now

Verification:

- `npm run test:ui -- --grep TableController` passed with `351 SUCCESS`.
- Manual edit-view UI testing confirms the split command works in the browser.

Follow-up:

- Split-table hardening was handled separately after the initial Delta-level
  reconstruction work.

### 2026-06-04 Table Context Menu Arrangement And Cleanup Direction

Implemented:

- Added `Fit to width` and `Distribute columns` table context-menu commands.
- `Fit to width` forces the current table width to the document-format
  margin-to-margin content width and spreads the added or removed space equally
  across columns.
- `Distribute columns` keeps the current table width but makes every column the
  same width.
- Reordered the context menu sections into row, column, split, arrange, and
  delete groups.
- Fixed selected-column context menu behavior so right-clicking in the selected
  column/top selection area preserves the active TableUp selection and opens
  the menu with column context.

Current cleanup conclusions:

- The table feature does not need to be Quill-agnostic. The editor can expose
  Quill-aware readonly or controlled helpers through `editor-surface`; the
  cleanup target is keeping table meaning and TableUp behavior out of
  `EditorPage`.
- Plain table-cell clicks are established as text-editing gestures, not table
  selection gestures. Current behavior is a hybrid: native/browser caret
  placement for text hits, Quill range placement by TableUp cell blot for blank
  cell space, and a special case that places the cursor after music embeds in
  cells.
- Wide edit-view layout should become a generic wide-content contribution,
  because any feature can eventually render wider than the available page
  width. Tables are the first known contributor.
- Remaining editor/table cleanup is tracked in
  [Temporary Architecture Cleanup Tracker](../architecture/temporary-cleanup.md).

Verification:

- Continuous Karma watcher passed after the selected-column right-click
  regression: `334 SUCCESS`.

### 2026-06-04 Edit-View Wide Layout And Fit-To-Width Status

Current state:

- The editor now has a generic `editor-layout` wide-content contribution
  service. The table feature registers TableUp table selectors as the first
  contributor, and `EditorPage` applies the resulting
  `--mn-editor-overflow-width` without scanning specifically for tables.
- The intended edit-view model is a simple continuous editor surface with the
  normal left editing gutter, a dotted right-side guide representing the
  margin-to-margin output content width, ordinary wrappable text constrained to
  that guide, and wide content visible past the guide until the outer workspace
  clips it.
- `Fit to width` now gets its target from `document-format.getContentWidth()`,
  derived from page size and left/right document margins rather than editor DOM
  inference. If that width is unavailable, the command does not run instead of
  guessing from wrapper or editor-root measurements.

Verification:

- `npm run test:ui -- --grep DocumentFormatService` passed with `348 SUCCESS`.
- `npm run test:ui -- --grep TableController` passed with `348 SUCCESS`.
- Manual browser testing on 2026-06-04 confirmed `Fit to width` visually fits a
  TableUp table to the real margin-to-margin document content width.

### 2026-06-04 Table Cell Focus And Keyboard Navigation Status

Current state:

- Table-cell focus styling is table-owned. The controller applies
  `mn-table-cell-focus` to the active `.ql-table-cell-inner` and its outer
  `td`/`th`.
- Focus is driven from Quill selection state rather than CSS `:focus-within`,
  because DOM focus generally remains on the Quill editor root while the caret
  moves through table content.
- Click-in-cell behavior remains text editing, not TableUp table selection:
  text hits use native caret placement, blank cell space uses a Quill range
  fallback by TableUp cell blot, and music embeds place the cursor after the
  embed.
- Focus scrolls the outer cell into view only when clipped.
- Tab/Shift+Tab navigation, add-row-at-end on Tab from the last cell,
  first-cell Shift+Tab swallowing, focus clearing when selection leaves a
  table, and ArrowDown from the line above a table into the first cell have
  controller coverage.

Open:

- ArrowLeft/back-arrow out of the first cell is still broken in manual UI
  testing. Current code attempted to handle it through a leading `ArrowLeft`
  binding plus table-owned selection movement, but static controller tests were
  not enough to catch the browser behavior. Resume this with live Quill/TableUp
  inspection of the actual selection before/after the handler, not with more
  guessed Delta indices.

Verification:

- Latest focused `npm run test:ui -- --grep TableController` run passed with
  `362 SUCCESS`, but this does not prove the ArrowLeft browser behavior.
