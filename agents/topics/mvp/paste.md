# Paste

## Purpose

Track how paste should work in the MVP editor and how `Quill` clipboard behavior intersects with notebook features.

This note exists because `Quill` can paste more than straight text. The MVP currently prefers text-only paste, but pasted rich content can still affect document shape, persistence, export, accessibility, and security.

Use this note when working on:

- clipboard configuration
- pasted image handling
- pasted table behavior
- link and rich-format paste policy
- copy/paste behavior for custom notebook objects
- document serialization and export implications of pasted content

## Current Product Direction

MVP scope currently says:

- text-only paste is required
- text-only copy is required
- rich external paste/import preservation can wait
- rich external copy/export-to-clipboard preservation can wait
- duplicate for embedded music objects should work through copy/paste

That means the first implementation should be conservative:

- paste should prioritize predictable notebook content over preserving every source style
- external rich paste should not quietly introduce unsupported document structures
- any allowed non-text paste type needs a persistence and export policy

## How Quill Paste Works

`Quill` uses its clipboard module to convert pasted content into a Delta.

Conceptually:

1. The browser provides clipboard data such as plain text, HTML, images, or files.
2. Quill traverses pasted HTML in post-order.
3. Quill clipboard matchers convert recognized DOM nodes and styles into Delta operations.
4. Quill inserts the resulting Delta into the editor at the current selection.

The durable editor representation is the Delta, not the pasted HTML.

This matters because the app can decide paste policy at the Delta boundary:

- allow only text
- preserve a small set of formats
- strip unsafe or unsupported attributes
- convert supported embeds into app-owned document objects
- reject or replace unsupported embeds

## Quill Delta Representation

Plain text is represented as string inserts:

```js
{ insert: 'Notebook text\n' }
```

Inline formatting is represented as attributes:

```js
{ insert: 'bold text', attributes: { bold: true } }
```

Block formatting is usually represented as attributes on newline inserts:

```js
{ insert: 'Heading' },
{ insert: '\n', attributes: { header: 1 } }
```

Embeds are represented as object inserts:

```js
{ insert: { image: 'https://example.com/image.png' } }
```

Custom notebook embeds follow the same general model:

```js
{ insert: { 'music-keyboard': payload } }
```

## Content Quill Can Potentially Paste

Quill can preserve pasted content when it maps to registered formats or embeds.

Potential categories:

- plain text
- inline formatting such as bold, italic, underline, strike, code, color, background, font, size, subscript, and superscript
- links
- block formatting such as headings, blockquotes, code blocks, alignment, direction, and indentation
- ordered and bulleted lists
- images
- videos
- tables, depending on the Quill table model and source HTML
- formulas, if formula support is configured
- registered custom embeds, when copied from compatible Quill content

The app should not assume all of these are MVP-supported just because Quill can represent them.

## First MVP Paste Policy

The safest first policy is:

- preserve plain text
- preserve app-created internal copy/paste where needed for music objects
- strip external rich formatting unless a specific feature has opted in
- do not accept pasted external images until image persistence is decided
- do not accept pasted external tables until the `quill-table-up` table slice
  is hardened for paste, read view, and export
- do not accept formulas or videos for MVP

This keeps paste aligned with the current `text-only paste` requirement while still leaving room for deliberate exceptions.

## Feature Intersections

### Text And Inline Formatting

Quill can preserve inline formatting from rich HTML paste.

MVP direction:

- text-only paste is the default requirement
- direct formatting should come from editor controls, not uncontrolled external paste
- rich paste preservation can wait

Implementation path:

1. Configure clipboard handling to prefer `text/plain` for external paste.
2. Preserve line breaks in plain text.
3. Avoid importing source fonts, sizes, colors, and spans until rich paste is explicitly in scope.
4. Keep internal app copy/paste behavior separate from external paste policy if needed.

### Links

Quill can represent links as a `link` attribute.

MVP question:

- should pasted URLs become plain text only, or should valid links survive paste?

Implementation path:

1. Decide whether link support is MVP.
2. If links are allowed, sanitize URL schemes.
3. Preserve only safe URL values in Delta attributes.
4. Ensure read view and export render links predictably.
5. Add accessible link text expectations if links become first-class.

### Lists

Quill can paste ordered and bulleted lists when source HTML maps cleanly.

MVP direction:

- numbered and bulleted lists are required
- multi-paragraph list item behavior needs investigation

Implementation path:

1. Allow user-created list formatting through toolbar commands first.
2. Test pasted plain-text list patterns separately from pasted HTML lists.
3. If HTML list paste is allowed, constrain it to Quill's supported list attributes.
4. Avoid promising rich multi-paragraph list preservation until the list model spike is complete.

### Tables

The current MVP table implementation uses `quill-table-up` plus the local
`table` feature; see [Quill Table Up Spike](quill-table-up-spike.md).

MVP direction:

- table support is required
- pasted table preservation is not automatically required

Implementation path:

1. Test how Quill and `quill-table-up` represent pasted table HTML.
2. Decide whether pasted tables become real notebook tables, plain text, or rejected content.
3. Ensure table paste does not create structures that read view or export cannot handle.
4. Add tests only after the paste policy is explicit.

### Images

Quill represents images as embed operations:

```js
{ insert: { image: imageSource } }
```

The image source may be:

- an external URL
- a `data:` URL
- a blob URL
- an app-managed asset URL, if the app creates one

MVP questions:

- should pasted or inserted image embeds be supported?
- should image sources be external URLs, data URLs, or app-managed uploaded assets?
- should images be promoted to app-owned document objects rather than raw Quill image embeds?

Implementation path:

1. Decide whether images are in MVP or explicitly deferred.
2. If deferred, block or strip pasted images and document the user-facing behavior.
3. If supported, create an image persistence policy before accepting pasted images.
4. Prefer app-managed uploaded assets for saved documents if persistence is required.
5. Store image metadata needed for layout, alt text, read view, and export.
6. Constrain rendered image size to the document content width.
7. Ensure export can resolve image sources without relying on fragile local blob URLs.

### Videos

Quill has a built-in video embed format.

MVP direction:

- videos are out of scope

Implementation path:

1. Strip pasted video embeds.
2. Preserve pasted video URLs as plain text unless links are supported.
3. Revisit only if a future notebook media feature is planned.

### Formulas

Quill has a formula embed format when formula support is configured.

MVP direction:

- formulas are out of scope unless a later music-theory need makes them valuable

Implementation path:

1. Do not configure formula paste support for MVP.
2. Strip formula embeds from external paste.
3. Preserve source text only when useful and safe.

### Custom Music Embeds

The app's keyboard/staff music objects are custom Quill embeds.

MVP direction:

- embedded music objects should duplicate through copy/paste
- custom embeds must preserve structured payloads
- object ids may need regeneration when pasted as duplicates

Current implementation status:

- keyboard music embeds now provide semantic copied HTML through the Quill blot
  `html()` path instead of copying rendered React controls, resize labels,
  guard text, and other non-document UI text
- the music-object feature registers a Quill clipboard matcher through the
  object-type registry so copied keyboard-embed HTML pastes back as one
  structured embed Delta operation
- editor-owned clipboard setup collects object-type clipboard matchers at Quill
  construction time and can register later object-type matchers on the mounted
  clipboard, deduped by selector and matcher name
- this is an internal/app-created copy-paste exception, not a general rich
  external paste policy

Implementation path:

1. Continue verifying Quill internal copy/paste preserves the custom embed
   Delta payload.
2. On paste, normalize music-object payloads through the music-object feature.
3. Regenerate object ids when the pasted embed is a duplicate in the same document.
4. Keep payload shape compatible with the document-model generic object seam.
5. Add UI tests for copy/paste duplication after the music-object persistence model is hardened.

Recent verification:

- keyboard embed tests cover copied semantic HTML and pasted music-object HTML
  returning as one structured embed without rendered control text.

### Inline Chord Objects

Inline chord objects should be structured document objects, not only styled text.

MVP direction:

- typed ASCII chord text should become an inline chord object when accepted
- copy/paste fallback text should remain readable

Implementation path:

1. Define the inline chord embed representation.
2. Decide what copying an inline chord places on the clipboard.
3. Preserve structured chord data for internal app paste.
4. Provide plain text fallback for external paste targets.
5. On external paste into the app, treat chord-looking text as ordinary text unless the inline chord recognition rule explicitly accepts it.

## Persistence Implications

Paste cannot be treated as only an editor behavior.

Every allowed pasted structure must have a document-model and persistence answer:

- how it appears in Quill Delta
- whether it also creates a generic document object
- whether it references external resources
- how it is serialized
- how it is loaded later
- how it is migrated if the representation changes

This is especially important for images, custom embeds, and tables.

## Export And Read View Implications

Read view and `PDF` export should not receive surprise content they cannot render.

Allowed pasted content needs:

- read-view rendering
- page layout behavior
- export rendering
- fallback behavior when a resource fails to load
- accessibility metadata where appropriate

Images need source resolution and size constraints.
Tables need pagination behavior.
Music embeds need rendered object output and possibly playback-free export rendering.

## Security And Sanitization

External paste is untrusted input.

Paste handling should:

- strip scripts and event-handler attributes
- sanitize URLs before preserving links or embeds
- avoid preserving arbitrary inline styles
- avoid saving blob URLs as durable image references
- avoid persisting unsupported embed payloads
- keep app-owned custom payloads normalized before saving

Quill's clipboard conversion helps, but the app still needs a product-level paste policy.

## Recommended First Implementation Slice

1. Keep external paste text-only.
2. Preserve line breaks and simple paragraph boundaries from plain text.
3. Verify internal copy/paste of music embeds.
4. Add explicit tests that pasted external images do not silently persist if images are deferred.
5. Add a paste spike for tables after the current table interaction slice is
   stable enough to evaluate external HTML table input.
6. Revisit links, image assets, and rich formatting as separate scoped decisions.

## Open Questions

- Should pasted links survive MVP paste, or should they become plain text?
- Should pasted images be blocked, converted to app-managed assets, or stored as raw Quill image embeds?
- If images are supported, where are image assets stored before and after account creation?
- What user-facing feedback appears when paste drops unsupported content?
- Should internal app copy/paste preserve richer structure than external paste?
- How should music-object ids be regenerated on paste?
- Should pasted tables ever create real notebook tables, or should table insertion be explicit only?
- What is the minimum paste behavior needed for tablet workflows?
- Should paste behavior differ for anonymous users who cannot save uploaded image assets?
