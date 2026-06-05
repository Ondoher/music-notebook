# View Mode

## Purpose

Track the MVP design for switching between the editable document stream and a paginated read/preview mode.

This note is intentionally focused on view mode. Use:

- [Quill Integration](../architecture/quill-integration.md) for the editor/embed model
- [Document Model](document-model.md) for persisted document settings and tab content
- [MVP Topic](README.md) for product scope
- [Paged View Mode Spike](paged-view-mode-spike.md) for the first CSS
  paged-media split-view investigation

## Current Direction

The MVP separates document editing from paginated document reading:

- edit view
- read view
- split view

Edit view is the current implementation priority. It is the `Quill`-native continuous editing stream.

Read view is a later implementation slice. It should render paginated page boxes from the notebook document model and active tab editor stream. It should become the closest app view to print and `PDF` export.

Split view is a likely implementation compromise for layout-sensitive features. It should keep the Quill editor visible beside a synchronized read-view pane, allowing users to keep editing in the stable Quill surface while inspecting the more faithful page/layout rendering.

The important product rule is:

- do not force `Quill` edit view to behave like a live paginated word processor

Pagination-related settings that cannot have reliable live visual indicators in Quill should still be represented in the document model when needed, then interpreted by read view and export.

The `view-mode` feature owns the read/split rendering surface. The current first
slice exposes a `ViewModePane` component that the editor can mount in the split
workspace, plus a clone/filter adapter for preparing detached Quill content for
Paged.js. Future read-mode routes or app-shell regions should mount the
view-mode component rather than keeping preview code inside the editor feature.

Current implementation note:

- the active split-preview implementation still uses a disposable clone of the
  live Quill root and sends that DOM plus CSS to `Paged.js`
- the broader `view-mode.preparePagedContent(...)` clone/filter path exists but
  is not currently used by `PagedViewPreview`, because its earlier music-embed
  normalization path hid or damaged rendered music objects in the preview
- paged preview CSS is intentionally preview-only and should not change the edit
  view's Quill/TableUp behavior
- table preview work should first rely on semantic table pagination in Paged.js
  rather than manually chunking or restructuring tables

## Current Model Hook

The document model already stores:

```js
settings: {
	viewMode: 'continuous',
	page: {
		size: 'letter',
		orientation: 'portrait',
		margins: {
			top: 72,
			right: 72,
			bottom: 72,
			left: 72,
		},
	},
}
```

The ambient type currently allows:

```js
viewMode: 'continuous' | 'page'
```

Working naming:

- `continuous` means edit view
- `page` means read/page view
- `split` can mean edit view plus synchronized read/page preview

This naming can stay internal even if the visible UI uses `Edit` and `Read`.

## Edit View Responsibilities

Edit view owns:

- continuous Quill editing
- typing, selection, undo, and caret behavior
- inline formatting
- insertion of explicit stream objects such as music embeds and manual page breaks
- active-tab editor content updates through `document-model`
- approximate wrapping width based on page settings

Edit view may show simple indicators for explicit objects, such as a manual page break.

Edit view should not promise:

- exact automatic pagination
- reliable visual indicators for widow/orphan control
- reliable visual indicators for keep-with-next or keep-lines-together
- exact page break preview
- table splitting preview
- final export layout fidelity

## Read View Responsibilities

Read view owns:

- paginated page boxes
- automatic page overflow
- page size and orientation rendering
- page margin application
- honoring manual page-break objects
- honoring page-break-before block settings, if added
- interpreting keep-with-next and keep-lines-together settings, if added
- widow/orphan control, if feasible
- table splitting behavior, if feasible
- repeated table headers, if feasible
- print and `PDF` preview fidelity

Read view should be layout-focused and mostly non-editable.

## Split View Direction

Split view should present edit view and read view side-by-side:

- left pane: editable Quill stream
- right pane: read-only page/layout renderer
- shared source: the active tab's document model content
- synchronization path: Quill text changes update `document-model`, and read view subscribes to the document model and rerenders

The first split-view slice should keep synchronization one-way from edit to preview. Cursor mapping, selection mapping, and bidirectional editing are out of scope until there is a strong product reason to add them.

Scroll synchronization can be added after basic content synchronization. It should start coarse, such as matching approximate document progress, before attempting exact block-to-block scroll mapping.

Split view is especially useful for features that are important in final layout but awkward or brittle in Quill edit view:

- automatic pagination
- page-break-before / next-page starts
- start-on-full-line behavior
- table pagination
- post-MVP multi-column layout

This preserves the product rule that Quill edit view should not be forced to behave like a live paginated word processor.

## Planned View-Mode Features

### Automatic Page Overflow

Read view computes where content naturally breaks into page boxes.

Implementation path:

1. Convert the active tab's Quill Delta into renderable block/object units.
2. Render units into a hidden or measured layout surface using the selected page content width.
3. Measure block heights and split them into page groups.
4. Render page boxes from the computed page groups.
5. Keep computed page boundaries transient unless a later decision requires persisted layout metadata.

### Page Size

Read view renders actual page boxes using the document page size.

Implementation path:

1. Continue storing page size in `document-model.settings.page.size`.
2. Centralize page-size definitions in a shared page-layout helper.
3. Resolve page size to point dimensions.
4. Convert points to CSS pixels consistently for screen rendering.
5. Apply the same helper in export code so read view and export do not drift.

### Page Orientation

Read view supports portrait and landscape orientation.

Implementation path:

1. Continue storing orientation in `document-model.settings.page.orientation`.
2. Resolve width and height from page size plus orientation.
3. Use the resolved dimensions for page boxes and content area calculations.
4. Recompute pagination when orientation changes.

### Page Margins

Read view applies global page margins.

Implementation path:

1. Continue storing margins as point values in `document-model.settings.page.margins`.
2. Resolve page content width and height by subtracting margins from page dimensions.
3. Render each page with a page box and an inner content area.
4. Use the inner content area for pagination measurement and final page rendering.

### Manual Page Breaks

Manual page breaks are explicit document stream objects.

Implementation path:

1. Add a custom Quill page-break object for edit view.
2. Store the page break in the active tab's Quill Delta.
3. Render a simple visible marker in edit view.
4. Treat the object as a forced page boundary in read view.
5. Honor the same object in export.

### Page Break Before

Page break before is a block-level formatting option that forces a new page before a block.

Implementation path:

1. Add a block attribute or app-owned paragraph metadata representation.
2. Allow the paragraph formatting dialog to set or clear it.
3. Keep edit-view indication minimal or absent unless a simple marker is practical.
4. During read-view pagination, start a new page before the block.
5. Apply the same rule in export.

### Start On Full Line

Start on full line is a block-level formatting option that starts a paragraph or block below preceding content.

Music objects are large inline Quill embed leaves, similar to image embeds, so
this option is no longer a text-wrap control for music-object floats. It remains
useful as a general paragraph/page-layout signal for headings, tables, and
future read-view/export layout rules.

Music-object rendering is currently width-driven and natural-height. Read view
and export should measure the rendered preview plus caption instead of relying
on a fixed persisted height as a clipping box.

Implementation path:

1. Add a block attribute or app-owned paragraph metadata representation.
2. Allow the paragraph formatting dialog to set or clear it.
3. Consider making title, heading, table, and page-break-adjacent block styles default to start on full line.
4. In edit view, map the option to a block-start styling rule.
5. In read view and export, honor the same block-start behavior when laying out blocks.

### Keep With Next

Keep with next prevents a paragraph or block from separating from the following block.

Implementation path:

1. Add a block attribute or app-owned paragraph metadata representation.
2. Allow the paragraph formatting dialog to set or clear it.
3. During read-view pagination, group the block with the next eligible block.
4. Move the grouped blocks together when they do not fit at the bottom of a page.
5. Define fallback behavior for groups that are taller than a page.

### Keep Lines Together

Keep lines together prevents a single paragraph from splitting across pages.

Implementation path:

1. Add a block attribute or app-owned paragraph metadata representation.
2. Allow the paragraph formatting dialog to set or clear it.
3. During read-view pagination, measure the full paragraph block.
4. Move the paragraph to the next page when it does not fit.
5. Define fallback behavior for a paragraph taller than a page.

### Widow And Orphan Control

Widow/orphan control avoids leaving too few lines at the top or bottom of a page.

Implementation path:

1. Treat this as read-view/export layout behavior, not an edit-view visual feature.
2. Add a document or paragraph-level setting only after pagination measurement can count rendered lines reliably.
3. Measure paragraph line boxes during pagination.
4. Adjust page breaks to preserve the configured minimum line counts.
5. Reuse the same rule in export if the export path has matching measurement fidelity.

### Multi-Paragraph List Handling

Read view can eventually paginate list groups more intelligently than Quill edit view can display.

Implementation path:

1. First spike Quill's actual list Delta model for multi-paragraph list content.
2. Decide whether list continuation needs app-owned metadata.
3. Convert list runs into grouped render units in read view.
4. Apply keep-with-next, keep-lines-together, and widow/orphan rules to list groups where practical.
5. Keep MVP behavior conservative if Quill list semantics become brittle.

### Tables Across Pages

Table splitting belongs in read view and export, not Quill edit view.
The current edit-view table implementation uses `quill-table-up` through the
local `table` feature; see [Quill TableUp Implementation](quill-table-up.md) for
the current implementation status and remaining table risks.

Current split-preview status:

- Paged.js has native table support, so the first approach is to let it paginate
  semantic `table` / `thead` / `tbody` / `tr` / `td` DOM
- the preview CSS now uses stronger preview-only selectors so TableUp's
  edit-view `.ql-table-wrapper` `inline-block` / `max-content` sizing does not
  leak into the read-only pane
- large TableUp tables now render in the right-hand paged preview after the
  wrapper/table rules force the cloned table into a block, page-width,
  `table-layout: fixed` shape
- keep this fix preview-only; edit view still allows wide tables so resize
  handles remain reachable
- broader table pagination and export fidelity remain open; do not add
  preview-only table chunking or DOM restructuring until a new concrete
  pagination failure is instrumented

Implementation path:

1. Keep the current Paged.js path using semantic TableUp DOM plus preview-only
   wrapper/table CSS overrides.
2. Instrument any remaining paged table failures to compare
   wrapper/table/section/row/cell size and computed break styles against a
   working table.
3. Convert `quill-table-up` table content into explicit table render units only
   if relying on the live cloned DOM remains too brittle.
4. Start with simple whole-table placement if splitting is not yet reliable.
5. Add row-level splitting only if the table model supports it cleanly.
6. Add repeated table headers after row-level pagination is stable.

### Multi-Column Layout

Multi-column layout is currently post-MVP. If supported, split view is the likely implementation path.

Quill edit view should remain a mostly single-flow authoring surface. Read view can render the same document into columns, making the layout consequences visible without requiring Quill to become a desktop-publishing editor.

Implementation path:

1. Treat columns as a document-level setting first, such as `settings.layout.columns`.
2. Keep the editable Quill pane continuous and avoid promising exact column placement while typing.
3. Render columns in read view using the same document snapshot that export will consume.
4. In split view, rerender the read-view pane as the user edits so column flow and paragraph start rules are inspectable.
5. Reuse the read-view column renderer for `PDF` export if fidelity is good enough.
6. Only consider section-level columns after document-level columns and export behavior are stable.

### Print And PDF Preview Fidelity

Read view should become the closest visual match to exported `PDF`.

Implementation path:

1. Build read view from the same document snapshot export will consume.
2. Centralize page geometry helpers.
3. Keep manual page breaks and document formatting rules shared between read view and export.
4. Prefer a `PDF` export path that can reuse read-view rendering if it provides the best fidelity.
5. Document any intentional differences between read view and exported output.

## First Implementation Slice

Do not implement all pagination behavior at once.

Recommended first slice:

1. Add a read-view route or page component that can render the active tab read-only.
2. Add a view command that switches `settings.viewMode` between `continuous` and `page`.
3. Render page boxes using current page size, orientation, and margins.
4. Render the active tab's Delta into those page boxes without automatic splitting at first.
5. Add manual page-break objects and split pages on those objects.
6. Add automatic overflow only after page boxes and manual breaks are stable.

This sequence lets view mode become real without immediately solving full print layout.

Split view can be added after read view has a basic read-only renderer. It should reuse the same read-view component rather than creating a separate preview implementation.

## Later Implementation Slices

After the first slice:

1. Add automatic block measurement and overflow.
2. Add paragraph spacing and page-break-before interpretation.
3. Add keep-with-next and keep-lines-together.
4. Investigate widow/orphan control.
5. Add table pagination behavior.
6. Add split view as a synchronized edit-plus-preview mode.
7. Align `PDF` export with read-view rendering.
8. Consider post-MVP multi-column layout in read view and split view.

## Open Questions

- Should `settings.viewMode` be persisted per document, per user, or treated as transient session state?
- Should the internal value `page` be renamed to `read` before the UI hardens?
- Should split view be persisted as a document/user preference, or always be transient session state?
- Does read view create any persisted layout metadata beyond explicit page-break objects?
- Should `PDF` export mirror read view exactly in MVP?
- Are page headers and footers part of MVP read view or only post-MVP?
- Should read view show all tabs sequentially, only the active tab, or provide a tab-aware page sequence?
- Where should tab controls appear in read view?
- How should read view indicate automatic page overflow boundaries during early implementation?
- What is the fallback behavior when a keep-together group is taller than one page?
- How should read view and export honor paragraph-owned start-on-full-line points?
- What level of scroll synchronization is enough for split view?
- Should multi-column layout begin as document-level only, or is section-level column control required before it is useful?
- Can table splitting be good enough for MVP, or should MVP keep tables together?
