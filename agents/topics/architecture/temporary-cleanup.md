# Temporary Architecture Cleanup Tracker

## Purpose

Track temporary architecture cleanup work where the current code appears to have
drifted from the architecture guidance.

This is intentionally a short-lived working document. Use it to:

- keep cleanup candidates visible
- prioritize seam repairs
- mark progress as items are fixed
- avoid rediscovering the same drift during later MVP work

Once these items are resolved or moved into more permanent topic notes, delete
this tracker or replace it with a smaller status note.

## Current Priority List

### 1. Music-Object Controller Session Seam

Status: completed

Priority: high

Problem:

- `src/mn/features/music-object/controller.d.ts` declares a controller-owned
  embed session API with `attachEmbed(...)`.
- `src/mn/features/music-object/components/MusicEmbedView.jsx` tries to attach
  to that session.
- `src/mn/features/music-object/controller.js` currently only implements
  `ready`, so the presentation falls back to owning playback behavior and
  looking up the `player` service directly.

Why this matters:

- The intended architecture says embedded-object presentation should report
  gestures and render session-provided state.
- Playback, object actions, and durable behavior should live in the
  music-object controller or controller-owned session.
- The current fallback keeps important behavior in React presentation.

Cleanup direction:

- Implement `attachEmbed(...)` in `music-object-controller`.
- Implement or expose `getPlayerService()` through the controller/session path.
- Add the public methods to `this.implement(...)`.
- Use `MusicObjectEmbedSession` as the controller-owned behavior object.
- Remove the fallback player-service lookup and playback ownership from
  `MusicEmbedView` once the session path is real.

Verification:

- `music-object-controller` now implements `attachEmbed(...)` and
  `getPlayerService()`.
- `MusicEmbedView` no longer owns fallback player-service lookup or playback
  lifecycle behavior.
- `MusicEmbedView` now keeps rendering the music preview when an app registry is
  present but `music-object-controller.attachEmbed()` is unavailable, logs a
  console error, suppresses interactive controls, and shows a red error marker
  in the top-right of the embed with keyboard focus and `Error loading object`
  hover text.
- Added `MusicObjectControllerSpec` coverage for controller-owned session
  playback routing.
- `npm run test:ui -- --grep "MusicEmbedView|KeyboardEmbed|MusicObjectController"`
  ran the UI lane and passed; latest related run including `LocalizedTooltip`
  passed: `312 SUCCESS`.

### 2. Table Behavior In `EditorPage`

Status: completed; row/column selection, selected-column right-click context,
context menu commands, column hover cursor, fit-to-width/distribute-columns,
cell-focus behavior, interaction routing, table CSS, and Quill/TableUp
bootstrap are feature-owned

Priority: high

Problem:

- `src/mn/features/editor/components/EditorPage.jsx` no longer imports TableUp
  modules or registers/configures `quill-table-up` directly.
- Table overflow width scanning, table cell focus/caret placement, the TableUp
  mousedown suppression gate, Quill/TableUp bootstrap, and temporary table debug
  instrumentation have moved out of `EditorPage` or been removed.
- The table controller and context menu are feature-owned, row/column selection
  plus table command interpretation have moved out of `EditorPage`, and the
  remaining native mousedown suppression handshake is generic.

Why this matters:

- The architecture direction says the `table` feature owns table selection,
  context menu behavior, row/column operations, and keyboard cell navigation.
- `EditorPage` should provide generic editor context and mounting seams, not
  accumulate feature-specific table logic.

Editor-owned information and actions:

- Only the editor knows the live editor surface, current editor instance,
  editor root, scroll/container nodes, current editor selection, generic blot or
  object lookup, page/content bounds, gutter bounds, and pointer coordinates
  relative to the editor.
- Only the editor should own editor-wide keyboard/context-menu event capture,
  editor surface mount/unmount, focus/selection restore, history batching,
  generic content insertion, generic selection changes, and editor-owned
  overlays that depend on page geometry.
- The editor may still need to own low-level DOM capture and page geometry even
  when table interpretation moves out.

Abstract table responsibilities:

- A table needs to know its structure: rows, columns, cells, cell coordinates,
  merged or spanned cells if supported, table identity, row/column/cell
  metadata, and content boundaries inside each cell.
- A table needs to track position: current cell, row, column, whether focus is
  inside cell content or on a table affordance, whether the user is before,
  inside, or after the table, and neighboring cells in each direction.
- A table needs to normalize selection: one cell, multiple cells, full row,
  multiple rows, full column, multiple columns, whole table, text inside a cell,
  or mixed/partial table selection.
- A table needs to interpret user intent: move between cells, move by direction,
  select or extend selection, select row/column/table, insert/delete rows or
  columns, resize columns, open the table menu, copy/cut/paste table content,
  merge/split cells if supported, and leave the table before or after it.
- A table needs to enforce constraints: avoid invalid cell targets, decide
  whether edge navigation wraps/adds/leaves, preserve a valid rectangular table,
  normalize selection into meaningful table regions, enable or disable commands
  from table state, respect resize limits, and apply paste policy.
- A table may maintain abstract state such as active table id, active cell
  coordinate, selected cell ranges, hover target, resize draft state, pending
  menu context, and normalized command availability.

Table UI / editor UI intersection:

- The table does have UI responsibilities, but they should be table-specific UI
  responsibilities rather than general editor-surface responsibilities.
- The editor UI owns the surface: raw key, pointer, context-menu, focus, blur,
  and native selection events; editor root and scroll geometry; page and gutter
  bounds; Quill selection get/set/restore; history boundaries; generic content
  insertion; generic blot lookup; and feature view mount points.
- The table UI owns table affordances: row and column gutters, selected-cell
  visuals, active-cell visuals, resize handles, resize feedback, table context
  menu content, and command availability from table state.
- The table feature should interpret table meaning from editor events: a pointer
  hit is a row gutter, a column selection band, a cell, text inside a cell, a
  resize handle, or an empty selected table area; a key event is table
  navigation, table selection extension, context-menu request, or ordinary editor
  input.
- The shared boundary should look like editor event plus editor geometry plus
  current selection flowing into the table feature; the table feature interprets
  table intent; then it asks the editor adapter to apply selection, mutation, or
  view updates.
- `EditorPage` may still capture the DOM event because it owns the editor
  surface, but it should not decide what Tab means inside a table, what a row
  gutter means, what a column selection band means, or which table commands are
  enabled.

Selection coordination notes:

- Table selection is the most difficult seam because it combines three different
  selection models:
  - browser/native selection: drag selection, caret hit testing,
    `selectionchange`, and native ranges
  - Quill document selection: `{ index, length }`, focus state, blot lookup, and
    history behavior
  - table semantic selection: active cell, row range, column range, selected cell
    blots, and TableUp overlay state
- `EditorPage` currently coordinates all three. That gives it legitimate access
  to native and Quill mechanics, but also causes it to own table meaning.
- A better split is: editor owns selection mechanics; table owns selection
  meaning.
- Editor-owned selection mechanics include converting browser points/ranges to
  Quill ranges, getting and setting Quill selection, restoring focus, listening
  to native `selectionchange`, finding blots from DOM nodes, providing root/page
  geometry, and applying history batching.
- Table-owned selection meaning includes deciding whether a hit means row,
  column, cell, whole table, or text inside a cell; tracking anchor/focus for
  row, column, and cell drags; normalizing selected cells into shapes such as
  `cell`, `row`, `column`, and later possibly `table` or `mixed`; deciding
  command availability from that shape; and applying selected cells through the
  TableUp selection module.
- The table feature probably needs an editor adapter with methods like
  `getRoot()`, `getQuill()`, `findBlot(node, bubble)`, `rangeFromPoint(x, y)`,
  `getTableSelectionModule()`, `applyTableSelection(table, cells)`, and
  `setSelection(index, length, source)`.
- A likely migration path is to first move pure table-selection calculations out
  of `EditorPage` and into or near `table-selection.js`, then keep editor pointer
  listeners temporarily while delegating row/column/cell interpretation to the
  table feature. This creates a smaller, testable step before moving the full
  event coordination path.

Current implementation plan notes:

- TableUp already creates durable table identity. During `insertTable(...)`, it
  creates a `tableId`, row ids, and column ids; the rendered wrapper, table,
  columns, cells, and cell inners expose that metadata through attributes such as
  `data-table-id`, `data-row-id`, and `data-col-id`.
- Because tables are Quill/TableUp-native DOM rather than React components, the
  table feature cannot naturally use ordinary React event handlers inside the
  rendered table. Imperatively attaching listeners to TableUp DOM would create a
  second event lifecycle that could drift from Quill mutations.
- Use editor-routed interactions for Quill-native table events. Keep ordinary
  React component events local to their component when the feature owns the
  rendered UI.
- The table feature can register generic editor interaction ownership using the
  id shape it cares about, for example `selector: '[data-table-id]'` and
  `idAttribute: 'data-table-id'`. `EditorPage` should treat these as generic
  routing details and should not know that `data-table-id` means a table.
- Service registrations should not pass service function references. Calls into
  a service should go through the `Service` interface. For editor interactions,
  use the fixed router method `handleEditorEvent` implemented by the owning
  service; interaction registrations should not carry function references or
  alternate method names.
- The concrete editor interaction registration shape should express ownership
  and event capability, for example:

  ```js
  editorInteractions.registerHandler({
    id: 'table.editor-region',
    serviceName: 'table-controller',
    events: [
      'contextmenu',
      'keydown',
      'gutter-line-select-start',
      'gutter-line-select-move',
      'gutter-line-select-end',
      'pointermove',
      'pointerdown',
      'pointerup',
      'pointercancel',
    ],
    selector: '[data-table-id]',
    idAttribute: 'data-table-id',
    gutterSelectable: true,
    role: 'table',
    priority: 100,
  });
  ```

- `registerHandler(...)` should require `id`, `serviceName`, and `events`.
  `selector`, `idAttribute`, `gutterSelectable`, `role`, and `priority` are
  optional ownership/routing metadata. Dispatch should always call
  `service.handleEditorEvent(eventName, event, context)`.
- `EditorPage` should use registered ownership metadata to resolve the service
  that applies to the concrete editor location or selection. Event type should
  not be the primary way to choose a service; it should be the verb sent to the
  already resolved owner.
- On pointer movement over the editor surface, `EditorPage` should resolve the
  best matching registered owner from the pointer target or point, build the
  editor interaction context, and dispatch the hover/move interaction to that
  owner.
- Initial pointer events resolve ownership. Continuing gesture events should
  preserve ownership through capture until `pointerup` or `pointercancel`, even
  if the pointer leaves the original element.
- Feature handlers should be able to return generic interaction effects such as
  `handled`, `capturePointer`, `preventDefault`, `stopPropagation`, and
  `cursorClass`.
- `EditorPage` may apply a returned cursor class generically, but the table
  feature should decide when the table column-selection cursor is active.
- Table column selection likely needs editor-routed `pointermove`,
  `pointerdown`, `pointerup`, and `pointercancel` events because the event starts
  in Quill-native table DOM. The table feature should own detecting the top
  column-selection band, resolving the target `tableId`/`colId`, tracking the
  drag anchor, extending the selected columns, and requesting TableUp selection
  application.
- Gutter line selection remains a special editor-owned surface. It should use a
  distinct resolver that starts from the gutter pointer position and searches
  rightward into editor content; if the hit resolves to `data-table-id`, the
  table feature can convert the line-select intent into table row selection.
- If multiple owned candidates are found on one visual line during gutter
  selection, the initial rule is to choose the candidate closest to the gutter.
  This edge case is expected to be rare, and the rule is deterministic enough
  for the first implementation.
- Selection extension should capture the owner chosen on the initial
  gutter-line-select start. Subsequent move/end events should keep going to that
  owner with both the original anchor hit and the current hit, even if the
  pointer moves over a different owner.
- Content selection may be handled as an editor/native selection-change
  interaction that features observe, rather than as a pointer event owned by
  every feature.
- Context menus can be handled directly by React components when the click is
  inside feature-owned React UI. Table context menu still needs an editor-routed
  path unless table interactions move behind a feature-owned overlay, because
  table cells are Quill/TableUp DOM.
- Current table coverage through `editor-interactions` now includes
  `contextmenu`, `keydown`, `mousedown-capture`, pointer events for column
  hover/selection, and gutter line-selection events. The table controller now
  registers one service-owned handler and routes all event verbs through
  `handleEditorEvent(...)`.
- `EditorInteractionDispatcher` exists as a central editor-side dispatcher. It
  resolves registered ownership from the event target or selection, builds the
  editor interaction context, applies generic handler effects such as
  `preventDefault`, `stopPropagation`, pointer capture, and cursor classes, and
  keeps continued pointer gestures routed to the initially resolved owner.
- `EditorPage` now has generic editor-routed event plumbing for native
  capture-phase `mousedown`, editor pointer events, and gutter-line selection.
  This is an improvement over directly wiring table column selection handlers
  into the render path.
- Table context menu, keyboard context menu, row gutter selection, and column
  selection/hover are now covered by the table feature's interaction handler.
  `EditorPage` no longer owns the old row/column selection fallback helpers.
- Column-selection follow-up: after removing the editor fallback, column
  selection initially only worked in limited cases. The missing seam was
  point-based ownership resolution for hover/top-band pointer hits that do not
  land directly on table DOM. `EditorInteractionDispatcher` now supports
  `pointSelectable` handlers with optional `pointHitMargin`, and the table
  handler declares a top margin for its column-selection band.
- Column-selection hit-test follow-up: when the old editor fallback was moved
  into `TableController`, the column-cell lookup was accidentally stricter than
  the old code. The working behavior is: once the pointer is in the table's top
  selection band, choose the column by X position only. Do not require the
  pointer Y to be above the cell top.
- Cursor follow-up: table column hover returns a generic `cursorClass`.
  `EditorInteractionDispatcher` now separates the editor root from an optional
  cursor root, so transient cursor classes can be applied to the Quill container
  rather than only `.ql-editor`. Editor CSS covers TableUp wrappers and
  descendants for the column-selection cursor.
- Current focused verification after these changes:
  `npm run test:ui -- --grep "EditorPage|TableController|EditorInteractionsService"`
  passed with `326 SUCCESS`.
- Later focused verification of the current view-mode/table CSS cleanup passed:
  `npm run test:ui -- --grep ViewModeService` with `328 SUCCESS`.

Quill/TableUp bootstrap and live module seam:

- The table feature is allowed to be Quill/TableUp-specific. The cleanup goal
  is not to make tables editor-agnostic; the goal is to keep table behavior and
  TableUp command semantics from leaking into `EditorPage`.
- In other words, `table` may know about Quill, TableUp, TableSelection,
  TableResizeLine, TableUp module names, and TableUp APIs. It should not know
  or own `EditorPage`, React mount details, editor DOM layout internals, or how
  the active editor surface is stored.
- The editor feature may know how to host Quill, apply registered Quill
  contributions, expose the active Quill/module access through services, and
  route raw editor events. It should not know table semantics such as "column
  selection band", `selectedTds` shapes, default table insert dimensions, or
  "Tab means next table cell".
- There are two different "module" concepts that should not be conflated:
  - registration module/class: `TableUp`, passed to `Quill.register(...)` so
    Quill knows how to install that module type
  - runtime module instance: `this.quill.getModule(TableUp.moduleName)`, the
    live TableUp instance attached to one mounted editor
- Quill 2.0.3 tolerates repeated `Quill.register(..., true)` calls. The third
  argument or object-form second argument `true` means overwrite/suppress the
  warning. Repeated registration is acceptable for bootstrap, though module
  static `register(...)` side effects should still be considered when designing
  a shared contribution seam.
- The cleaner ownership model is now implemented for TableUp. The table feature
  contributes its Quill module definition and Quill constructor module options
  through the editor-ready interaction signal. The editor applies all Quill
  registrations during editor setup and still owns when Quill is initialized.
  The table feature owns `TableUp`, `TableSelection`, `TableResizeLine`, and
  TableUp module options such as selection color.
- Table insertion execution now lives in the table feature:

  ```text
  TableController.insertTable()
  -> editorSurface.getQuillModule(TableUp.moduleName)
  -> tableModule.insertTable(1, 2, 'user')
  -> editorSurface.update('user')
  ```

- `EditorPage.insertTable(...)` and `editor-surface.insertTable(...)` were
  removed. The editor surface now exposes generic live module access instead of
  a named table command.
- The table feature now says "give me the live TableUp module for the active
  editor" and executes:

  ```js
  const tableModule = editorSurface.getQuillModule(TableUp.moduleName);
  tableModule?.insertTable?.(rows, columns, 'user');
  ```

- With the editor-ready Quill setup signal and `editorSurface.getQuillModule(name)`,
  `EditorPage` no longer needs direct TableUp setup. The table-specific
  insertion adapter is also gone.

What remains in `EditorPage` after those seams:

- The native mousedown suppression handshake is now generic:
  feature handlers can return `suppressNativeSelection`, and `EditorPage` marks
  the native event with `mnSuppressNativeSelection`. The table feature still
  owns deciding when plain cell clicks should suppress TableUp's native
  selection handler.
- Table insertion execution has moved out of `EditorPage`; `TableController`
  now calls the live TableUp module through
  `editorSurface.getQuillModule(TableUp.moduleName)`.
- Table cell Tab/Shift+Tab navigation now lives in `TableController` through
  `editor-interactions`. `EditorPage` keeps only a generic leading Tab keyboard
  binding that dispatches through the interaction service before Quill/TableUp
  default handlers.
- Plain table-cell click/caret placement and music-embed click placement now
  live in `TableController` through `editor-interactions`. The table feature
  preserves the established hybrid behavior: native caret placement for text
  hits, deferred Quill range fallback for blank cell space, and cursor-after
  placement for music embeds inside table cells.
- TableUp mousedown suppression gate now lives in `TableController`. It uses
  `editorSurface.getEditorRoot()` and
  `editorSurface.getQuillModule(TableUp.moduleName)` to wrap the live
  TableSelection mousedown handler, and restores the original handler on active
  surface detach or replacement.
- Temporary TableUp/table-selection debug instrumentation was removed after it
  served its purpose.
- Table overflow width scanning now uses a generic `editor-layout`
  wide-content contribution API. `TableController` registers the TableUp table
  selectors as the first contributor, while `EditorPage` only asks the layout
  service for the widest contributed content. The intended edit-view layout is:
  keep the simple continuous editor surface, show a dotted guide at the
  available content width, let wide content render beyond that guide, keep
  ordinary wrappable text constrained to the available width, and clip only at
  the outer sheet edge so overflow is visible while editing. `Fit to width`
  now uses the document-format page size and margins as the authoritative
  content width instead of inferring from editor DOM measurements. Manual
  browser testing on 2026-06-04 confirmed `Fit to width` visually aligns a
  TableUp table to the margin-to-margin content width.
- Table-specific cursor/wrapper/toolbox/focus CSS now lives in the table
  feature stylesheet; generic editor layout CSS stays in `editor`.
- Table-named editor view context types are removed. `EditorPage` now passes
  generic Quill/editor view helpers such as `getModule(name)`, `getSelection`,
  `getLine`, `getLeaf`, `getIndex`, and `setSelection`.

Current read-view/paged-preview table status:

- `PagedViewPreview` currently uses the live Quill root clone directly rather
  than `viewMode.preparePagedContent(...)`, because the previous generalized
  music-embed normalization path caused music objects to disappear or content
  after tables to stop rendering.
- The current Paged.js table approach is deliberately conservative: do not
  chunk large tables and do not restructure the preview DOM. Let Paged.js see
  the semantic TableUp table.
- Preview-only CSS now uses stronger selectors than the edit-view
  `.mn-document-content .ql-editor .ql-table-wrapper` rule, treats
  `.ql-table-wrapper` as a normal block wrapper, constrains the table to page
  width, allows `table`, `thead`, and `tbody` to break, and keeps `tr` rows
  together.
- Manual browser verification confirmed the large-table right-pane rendering
  issue was fixed by the preview CSS override.
- Broader table pagination/export fidelity is still open. The next step for any
  new pagination failure is instrumentation on the cloned preview DOM and/or
  Paged layout hooks to identify whether the unplaceable node is the wrapper,
  table, section, row, cell, or music-object cell content.
- Avoid adding preview-only table chunking, table lifting, or `display:
  contents` until instrumentation proves that structural intervention is
  necessary.

Current edit-view split-table status:

- `Split table above` and `Split table below` are back in the feature-owned
  table context menu.
- The current implementation avoids the earlier direct Parchment/TableUp
  wrapper split. It reads the live Quill Delta for the selected TableUp table,
  partitions whole rows, and replaces the original table with two complete
  TableUp table Deltas using fresh table/row/column ids.
- The command refuses boundary splits where one side would be empty and refuses
  row spans that cross the requested split boundary.
- Manual edit-view UI testing confirmed the split command works in the browser.
  The follow-up split-table hardening item has been handled outside this
  cleanup pass.

Likely seam requirements to move the remaining behavior:

- `editorSurface.getQuillModule(name)` for live module instances.
- Generic selection methods: get/set selection, set selection without scroll,
  focus without scroll, find blot, get blot index, and perhaps select a DOM
  cell/blot element.
- Surface lifecycle events such as active surface attached/detached so the table
  feature can install and clean up TableUp gates/instrumentation.
- Generic editor root/container access and point/range helpers for click focus,
  hover, and debug snapshots.
- Layout contribution support for wide-content selectors exists through
  `editor-layout`. Manual browser testing on 2026-06-04 confirmed the
  margin-based fit-to-width behavior in edit view after switching the command to
  `document-format.getContentWidth()`.

Cell focus and keyboard navigation status:

- Desired behavior: a plain click anywhere inside a table cell should focus the
  Quill cursor in that cell, without drawing the cell as selected. Explicit
  table affordances such as row/column selection should still use TableUp
  `TableSelection` state.
- TableUp `TableSelection` is not just visual UI. It is also semantic state used
  by TableUp operations through `selectedTds`. Removing it entirely is likely
  the wrong direction.
- Online search did not find a public TableUp-specific issue for plain cell
  clicks placing the caret without selected-cell highlighting. The package
  source confirms that `TableSelection.tableSelectHandler` listens to Quill
  root `mousedown` and selects table cells on a left click inside a table.
- Current implementation: editor dispatches generic capture-phase
  `mousedown-capture`; table controller treats plain left clicks inside cells as
  caret intent, clears/hides TableUp selection, and returns
  `suppressNativeSelection`. `EditorPage` only marks the event with a generic
  native-suppression flag so the table-owned gated TableUp mousedown handler
  does not reselect the cell. `TableController`
  then runs the deferred cell-focus fallback: if native Quill/browser selection
  is already inside the clicked cell, leave it alone; if not, programmatically
  focus Quill and place the cursor at the start of the cell while preserving
  scroll. Clicks on text cursor targets are left to native caret placement.
  Clicks on music embeds in a table cell place the cursor after the embed.
- Current implication: the behavior is a table-owned hybrid model:
  native/browser caret placement for text hits, Quill range placement by
  TableUp cell blot for blank cell space, and a music-embed special case. This
  should remain the expected cell editing behavior.
- Test coverage: `TableControllerSpec` covers blank-cell fallback focus,
  music-embed-in-cell cursor placement, text-target skip behavior, simple cell
  click suppression, and preserving right-click selected-column context.
  `EditorPageSpec` covers scroll preservation during forced selection and the
  editor-side suppression handoff.
- Focus rectangle status: the table feature applies `mn-table-cell-focus` to the
  active `.ql-table-cell-inner` and its outer `td`/`th`. This is intentionally
  driven from Quill selection state and controller-owned focus state, not CSS
  `:focus-within`, because Quill usually keeps DOM focus on the editor root.
- Selection-change status: `selection-change` is broadcast even without a
  resolved editor-interaction target. `TableController.handleEditorSelectionChange`
  derives the active cell from `getLeaf(...)`/`getLine(...)`, applies focus when
  the Quill selection enters a cell, and clears focus when the selection leaves
  the table.
- Scroll status: table-owned focus operations scroll the focused outer table
  cell into view only when the cell is clipped by the viewport or a scroll
  ancestor. A follow-up fixed the Tab/Shift+Tab scroll bounce by scheduling the
  scroll after `setSelectionWithoutScroll(...)` restores scroll snapshots.
- Keyboard status that currently works in coverage and has been manually useful:
  Tab/Shift+Tab cell navigation, add-row-at-end on Tab from the last cell,
  first-cell Shift+Tab swallowing, and ArrowDown from the line immediately above
  a table into the first cell.
Cleanup direction:

- Treat this as several smaller seam repairs, not one broad move.
- Continue keeping table-specific fallback helpers out of `EditorPage`; the
  current hybrid cell-focus behavior now belongs to `TableController`.
- Keep Quill/TableUp registration on the editor-ready contribution seam. The
  table feature contributes TableUp setup; the editor only applies contributed
  Quill configuration before construction.
- Table insertion now uses `editorSurface.getQuillModule(name)` and lives in
  `TableController`; `EditorPage.insertTable(...)` has been removed. Keep this
  as the model for future table commands that need the active editor's live
  TableUp instance.
- Preserve the current table-owned cell focus model: native caret placement for
  text hits, Quill range fallback by TableUp cell blot for blank cell space, and
  the music-embed cursor-after behavior.
- Tab and Shift+Tab table cell navigation now lives in the table feature
  through `editor-interactions`; `EditorPage` keeps only the generic leading
  keyboard binding needed to dispatch before Quill/TableUp defaults.
- ArrowDown from the line above a table also uses this leading-keyboard path and
  is table-owned.
- Keep all table-specific context-menu context building and selected-table
  interpretation in the table feature. This is a hard ownership rule: cell,
  row, column, table, TableUp selection, and table command semantics belong to
  `TableController` or table-owned helpers, not the editor page.
- Split-table is no longer tracked as active table/editor cleanup debt; the
  follow-up hardening item has been handled separately.
- Keep row/column selection interpretation in the table feature.
- Keep only generic editor context helpers on `EditorPage`, such as access to
  the current Quill instance, root node, and generic blot lookup.
- Keep generic editor DOM capture in `EditorPage` if needed; the editor page is
  still the natural owner for root/page geometry and raw editor event mounting.
- Keep future table/editor integration behind the existing editor interaction,
  editor surface, editor layout, and editor-ready contribution seams.

Suggested slice order:

Order these by separation gained per implementation risk/effort. Mark each
slice complete as it lands.

1. Status: complete. Generic Quill-aware `editor-surface` helpers now expose
   controlled active-editor access for later table cleanup slices. The cleanup
   goal is not Quill agnosticism; it is keeping table semantics out of
   `EditorPage`. `editor-surface` exposes readonly or controlled Quill helpers
   such as
   `getQuill()`, `getQuillModule(name)`, `getEditorRoot()`,
   `findBlot(node, bubble)`, `getSelection()`, `setSelection(...)`,
   `getIndex(blot)`, `getLine(index)`, and `getLeaf(index)` when that keeps the
   table feature from inventing a heavier adapter. Verification:
   `npm run test:ui -- --grep EditorSurfaceService` passed with `334 SUCCESS`.
2. Status: complete. Table insertion execution moved from
   `EditorPage.insertTable(...)` into `TableController`. The table feature now
   calls `editorSurface.getQuillModule(TableUp.moduleName).insertTable(...)`
   and requests `editorSurface.update('user')`; `EditorPage.insertTable(...)`
   and `editor-surface.insertTable(...)` were removed. Verification:
   `npm run test:ui -- --grep TableController` passed with `334 SUCCESS`, and
   manual UI validation confirmed table insertion still works from the app.
3. Status: complete. Table-named editor view context helpers were replaced
   with generic Quill/editor helpers. `EditorPage.getEditorViewContext()` no
   longer exposes `getTableModule`, `getTableSelectionModule`,
   `getCurrentTableCellInner`, or `selectTableCell`; it now exposes generic
   helpers such as `getModule(name)`, `getSelection`, `getLine`, `getLeaf`,
   `getIndex`, and `setSelection`. Verification:
   `npm run test:ui -- --grep "EditorPage|TableController"` passed with
   `335 SUCCESS` and covered the `EditorPageSpec` context regression plus
   table controller/context-menu behavior.
4. Status: complete. Tab and Shift+Tab table navigation moved into
   `TableController` through `editor-interactions`. `EditorPage` no longer owns
   `navigateTableCell(...)` or `appendTableRowAfterCell(...)`; it keeps a
   generic leading Tab keyboard binding that dispatches `keydown` through
   `editor-interactions` so table navigation can run before Quill/TableUp
   default handlers. The leading binding marks the synthetic dispatch with
   `mnLeadingKeyboardBinding`; the table controller ignores ordinary React Tab
   `keydown` events so one physical Tab does not move twice. The table feature
   now owns next/previous cell navigation, add-row-at-end, first-cell Shift+Tab
   swallowing, and pass-through when the current selection is outside a table.
   Verification: `npm run test:ui -- --grep "TableController|EditorPage"`
   passed with `338 SUCCESS`.
5. Status: complete. The TableUp mousedown suppression gate moved out of
   `EditorPage` and into `TableController`. The table feature now reaches the
   active editor root through `editorSurface.getEditorRoot()`, gets the live
   TableUp/TableSelection module through
   `editorSurface.getQuillModule(TableUp.moduleName)`, wraps TableUp's root
   mousedown handler, suppresses it when table interaction routing marks a
   plain cell click as caret intent, and restores the original handler when the
   active surface detaches or changes. Remaining `EditorPage` TableSelection
   access is limited to debug instrumentation.
   Verification: `npm run test:ui -- --grep "TableController|EditorPage"`
   passed with `344 SUCCESS`.
6. Status: complete. The established cell-focus hybrid moved into
   `TableController`. Plain left-clicks inside table cells clear/hide TableUp
   selection, suppress TableUp's root mousedown selection, and schedule a
   table-owned deferred focus operation. The operation preserves native caret
   placement for text hits, uses Quill range fallback for blank cell space,
   places the cursor after music embeds inside cells, and asks the editor
   interaction context to preserve scroll when forcing a selection. `EditorPage`
   now only dispatches the capture event and marks the native event for TableUp
   suppression. Verification:
   `npm run test:ui -- --grep "TableController|EditorPage"` passed with
   `341 SUCCESS`.
7. Status: complete. Temporary table debug instrumentation was removed from
   `EditorPage` rather than moved. The `mn.tableDebug` flag, native event
   tracing, TableSelection method/listener patching, debug snapshot helpers,
   and dispatch debug logging are gone. Remaining table cleanup should use
   focused tests or short-lived instrumentation instead of keeping this in the
   editor component.
8. Status: complete. Table layout scanning moved into a generic wide-content
   contribution. Assume any feature can eventually render content wider than the
   available page width. `editor-layout` owns wide-content contribution
   registration and measurement; `TableController` registers TableUp table
   selectors as `table.wide-content`; `EditorPage` only applies the resulting
   generic `--mn-editor-overflow-width` value. The edit-view visual model is:
   the dotted guide marks the available margin-to-margin content width, wide
   content can visibly overflow past that guide, ordinary wrappable text still
   wraps to the available width, and the outer sheet clips only the extreme
   workspace edge. `Fit to width` uses `document-format.getContentWidth()`,
   which derives the target from page size and left/right document margins
   rather than DOM inference. If that document-format width is unavailable, the
   command refuses to run instead of falling back to a guessed width.
   Verification:
   - `npm run test:ui -- --grep DocumentFormatService`: `348 SUCCESS`.
   - `npm run test:ui -- --grep TableController`: `348 SUCCESS`.
   - Manual browser testing on 2026-06-04 confirmed `Fit to width` visually
     fits the table to the margin-to-margin document content width.
9. Status: complete. Remaining table-specific editor CSS moved into
   `src/mn/features/table/assets/css/table.css`. The table feature build spec
   now copies feature-local CSS to `table/css` and still copies third-party
   `quill-table-up` CSS to `table/vendor`. Generic editor layout CSS stays in
   the editor feature; table-owned column-selection cursor, TableUp wrapper,
   and TableUp toolbox rules now live with the table feature.
10. Status: complete. Table cell focus and adjacent keyboard polishing are
    table-owned now. Focus styling, selection-change focus derivation, focus
    clearing, scroll-into-view-if-clipped, Tab/Shift+Tab, and ArrowDown into the
    first cell from the preceding line have coverage.
11. Status: complete. TableUp Quill bootstrap now uses the editor-ready
    interaction signal. `TableController` registers for `editorReady`, implements
    `handleEditorReady(...)`, and contributes TableUp registration plus
    TableSelection/TableResizeLine module config through editor-owned callbacks.
    `EditorPage` applies the contributed Quill registrations and merges
    contributed module options immediately before constructing Quill, without
    importing `quill-table-up`.

Information needed for the slices:

- Already exposed: active surface lifecycle events
  (`surface-attached` / `surface-detached`), active selection access, editor
  interaction routing with target/point context, generic blot lookup through the
  interaction context, and editor root access through interaction dispatch.
- Already exposed on `editor-surface`: Quill-aware live accessors such as
  `getQuill()`, `getQuillModule(name)`, `getEditorRoot()`, `findBlot(...)`,
  `getIndex(...)`, `getLine(...)`, `getLeaf(...)`, `setSelection(...)`,
  `focus(...)`, `update(source)`, and related active-editor helpers.
- Cell-click behavior and current mechanism are already decided: clicking in a
  table cell should enter that cell for text editing, not select the cell as a
  table-selection region. The table-owned focus operation should preserve the
  existing hybrid of native caret placement for text hits, Quill range placement
  by TableUp cell blot for blank cell space, and music-embed cursor-after
  placement. This behavior has moved out of `EditorPage`.
- Layout seam direction is implemented: use the generic `editor-layout`
  wide-content contribution service because any feature can eventually render
  content wider than the available page width. Tables are the first
  contributor, not a one-off editor hook. Manual testing confirms `Fit to
  width` now makes a TableUp table visually match the margin-to-margin document
  content width.
- Asset decision resolved for third-party CSS: `quill-table-up` CSS is copied
  from `node_modules` by the table feature build spec. Table-owned cursor,
  wrapper, toolbox, and focus rules now live in the table feature stylesheet.

Verification:

- Table insertion still works; manual UI validation confirmed insertion from
  the app after moving execution into `TableController`.
- Row and column selection still works.
- Tab and Shift+Tab table navigation still works in automated coverage after
  moving the behavior into `TableController`; manual UI spot-check is still
  useful because Quill keyboard timing is browser-sensitive.
- ArrowDown from the line above a table into the first cell has automated
  coverage.
- Row/column/table context menu commands still work; split-table is available
  again through Delta-level reconstruction, and its follow-up hardening item has
  been handled separately.
- Table controller/component tests pass.

### 3. Paragraph Formatting Cascade Duplication

Status: moved to [Formatting](../mvp/formatting.md)

Priority: medium-high

Note:

- This is part of the larger MVP formatting model rather than a standalone
  temporary cleanup item. The duplication note and likely helper extraction now
  live in [Formatting](../mvp/formatting.md).

### 4. Editor Toolbar Section Constants As Feature API

Status: escalated to [Editor Toolbar](../mvp/editor-toolbar.md)

Priority: medium

Note:

- This is not just a constants cleanup. It raises a larger design tension:
  features should own their toolbar contributions independently, but the app
  still needs consistent toolbar grouping and ordering. The open question is now
  tracked in [Editor Toolbar](../mvp/editor-toolbar.md).

### 5. Imported CSS In Editor Path

Status: completed

Priority: medium

Problem:

- Earlier code imported third-party CSS directly from JS components:
  `EditorPage.jsx` imported `quill/dist/quill.snow.css` and
  `quill-table-up/index.css`; `MusicPreview.jsx` imported
  `react-piano/dist/styles.css`.
- Architecture guidance treats imported CSS as legacy and prefers asset-pipeline
  CSS for shipped styling.

Why this matters:

- CSS and asset inclusion should be explicit build behavior.
- Feature styling should be easy to trace through feature `build.json` files.

Cleanup direction:

- Use feature `build.json` CSS entries with `cwd` pointing into
  `node_modules` for third-party package styles.
- Keep editor-owned overrides in the editor feature stylesheet and table-owned
  overrides in the table feature stylesheet.

Verification:

- `src/mn/features/editor/build.json` copies
  `node_modules/quill/dist/quill.snow.css` to
  `dist/mn/editor/vendor/quill.snow.css`.
- `src/mn/features/music-object/build.json` copies
  `node_modules/react-piano/dist/styles.css` to
  `dist/mn/music-object/vendor/styles.css`.
- `src/mn/features/table/build.json` copies
  `node_modules/quill-table-up/dist/index.css` to
  `dist/mn/table/vendor/index.css`.
- `npm run build` passed and generated stylesheet links for all three vendor
  stylesheets.
- `rg 'import .+\.css' src\mn` has no source hits.
- Build-spec changes are not reliably picked up by the watcher, so manual app
  rebuild/restart is still required after changing CSS build entries.

### 6. Render-Time Registry Fallbacks In React Components

Status: open

Priority: low-medium

Problem:

- Some React components still subscribe to registry services as render-time
  fallbacks.
- Some components also resolve services through helper methods used by
  lifecycle/event/render paths.

Why this matters:

- Views should be stupid wherever practical. Presentation components should
  usually receive data and callbacks through props from the owning view or
  controller rather than talking to models or broad app services directly.
- Sometimes the only available registry is the React context registry. That is
  acceptable for component boundaries that truly need it, because context is
  only available through React lifecycle/render/event paths.
- The localization service and active locale are direct context properties.
  Components should read `context.localize` and `context.locale`, not resolve
  localization through `context.registry.subscribe('localize')`.
- Locale changes should be listened for at the provider/top level. Components
  that use localized text should rerender from context locale changes rather
  than subscribing to `changeLocale` themselves.
- If a component genuinely needs a service from context, subscribe once at a
  lifecycle point such as `componentWillMount`/`componentDidMount` and keep the
  reference. That same lifecycle point is where service event subscriptions
  belong. Components that need services before mount should receive them as
  props.
- The more important question is not "did the component use the registry?" but
  "why does this component need access to that service at all?"

Component checklist:

- [x] `src/mn/features/app/components/AppShell.jsx`
  - Current pattern: `render()` can subscribe to `document-model` and pass it
    to `DocumentTabs`.
  - Decision: this is wrong separation. The view should not talk to a model at
    all. It should receive tab state/data/actions as props, or at minimum the
    needed model should be supplied by the owning app view/controller rather than
    looked up by `AppShell`.
  - Done when: `AppShell` no longer subscribes to `document-model` and receives
    tab presentation data/actions through props or a narrower view-owned seam.
- [x] `src/mn/features/app/components/DocumentTabs.jsx`
  - Current pattern: helper methods can subscribe to `document-model` and
    previously fell back through the registry for `localize`.
  - Decision: document tab UI should receive the data/actions it needs from the
    owning view/controller. Localization can come from context, but should be
    resolved once rather than repeatedly through registry fallback helpers.
  - Done when: `DocumentTabs` no longer subscribes to `document-model`; it
    receives tab state and tab command callbacks through props. Localization
    uses direct `context.localize`.
- [x] `src/mn/components/Markdown.jsx`
	- Current pattern: `getLocalize()` uses direct `context.localize` and is used
	  by mount/update/load/unmount paths.
	- Decision: needing localization is valid, and it should use the direct
	  context properties. Avoid repeated registry lookups and leaf-level locale
	  event subscriptions.
	- Done when: `Markdown` resolves `localize` once during mount, reuses that
	  reference for markdown loading, refreshes from `context.locale` changes,
	  and never falls back through the registry or subscribes to locale events.
	- Completed: `Markdown` caches `context.localize` in `componentWillMount`,
	  tracks `context.locale`, and reloads markdown from React context updates
	  rather than listening to localization service events directly.
- [x] `src/mn/components/LocaleString.jsx` and
  `src/mn/components/LocalizedTooltip.jsx`
  - Current pattern: render calls translation helpers that can trigger
    `setupLocaleService()`, which uses direct `context.localize`.
  - Decision: these are intentionally context-aware localization primitives, so
    needing `localize` is valid. They should read `context.localize` and rerender
    from `context.locale`; they should not subscribe to locale events
    themselves.
  - Done when: localization service resolution happens before render-called
    translation helpers if needed, render output depends on context locale
    updates, and no registry fallback or locale event subscription exists.
  - Completed: both components now resolve `context.localize` directly during
    translation and do not subscribe to `changeLocale` or `updated`; phrase
    content `updated` is intentionally treated as an unnecessary edge case.
- [x] `src/mn/features/music-object/components/MusicEmbedFormatDialog.jsx`
  - Current pattern: the dialog subscribes to `document-model` to read document
    styles for caption style options/inheritance.
  - Decision: poor separation of concerns. The dialog should receive available
    styles, resolved formatting data, or a formatting helper from the owning
    music-object/session/controller layer. This also overlaps with the larger
    formatting topic.
  - Done when: the dialog no longer subscribes to `document-model`; formatting
    inputs come from props/session/controller-owned formatting helpers.
  - Completed: the music-object controller/session exposes document styles,
    `MusicEmbedView` passes them as `documentStyles`, and
    `MusicEmbedFormatDialog` resolves caption style options/inheritance from
    props without registry/model access.
- [x] `src/mn/features/music-object/components/MusicEmbedView.jsx`
  - Current pattern: the embed view subscribes to `music-object-controller` to
    attach a controller-owned embed session; it also subscribes to
    `action-registry` while rendering action icons.
  - Decision: the detached Quill React-root path may require a narrow context
    bridge for the controller-owned session, but the current flow is backwards.
    The session/controller should supply the data/actions/action presentation
    identity needed by the view, and action registry access should not be
    resolved from the render path for each action.
  - Done when: the embed session/controller owns the service flow, and
    `MusicEmbedView` no longer resolves `action-registry` from render. Any
    remaining controller lookup is a narrow, documented detached-root bridge.
  - Completed: `MusicObjectController` resolves registered action components for
    embed actions, `MusicObjectEmbedSession` supplies those components on the
    action data, and `MusicEmbedView` only applies presentation props when
    rendering the supplied component. The remaining
    `music-object-controller` lookup is the narrow detached Quill React-root
    bridge for attaching the controller-owned embed session.

Cleanup direction:

- Prefer passing required data and callbacks from the owning view/controller.
- If a component truly needs a service, pass the service as a prop when it is
  needed before mount.
- If context lookup is unavoidable, subscribe once during
  `componentWillMount`/`componentDidMount` and store the result rather than
  subscribing in `render()` or render-called helpers.
- For each case, first ask whether the component should know the service exists
  at all. Moving a registry lookup earlier in lifecycle is only a mechanical
  fix; it does not solve poor ownership.

Verification:

- App shell and document tabs still render.
- App shell tests still pass.
- Localization updates still rerender localized text and tooltips through direct
  `context.localize`.
- Music embeds still attach controller-owned sessions and render action icons.

### 7. EditorPage Responsibility Split

Status: open

Priority: high

Problem:

- `src/mn/features/editor/components/EditorPage.jsx` is currently much more
  than a view component. It owns Quill mounting, document-model synchronization,
  editor-surface adapter registration, toolbar state coordination, paragraph
  formatting reads/writes, document-format/layout refresh, view-mode preview
  HTML, editor interactions, feature-owned editor views, object-type context,
  clipboard setup, and several DOM observers/listeners.
- The component resolves many services directly: `editor-toolbar`,
  `editor-surface`, `document-model`, `document-format`, `view-mode`,
  `editor-interactions`, `editor-layout`, `editor-views`, and
  `object-type-registry`.
- The aspiration is still stupid views. Keep Quill-specific DOM/rendering
  adaptation where necessary, but continue pushing orchestration and
  service/model coordination out of the React component.

Current immediate issue:

- Render-time fallbacks for `editor-toolbar` and `action-registry` are wrong when
  these can be resolved before render or supplied as props.

Breakdown for further design:

- Quill adapter responsibilities:
  - likely belong near `EditorPage` or a dedicated editor-surface adapter
  - examples: mounting Quill, exposing live Quill helpers, preserving scroll
    during selection changes, wiring native editor root listeners
- Controller/model responsibilities:
  - should move out of `EditorPage`
  - examples: reacting to active tab/document-model changes, deciding when to
    write editor content back to the model, coordinating dirty/update behavior
- Toolbar responsibilities:
  - should not be a view-side service lookup
  - controller/editor adapter should connect toolbar selections to editor
    operations, and the component should receive toolbar dependencies through
    props or a narrower view seam
- Formatting responsibilities:
  - pure paragraph-format cascade belongs in the formatting topic/helper work
  - Quill line-format application can remain adapter-owned until a cleaner seam
    exists
- View-mode responsibilities:
  - read/split preview orchestration should belong to view-mode/editor
    controller seams, not generic presentation rendering
  - `EditorPage` may still provide the live editor root or HTML snapshot as an
    adapter output
- Feature extension responsibilities:
  - `editor-interactions`, `editor-layout`, and `editor-views` are useful seams,
    but `EditorPage` should ideally mount/dispatch through narrow adapter APIs
    rather than own broad feature orchestration
- Object-type/embed responsibilities:
  - object type context and clipboard matcher setup need a clearer boundary
    between object registry/controller behavior and Quill adapter mechanics

Done when:

- `EditorPage` has no render-time registry fallbacks.
- Any remaining service access is explicitly justified as Quill adapter
  behavior or moved behind a controller/view-owned seam.
- The next extraction slices are documented before large code movement begins.

## Tracking Notes

- This review was architecture-focused; no test run was performed when the list
  was created.
- The table controller itself is broadly aligned with the intended seam because
  it uses `editor-interactions` and `editor-views`.
- The strongest immediate repair is the music-object session seam because the
  type contract and implementation currently disagree.
