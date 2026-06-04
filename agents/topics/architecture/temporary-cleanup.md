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

Status: in progress; row/column selection, context menu, column hover cursor,
and much interaction routing are feature-owned; Quill/TableUp bootstrap,
runtime module access, debug instrumentation, cell-focus behavior, and some
table-specific editor helpers still need cleaner seams

Priority: high

Problem:

- `src/mn/features/editor/components/EditorPage.jsx` imports and registers
  `quill-table-up` directly.
- `EditorPage` owns table Tab navigation, row/column selection, column pointer
  behavior, table selection helper calls, and table insertion.
- The table controller and context menu are feature-owned, but a large amount of
  table interaction behavior still lives in the editor presentation component.

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
- A cleaner ownership model is for the table feature to contribute its Quill
  module definition and Quill constructor module options, while the editor
  applies all Quill registrations during editor setup. This would let the table
  feature own `TableUp`, `TableSelection`, `TableResizeLine`, their CSS import
  if desired, and TableUp module options such as selection color. The editor
  would still own when Quill is initialized.
- The table feature should probably not call `Quill.register(...)` directly
  unless Quill becomes an intentional shared platform dependency. Prefer a
  table-owned Quill contribution that the editor consumes and applies.
- Table insertion is currently:

  ```text
  TableController.insertTable()
  -> editor-surface.insertTable(1, 2)
  -> active EditorPage surface adapter
  -> EditorPage.insertTable()
  -> this.quill.getModule(TableUp.moduleName).insertTable(...)
  ```

- `EditorPage.insertTable(...)` does not build table DOM. It validates/clamps
  row and column counts, gets the live TableUp module instance from the active
  Quill editor, and calls `tableModule.insertTable(rowCount, columnCount,
  'user')`.
- A stronger seam would let the table feature say "remember the Quill module I
  contributed; give me the live instance for the active editor." In practice,
  add a generic editor surface method such as `getQuillModule(name)` and let
  `TableController` execute:

  ```js
  const tableModule = editorSurface.getQuillModule(TableUp.moduleName);
  tableModule?.insertTable?.(rows, columns, 'user');
  ```

- With both a Quill contribution seam and `editorSurface.getQuillModule(name)`,
  `EditorPage` could drop direct TableUp setup and the table-specific
  `insertTable(...)` adapter. The editor surface would expose generic access to
  active editor module instances rather than named table commands.

What would remain in `EditorPage` after those seams:

- Table cell Tab/Shift+Tab navigation unless moved to `TableController` through
  `editor-interactions`.
- Plain table-cell click/caret placement and music-embed click placement unless
  moved to the table feature with generic selection helpers.
- TableUp mousedown suppression gate unless the table feature can access the
  live TableSelection instance and active surface lifecycle.
- Table overflow width scanning until it is generalized as a wide-content layout
  contribution.
- Table debug instrumentation unless moved to a table debug/service layer with
  access to editor root, TableSelection, and cleanup lifecycle.
- Table-related editor CSS unless moved into a table feature stylesheet or
  asset contribution.

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

- The table context menu includes attempted `Split table above` and `Split table
  below` commands.
- Manual browser testing shows the command is not usable: the table can appear
  to split, but the second half is lost or the result is not two durable
  independent TableUp tables.
- The attempted implementation tried Parchment/TableUp splitting and
  re-keying/cloning table ids/columns, but the real TableUp optimizer behavior
  still does not preserve the trailing half.
- Do not continue patching this blindly. The next step should be a real
  Quill/TableUp integration harness that inspects actual DOM and Delta before
  and after the command.

Likely seam requirements to move the remaining behavior:

- `editorSurface.getQuillModule(name)` for live module instances.
- Generic selection methods: get/set selection, set selection without scroll,
  focus without scroll, find blot, get blot index, and perhaps select a DOM
  cell/blot element.
- Surface lifecycle events such as active surface attached/detached so the table
  feature can install and clean up TableUp gates/instrumentation.
- Generic editor root/container access and point/range helpers for click focus,
  hover, and debug snapshots.
- Optional layout contribution support for wide-content selectors.

Cell-click focus investigation:

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
  `suppressTableSelection`. `EditorPage` marks the event so the gated TableUp
  mousedown handler does not reselect the cell. It then runs a deferred
  cell-focus fallback: if native Quill/browser selection is already inside the
  clicked cell, leave it alone; if not, programmatically focus Quill and place
  the cursor at the start of the cell while preserving scroll. Clicks on text
  cursor targets are left to native caret placement. Clicks on music embeds in a
  table cell place the cursor after the embed.
- Current implication: the behavior is already a hybrid model:
  native/browser caret placement for text hits, Quill range placement by
  TableUp cell blot for blank cell space, and a music-embed special case. This
  is enough evidence to treat the desired cell-focus behavior as established.
  The remaining cleanup is to move this hybrid operation from `EditorPage` into
  the table feature once `editor-surface` exposes the needed Quill helpers and
  live TableSelection access.
- Test coverage: `EditorPageSpec` covers blank-cell fallback focus,
  music-embed-in-cell cursor placement, text-target skip behavior, scroll
  preservation during forced selection, and suppression handoff.
  `TableControllerSpec` covers the table-controller side of simple cell click
  suppression and preserving right-click selected-column context.

Cleanup direction:

- Treat this as several smaller seam repairs, not one broad move.
- Continue removing table-specific fallback helpers from `EditorPage`, but move
  the full current hybrid cell-focus behavior rather than only the
  capture-phase TableUp suppression.
- Defer moving Quill/TableUp registration until the Quill contribution seam is
  explicit. It is a clean cleanup target, but less urgent than behavior that is
  still mixed into `EditorPage`.
- Add `editorSurface.getQuillModule(name)` before trying to remove
  `EditorPage.insertTable(...)`. Once available, table insertion can become a
  table-owned command that asks the active editor for the live TableUp instance.
- Preserve the current cell focus model while moving ownership: native caret
  placement for text hits, Quill range fallback by TableUp cell blot for blank
  cell space, and the music-embed cursor-after behavior.
- Move Tab and Shift+Tab table cell navigation into the table feature through
  `editor-interactions`; this remains an isolated behavior slice.
- Continue moving table context-menu context building and selected-table
  interpretation closer to the table controller.
- Treat split-table as an unresolved table-controller behavior, not a completed
  context-menu command. Stabilize it against a real TableUp/Quill harness before
  calling the table operation surface complete.
- Continue moving row/column selection interpretation into the table feature
  where practical.
- Keep only generic editor context helpers on `EditorPage`, such as access to
  the current Quill instance, root node, and generic blot lookup.
- Keep generic editor DOM capture in `EditorPage` if needed; the editor page is
  still the natural owner for root/page geometry and raw editor event mounting.
- Define the table feature's editor adapter needs before moving larger code:
  current Quill, root node, table module, generic blot lookup, selection helpers,
  and possibly page-coordinate helpers.
- Decide whether `quill-table-up` registration is an editor adapter
  responsibility or should be wrapped behind a table-owned registration module,
  but do this separately from selection/navigation behavior cleanup.

Suggested slice order:

1. Expose Quill-aware active editor surface access. The cleanup goal is not
   Quill agnosticism; it is keeping table semantics out of `EditorPage`.
   `editor-surface` can expose readonly or controlled Quill helpers such as
   `getQuill()`, `getQuillModule(name)`, `getEditorRoot()`,
   `findBlot(node, bubble)`, `getSelection()`, `setSelection(...)`,
   `getIndex(blot)`, `getLine(index)`, and `getLeaf(index)` when that keeps the
   table feature from inventing a heavier adapter.
2. Move table insertion execution from `EditorPage.insertTable(...)` into
   `TableController`. The table feature can call
   `editorSurface.getQuillModule(TableUp.moduleName).insertTable(...)`, then
   request a document dirty/update notification through the editor surface if
   needed.
3. Move Tab and Shift+Tab table navigation into the table feature through
   `editor-interactions`. `EditorPage` should keep generic key dispatch and
   Quill helpers, but the table feature should decide how table cell navigation,
   wrapping, and add-row-at-end behavior work.
4. Move TableSelection access and the TableUp mousedown suppression gate out of
   `EditorPage` once the table feature can reach the live TableUp/TableSelection
   modules and can clean up on active surface detach.
5. Move the established cell-focus hybrid into the table feature. Define a
   table-owned operation for "focus this cell as text editing" separately from
   "select these cells for table commands", preserving native caret placement
   for text hits, Quill range fallback for blank cell space, and music-embed
   cursor-after behavior.
6. Move or delete table debug instrumentation. After the table feature owns live
   TableSelection access and surface lifecycle cleanup, relocate `mn.tableDebug`
   tracing to the table feature or remove pieces that are no longer needed.
7. Move table layout scanning into a generic wide-content contribution. Assume
   any feature can eventually render content wider than the available page
   width. Replace direct `.ql-table-wrapper` overflow scanning in `EditorPage`
   with a feature contribution API where tables are the first contributor.
8. Move table CSS intentionally. Keep generic editor layout CSS in the editor
   feature, but move table-specific cursor/wrapper/toolbox rules and third-party
   TableUp CSS into a table feature stylesheet or asset contribution when a
   clean asset path exists.
9. Add a Quill contribution seam so the table feature can contribute TableUp
   registration, TableSelection/TableResizeLine module config, and eventually
   third-party table CSS while the editor still applies the registrations during
   Quill setup. This is a clean ownership target, but it can follow the behavior
   moves above.

Information needed for the slices:

- Already intended/exposed: active surface lifecycle events
  (`surface-attached` / `surface-detached`), active selection access, editor
  interaction routing with target/point context, generic blot lookup through the
  interaction context, and editor root access through interaction dispatch.
- Needs to be added to `editor-surface`: Quill-aware live accessors such as
  `getQuill()`, `getQuillModule(name)`, `getEditorRoot()`, `findBlot(...)`,
  `getIndex(...)`, `getLine(...)`, `getLeaf(...)`, `setSelection(...)`, and
  possibly `focus(...)` / `update(source)`.
- Cell-click behavior and current mechanism are already decided: clicking in a
  table cell should enter that cell for text editing, not select the cell as a
  table-selection region. The table-owned focus operation should preserve the
  existing hybrid of native caret placement for text hits, Quill range placement
  by TableUp cell blot for blank cell space, and music-embed cursor-after
  placement. The open work is exposing enough editor-surface helpers to move
  that behavior out of `EditorPage`.
- Layout direction is decided: use a generic editor wide-content contribution,
  because any feature can eventually render content wider than the available
  page width. Tables should be the first contributor, not a one-off hook.
- Needs an asset decision before implementation: where third-party TableUp CSS
  and table-owned cursor/toolbox styles should live in the build asset flow.

Verification:

- Table insertion still works.
- Row and column selection still works.
- Tab and Shift+Tab table navigation still works.
- Row/column/table context menu commands still work; split-table remains open
  and should not be counted as a completed table command yet.
- Table controller/component tests pass.

### 3. Paragraph Formatting Cascade Duplication

Status: open

Priority: medium-high

Problem:

- `paragraph-format/controller.js` resolves style defaults, style inheritance,
  and normalized paragraph formatting.
- `EditorPage.jsx` has parallel helper logic for paragraph format extraction,
  direct-format overrides, style resolution, and generated style rules.

Why this matters:

- Paragraph direct formatting is supposed to override only changed properties.
- Styles should continue to affect paragraphs that inherit unchanged
  properties.
- Duplicated cascade logic risks drift between toolbar/dialog state and editor
  rendering.

Cleanup direction:

- Extract paragraph format cascade helpers into a shared helper module or
  service-owned module.
- Reuse the same helper from `paragraph-format` and the editor adapter.
- Keep Quill-specific format application in `EditorPage`, but move pure
  normalization and cascade rules out of the component.

Verification:

- Paragraph format tests still pass.
- Editor toolbar state still reflects current paragraph formatting.
- Document style changes still affect inherited paragraph properties.

### 4. Editor Toolbar Section Constants As Feature API

Status: open

Priority: medium

Problem:

- `paragraph-format` and `music-object` import `EDITOR_TOOLBAR_SECTIONS` from
  `src/mn/features/editor/services/editor-toolbar.js`.
- This makes an editor feature implementation file act as a public contract for
  other features.

Why this matters:

- Feature internals are private unless deliberately promoted.
- Cross-feature API should be intentional and documented.

Cleanup direction:

- Promote toolbar section ids into a deliberate public contract.
- Possible homes:
  - an editor-toolbar contract module
  - a shared constants module
  - methods on the `editor-toolbar` service
- Update feature imports to use the promoted contract.

Verification:

- Toolbar item ordering remains unchanged.
- Toolbar service tests still pass.
- Paragraph and music-object toolbar items still register.

### 5. Imported CSS In Editor Path

Status: open

Priority: medium

Problem:

- `EditorPage.jsx` imports `quill/dist/quill.snow.css`.
- `EditorPage.jsx` imports `quill-table-up/index.css`.
- Architecture guidance treats imported CSS as legacy and prefers asset-pipeline
  CSS for shipped styling.

Why this matters:

- CSS and asset inclusion should be explicit build behavior.
- Feature styling should be easy to trace through feature `build.json` files.

Cleanup direction:

- Decide the correct asset-pipeline location for third-party editor/table CSS.
- Move or reference the CSS through the build asset flow rather than component
  imports where practical.
- Keep editor-owned overrides in the editor feature stylesheet and table-owned
  styling in the table feature stylesheet if one is added.

Verification:

- Quill theme styling still appears in the app and tests.
- Table plugin styling still appears.
- Watcher/build behavior is unchanged or documented if a restart is needed.

### 6. Render-Time Registry Fallbacks In React Components

Status: open

Priority: low-medium

Problem:

- Some React components still subscribe to registry services as render-time
  fallbacks.
- Example: `AppShell` can subscribe to `document-model` inside `render()`.

Why this matters:

- Presentation should usually receive services and data through props from the
  owning view.
- Non-service classes that need registry services should subscribe at a
  runtime-ready point such as `componentDidMount`, not during render.

Cleanup direction:

- Prefer passing required services from the owning view.
- If a fallback is still needed, subscribe once during mount and store the
  result rather than subscribing in `render()`.

Verification:

- App shell and document tabs still render.
- App shell tests still pass.

## Tracking Notes

- This review was architecture-focused; no test run was performed when the list
  was created.
- The table controller itself is broadly aligned with the intended seam because
  it uses `editor-interactions` and `editor-views`.
- The strongest immediate repair is the music-object session seam because the
  type contract and implementation currently disagree.
