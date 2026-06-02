# Editor Toolbar

## Purpose

Track the MVP design for the editor toolbar.

The editor toolbar is for actions that directly support editing content at the current caret or selection.
It should not become the application's main command surface, and it should not duplicate embedded-object controls that belong on the object hover/focus menu.

## Command Placement Principle

Use this split:

- editor toolbar: "What do I want to insert or format here?"
- object hover/focus menu: "What do I want to do to this embedded object?"
- main command surface: "What do I want to do to this document or app?"

The toolbar should stay focused on current editor context.
Document lifecycle, account, export, view mode, and global document settings belong elsewhere.

## Toolbar Actions

The current implementation uses the `editor-toolbar` registry service in `src/mn/features/editor/editor-toolbar.js`.

The toolbar service is editor-specific.
It stores toolbar item definitions, returns visible items grouped by section, and emits selection events.
It does not execute editor commands directly.
Controllers or editor surfaces listen for toolbar selection and decide what the command does.

Current service methods:

- `addItem(sectionNumber, priority, id, stringId, iconId, options)`
- `updateItem(id, patch)`
- `removeItem(id)`
- `selectItem(id)`
- `getToolbar()`

Current item fields:

- `id`
- `sectionNumber`
- `priority`
- `stringId`
- `iconId`
- `commandId`
- `commandPayload`
- `ownerFeature`
- `tooltipStringId`
- `enabled`
- `visible`
- optional `pressed`

Current event behavior:

- `item-added`
- `item-updated`
- `item-removed`
- `item-selected`
- `disabled-item-selected`

Disabled items remain selectable/focusable at the UI layer so their unavailable state can be communicated.
Selecting a disabled item fires `disabled-item-selected` instead of `item-selected`.

Toolbar icons are resolved through the shared `icon-registry` service.
Features that add toolbar items should register their icons, including optional state-specific icons and hover text string ids, before or alongside registering toolbar items.

### Inline Text

These are frequent and simple enough for direct buttons:

- bold
- italic
- underline
- clear formatting
- text color, if likely MVP color support is kept
- highlight color, if MVP keeps highlight

Font size is intentionally excluded from inline text controls.
It is a paragraph setting for MVP.
The current toolbar therefore places font size with paragraph controls, not with selected-text buttons.

The clear-formatting button belongs with the other text-formatting buttons.

Likely MVP text color support should use the same palette or token model as paragraph and object/caption formatting.
The strongest local reference is `modmod`'s `ColorSelector` / `ColorPickerDialog` pattern, adapted to `MusicNotebookContext`, local shared buttons, localization, and asset-flow CSS.
Color should cascade from document defaults to paragraph styles to inline selected-text formatting, with inline color overriding paragraph color.

### Lists And Simple Paragraph Structure

These paragraph-related actions should stay as direct toolbar buttons because they are frequent, simple, and visually recognizable:

- bulleted list
- numbered list
- indent
- outdent
- maybe alignment, if it proves common enough for direct access

These are intentionally not hidden inside the paragraph formatting dialog.

Current paragraph controls visible in the toolbar include:

- style dropdown
- font size step control
- align left
- align center
- align right
- align justify
- see-white-space toggle

The style dropdown is backed by the document styles in `document-model`.
The current default styles are `Normal`, `Header 1`, `Header 2`, and `Header 3`.

The see-white-space toggle is an editor view aid. It must not change the
document model, Quill Delta, line wrapping, object placement, or whitespace
semantics. Implement it as visual CSS markers only.

### Insert At Caret

These insertions belong in or near the editor toolbar because they create content at the current caret position:

- table
- page break
- keyboard object
- staff object
- inline chord, if typing alone is not sufficient for all users

The main command surface may also expose some insert commands for discoverability, but the toolbar should be the natural place for insertion at the cursor.

Insert controls should live in their own toolbar section, visually separated from text and paragraph formatting.
The current music-object insert buttons live in a right-side insert section.

## Paragraph Formatting Dialog

Paragraph formatting should be opened through a toolbar button rather than expanded into many toolbar controls.

The paragraph format dialog can own parameter-heavy or lower-frequency settings:

- paragraph style
- font size
- text color, if likely MVP shared color support is kept
- alignment, if not kept as direct toolbar buttons
- bold, italic, and underline when applying paragraph-level text style
- start behavior: continuous, full line, or next page
- space before
- space after
- first-line indent
- left indent
- right indent
- keep with next
- keep lines together
- page break before
- widow/orphan control, if feasible
- exact line spacing, if added later

This keeps the toolbar light while still allowing rich document formatting.

Predefined header styles should be treated as a small controlled set before the app grows full style editing.
The current defaults are `Normal`, `Header 1`, `Header 2`, and `Header 3`.
Header styles are bold and use sizes 25, 20, and 15.
The dialog should allow choosing the current paragraph style and resetting direct paragraph overrides back to that style.

The toolbar action could be labeled `Paragraph` or represented by a paragraph/settings icon with localized hover text.

## Actions That Do Not Belong In The Editor Toolbar

Document and app commands belong in the main command surface:

- new document
- open document
- save document
- save as or duplicate document
- rename document
- delete document
- export `PDF`
- log in or log out
- create account
- edit view or read view
- zoom
- document page size, orientation, and margins
- global chord display style
- app settings
- help and about

Embedded-object commands belong on the object hover/focus menu:

- edit a specific embedded object
- play or stop a specific embedded object
- resize an embedded object
- change a specific object's caption, border, alignment, or display mode
- delete or duplicate a specific embedded object

Find/search is undecided.
It may belong in the main command surface, a keyboard shortcut, or a compact editor-adjacent search UI, but it is document navigation rather than caret-level editing.

## Accessibility Notes

Toolbar controls should be keyboard reachable and have localized accessible names.

Icon-only buttons must have hover/focus text or equivalent accessible labels.
Any unavailable control should communicate why it is unavailable rather than disappearing without explanation.

The toolbar should not be the only way to operate embedded-object controls.
Object actions must remain available through the object's own focusable menu or controls.

## Open Questions

- Should alignment be a direct toolbar group or only inside the paragraph dialog?
- Should the current direct alignment toolbar group remain once the paragraph dialog has mature alignment controls?
- Should text color and highlight color be MVP toolbar actions, or wait until color support is decided?
- Should insert commands appear both in the editor toolbar and the main command surface?
- Should inline chord insertion have a button if type-to-create works well?
- What icon set should be used for paragraph format, page break, keyboard, and staff insertion?
- What is the compact tablet layout for the toolbar?
- Should see-white-space expose separate markers for spaces/tabs later, or remain paragraph/end-of-block only for MVP?
