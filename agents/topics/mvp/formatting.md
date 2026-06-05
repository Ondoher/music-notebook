# Formatting

## Purpose

Track the MVP formatting model across paragraph formatting, selected text,
document styles, music-object captions, object-local formatting, and future
format controls such as color.

Formatting is larger than any one editor cleanup task. This topic should hold
the durable decisions and open questions so formatting behavior stays coherent
across edit view, read view, persistence, and export.

## Current Baseline

- Document defaults include 12px typography.
- Document paragraph styles currently include `Normal`, `Header 1`, `Header 2`,
  and `Header 3`.
- Paragraph formatting includes style, font size, bold, italic, underline,
  alignment, keep-with-next, spacing before/after, and start behavior.
- Paragraph direct formatting overrides style properties only when the property
  is explicitly changed.
- Paragraph styles override document defaults.
- Style changes should continue to affect paragraphs that inherit unchanged
  properties.
- Music-object captions have their own formatting surface today: style, font
  size, alignment, bold, italic, and underline.
- Future color support should be treated as shared formatting behavior, not as a
  one-off control owned by one feature.

## Cascade Direction

The expected cascade for paragraph text is:

1. document/default formatting
2. paragraph style, including parent style inheritance
3. direct paragraph formatting stored on the Quill line
4. selected inline text formatting, where applicable

Object and caption formatting should inherit from document or paragraph context
by default where practical, with local object formatting only when the object
explicitly overrides an inherited value.

## Open Design Work

- Define the first durable formatting schema beyond the current Quill-oriented
  line attributes and object payload fields.
- Decide which formatting fields belong to document defaults, paragraph styles,
  direct paragraph formatting, inline text formatting, table/cell formatting,
  music-object formatting, and caption formatting.
- Decide how inherited formatting is represented in saved documents so omitted
  values mean "inherit" rather than "reset to default".
- Decide the MVP color scope: paragraph text color, selected text color,
  highlight color, table color, object border color, caption color, or a smaller
  subset.
- Decide whether MVP exposes font family selection, and if so whether it applies
  to paragraph styles, inline text, music-object captions, object labels, or a
  constrained preset set.
- Ensure read view and `PDF` export use the same formatting semantics as edit
  view.

## Current Implementation Note

Paragraph format cascade logic is duplicated between the paragraph-format
feature and the editor adapter:

- `src/mn/features/paragraph-format/controller.js` resolves style defaults,
  style inheritance, normalized style IDs, and effective style formatting for
  dialog/toolbar behavior.
- `src/mn/features/editor/components/EditorPage.jsx` contains parallel helper
  logic for Quill format extraction, direct-format override detection, style
  resolution, document paragraph defaults, generated paragraph style CSS, and
  normalization.

This duplication is risky because formatting UI state and rendered editor
output can drift. For example, a new inherited property could appear correctly in
the dialog but fail to render, or render correctly while the toolbar reports it
as a direct override.

The likely cleanup is to extract pure paragraph-format cascade helpers into a
shared helper module or service-owned module. `EditorPage` should still own
Quill-specific operations such as `getFormat(...)`, `formatLine(...)`, and
selection management, but it should not own the pure formatting cascade rules.

Verification for that cleanup:

- paragraph format tests still pass
- editor toolbar state still reflects current paragraph formatting
- document style changes still affect inherited paragraph properties
- read/view mode renders the same resolved formatting as edit view

