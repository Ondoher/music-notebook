# Quill Embed Navigation

## Purpose

Track selection and navigation behavior around Quill music embeds.

This note used to focus on side-by-side floated staff and keyboard embeds. That
model has been retired. Music objects now use Quill's regular inline embed
behavior. Tables, or a later explicit layout container, are the supported way to
put music objects side by side.

Use this together with:

- [Quill Integration](../architecture/quill-integration.md)
- [Document Model](document-model.md)
- [View Mode](view-mode.md)
- [Quill Table Up Spike](quill-table-up-spike.md)

## Current Decision

Music objects should not invite text to flow around them with float-style
wrapping.

The editing model is:

- A music object is a single Quill inline `Embed`.
- Do not change the embed mode casually; changing it away from the regular
  inline embed behavior breaks cursor behavior.
- Text before and after the object is normal document text in the Quill stream.
- The insert command adds an explicit newline after the object.
- Object alignment controls are implemented on the inline object wrapper and
  should be revisited against paragraph alignment and table-cell layout.
- Captions remain part of the object.
- Rendered size is width-driven and natural-height. Persisted width is the
  primary scale input; legacy height payload fields may still exist, but should
  not define a clipping box for the preview or caption.
- Side-by-side music layout belongs in tables or an explicit future layout
  feature, not adjacent floated embeds.

This keeps music objects compatible with Quill's native cursor handling while
avoiding the ambiguity of floated side channels.

## Retired Problem Shape

The previous model allowed music objects to float left or right while text and
other embeds wrapped beside them. That produced confusing states:

- multiple visual insertion locations for one logical Quill position
- native browser carets appearing far away from the logical selection
- clicks in visual gaps that did not map cleanly to a document index
- arrow-key stops that were valid in Quill but visually unclear
- captions that made paired objects feel like partial table cells without table
  semantics

Those problems are not the product model anymore. We should not add more editor
navigation code to preserve side-by-side floating.

## Desired Behavior

### Collapsed Caret

When the selection is a collapsed insertion point near a music object, the user
should see exactly one caret at the place where typing will insert text.

Useful positions are:

- before the music object
- after the music object, in the paragraph following it
- ordinary text positions before or after the object

There is no custom caret position beside the object for float-style flowing
text.

### Embed Selection

When the object itself is selected, the object should show a clear selected
state and the editor should not also show a competing insertion caret.

The semantic split remains:

- `range.index === embedIndex && range.length === 1`: the embed is selected
- `range.index === embedIndex && range.length === 0`: caret before the embed
- `range.index === embedIndex + 1 && range.length === 0`: caret after the embed

### Mouse Clicks

Clicking the object selects the object or interacts with its object controls.

Clicking above, below, or horizontally beside the object should use Quill's
normal inline embed/image-like document positions. The editor should not create
a special side insertion zone.

### Arrow Keys

Left/right arrow behavior should be understandable and finite:

1. caret before object
2. object selected
3. caret after object

`ArrowLeft` should reverse that sequence. Ordinary text navigation should remain
Quill's responsibility outside object boundaries.

Vertical navigation should prefer nearby normal text positions before or after
the object. It should not try to move into a floated side channel.

## Quill Behavior Facts

The current installed Quill version is `quill@2.0.3`.

Quill has built-in arrow-key bindings for embeds in `modules/keyboard.js`,
named internally as `embed left` and `embed right`.

Those default bindings:

- run only when the adjacent text prefix or suffix is empty
- inspect the adjacent leaf with `quill.getLeaf(...)`
- only handle leaves that are instances of `EmbedBlot`
- move the selection as a collapsed caret position before or after the embed
- do not select the embed as a range

The editor can represent a selected embed as a range:

```js
quill.setSelection(embedIndex, 1, 'user');
```

If we need custom keyboard behavior, Quill keyboard bindings should be installed
in the initial `new Quill(...)` configuration. Bindings added there are
available before Quill's default keyboard bindings.

## Implementation Direction

### 1. Keep The DOM Inline-Leaf-Oriented

Music embed CSS should not use `float`. The object root should render as an
inline-block leaf so Quill can treat it like a large inline embed.

Tables may constrain object width, but the object still behaves as an inline
leaf inside the cell content.

### 2. Keep Format Controls Focused

The format UI should expose:

- caption template
- caption style
- caption font size
- caption alignment
- caption bold, italic, and underline

It should not expose text-wrap or float-side controls.

Object alignment may stay temporarily while the inline model settles, but it
should not be treated as a float or standalone-block layout contract.

### 3. Normalize Legacy Payloads Softly

Older saved payloads may contain `textWrap` or `floatSide`. Readers should
ignore those properties rather than reintroducing float behavior.

### 4. Keep Insert Behavior Simple

After inserting a music object, add a normal newline after it so the user has an
obvious place to continue typing.

Do not insert hidden spacer content to create side-by-side flow positions.

### 5. Use Tables For Side-By-Side Testing

The table spike is the current path for intentional side-by-side music objects.
Caret, selection, and scaling issues inside tables should be treated as
table/object layout problems, not floated text-flow problems.

### 6. Keep Rendering Natural-Height

The music-object root should be an inline-block with a width constraint, not a
fixed-height viewport.

Current rendering rules:

- keyboard previews compute a concrete preview host height from the displayed
  width, natural key count, and key-width-to-height ratio so `react-piano` does
  not expand into large blank vertical space
- staff previews let the generated OSMD SVG scale from its own viewBox with
  `width: 100%` and natural height
- captions render below the visual preview and are not hidden by the preview
  box
- wrapper text metrics are zeroed where needed so Quill/Parchment guard text
  cannot appear as visible whitespace or an NBSP-like character

## Progress

- [x] Captured the original side-by-side embed navigation problems.
- [x] Investigated Quill's default embed arrow behavior.
- [x] Decided to retire music-object text flow/floating.
- [x] Removed text-wrap and float-side controls from music-object formatting.
- [x] Removed music-object float classes and active floating CSS.
- [x] Changed music-object blots to large inline Quill leaves.
- [x] Updated tests to assert the inline/image-like model.
- [x] Changed keyboard and staff embed rendering to width-driven natural height.
- [x] Suppressed inline wrapper line-box and guard-text whitespace artifacts.
- [x] Kept music embeds on Quill's regular inline `Embed` path after testing
  block/paragraph wrappers and confirming they break cursor or mouse behavior.
- [x] Added table-cell music-object behavior: staff and keyboard objects fit the
  cell width, keyboard previews preserve aspect ratio, and music-object resize
  controls are disabled inside table cells.
- [x] Verified the table-cell music-object sizing lane during the earlier table
  interaction work: `307 SUCCESS`; later focused verification is tracked in
  the table/view-mode status notes.
- [ ] Audit saved-document migration needs for legacy `textWrap` and
  `floatSide` payloads.
- [ ] Revisit music-object insertion spacing so sequential inserts produce the
  smallest sensible paragraph structure.
- [ ] Add focused tests for inline embed arrow behavior if regressions
  appear.

## Open Questions

- Should legacy saved documents be cleaned during load, during save, or simply
  tolerated forever?
- How much custom arrow-key handling is still needed once music objects behave
  like large inline image embeds?
- What table-cell formatting controls are needed for polished side-by-side
  music layouts?
