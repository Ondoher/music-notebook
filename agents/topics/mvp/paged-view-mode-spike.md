# Paged View Mode Spike

## Purpose

Track the quick spike for using a CSS paged-media engine as the first read/view
mode layout experiment.

The specific candidate for the first pass is `Paged.js`.

This note is intentionally about investigation. It should help us answer whether
CSS can do most of the page-layout work before we commit to a heavier
Delta-to-view renderer or app-owned paginator.

Use this together with:

- [View Mode](view-mode.md)
- [Quill Integration](../architecture/quill-integration.md)
- [Quill Table Up Spike](quill-table-up-spike.md)
- [Quill Embed Navigation](quill-embed-navigation.md)
- [Document Model](document-model.md)

## Current Question

Can the app render a paged, read-only preview by passing the current Quill
editor HTML into a paged-media engine?

The first goal is not a clean final architecture. The first goal is to learn
whether paged CSS can handle our actual notebook content:

- normal text
- paragraph styling
- lists
- tables
- large inline music-object embeds
- music-object captions
- generated keyboard and staff visuals
- explicit page-break-like content

## Why This Spike

The edit view should remain Quill-native and continuous.

View mode has a different job:

- it does not need to preserve live editing behavior
- it can render disposable output
- it can use page-oriented CSS more aggressively
- it can become the visual bridge toward print and `PDF` export

If a paged-media engine can paginate our rendered content well enough, it may
let us avoid writing a custom pagination engine too early.

## Candidate: Paged.js

`Paged.js` is the first candidate because it is a browser-side paged-media
polyfill. It is designed around CSS concepts such as:

- `@page`
- page size and margins
- generated page boxes
- `break-before`
- `break-after`
- `break-inside`
- page counters and generated content

The practical attraction is that it creates paginated preview DOM. That is more
useful for an app read view than pure CSS multi-column layout, where visual
columns are layout fragments but not DOM elements.

`Vivliostyle` remains a heavier possible follow-up if the CSS paged-media
direction is promising but `Paged.js` is too limited or brittle.

## First Spike Shape

Split the editor surface into two panes:

```text
+------------------------+----------------------+
| Quill editor            | Paged preview       |
| live editable           | read-only generated |
| source of truth         | from Quill HTML     |
+------------------------+----------------------+
```

Data flow:

```text
Quill text-change or preview refresh trigger
        ↓
quill.root.innerHTML
        ↓
wrap in read-view shell HTML
        ↓
Paged.js Previewer
        ↓
right-pane page preview
```

The preview pane is disposable generated DOM.
The left Quill editor remains the only editable surface.

## First Implementation Rules

- Keep this behind a spike path or temporary split-view mode.
- Do not replace the edit view.
- Do not build a full Delta-to-React read renderer yet.
- Do not mutate or pass the live Quill root node into the page engine.
- Pass a detached HTML string or cloned wrapper instead.
- Debounce preview updates.
- It is acceptable if the first preview includes editor-only object controls,
  resize handles, or toolbar artifacts, as long as we record that cleanup need.
- Do not solve final page headers, footers, page numbers, or export in the
  first pass.

## Initial CSS Ideas

```css
@page {
  size: letter;
  margin: 0.75in;
}

.music-keyboard-embed,
table,
figure {
  break-inside: avoid;
  page-break-inside: avoid;
}

.mn-page-break {
  break-before: page;
  page-break-before: always;
}
```

These classes should be treated as a shared layout vocabulary. If the paged
engine honors them directly, excellent. If not, they still document the layout
intent that a later paginator or export path can interpret.

## What We Need To Learn

1. Can `Paged.js` paginate current Quill HTML without failing?
2. Does it produce page DOM that can live inside the app shell?
3. Do music-object embeds appear in the preview?
4. Do keyboard and staff previews keep sensible natural sizing?
5. Do captions remain attached and visible under music objects?
6. Do tables render acceptably?
7. Does `break-inside: avoid` keep music objects and tables together?
8. Does `break-before: page` work for an explicit page-break marker?
9. Is live-ish preview performance acceptable with debounced updates?
10. How much editor-only DOM needs to be stripped before this becomes usable?

## Expected Problems

- Raw `quill.root.innerHTML` is an editor artifact, not a durable document
  format.
- Music embeds may include hover toolbars, resize handles, MUI classes, or
  Quill/Parchment guard details that should not appear in read view.
- React-rendered embed internals may not be the right long-term view/export
  input.
- Tables may expose layout or pagination behavior that is acceptable in edit
  view but poor in paged view.
- Paged layout may be expensive to rerun after every change without careful
  debounce or manual refresh.
- Browser and package quirks may differ between app preview and headless `PDF`
  export.

## Success Criteria

The spike is worth continuing if:

- the app can show Quill on the left and generated paged preview on the right
- paragraphs, tables, and music objects all render in the preview
- page size and margins are visibly applied
- at least one page-break rule works
- music objects are not obviously broken by pagination
- the generated page DOM can be styled without fighting the app shell

The spike should be considered negative or needs a different engine if:

- the engine cannot handle our music object DOM
- tables or embeds corrupt pagination badly
- preview rerendering is too slow for a reasonable editing loop
- generated DOM is too hard to style or embed in the app
- the engine requires a document ownership model that conflicts with the app

## Possible Follow-Up Paths

### If Direct Quill HTML Works

Keep `Paged.js` as the likely read-view layout engine and decide how clean the
input needs to become.

Next questions:

- Should we strip editor-only controls from the raw HTML?
- Should music-object embeds expose a view-only HTML representation?
- Can read view and export share the same paged rendering path?

### If The Engine Works But Raw Quill HTML Is Messy

Build an app-owned read-view HTML renderer from the active tab Delta.

That renderer can:

- render paragraph styles intentionally
- render tables through a controlled view path
- delegate music objects to feature-owned view renderers
- omit editor-only controls
- feed clean HTML into the same paged engine

### If Paged.js Does Not Work

Possible next moves:

- try `Vivliostyle`
- try CSS multi-column layout as a simpler browser fragmentation hack
- build an app-owned paginator that measures block units
- defer paged read view and keep export as a separate headless-browser path

## Open Questions

- Should split view be a temporary spike mode, a real future view mode, or both?
- Should preview refresh on every debounced edit, only on manual command, or both?
- What is the first representation for manual page breaks in the Quill stream?
- How much raw editor DOM should be allowed in read view during the spike?
- Can music-object feature code expose a read-only renderer without duplicating
  the edit embed implementation?
- Can the same paged output path support `PDF` export through headless Chromium?
- How should page headers, footers, and page numbers be handled if the engine
  passes the basic content test?

## Spike Log

### 2026-06-01 Planning

Current planned first pass:

- install or locally wire `Paged.js`
- split the editor surface into live Quill editor and right-side paged preview
- feed the preview from `quill.root.innerHTML`
- debounce updates
- apply a small paged-view CSS file with `@page`, `break-before`, and
  `break-inside` rules
- test with text, a table, a keyboard object, a staff object, captions, and an
  explicit page-break marker if one is available

### 2026-06-01 First Split-Pane Implementation

Implemented the first quick spike path:

- installed `pagedjs@0.4.3`
- added `PagedViewPreview` under the editor feature
- split `EditorPage` into a live Quill editor pane and right-side paged preview
- fed the preview from `quill.root.innerHTML`
- debounced preview rendering in the preview component
- passed a detached template fragment into `Paged.js` rather than the live Quill
  root
- generated first-pass `@page` CSS from document page size, orientation, margins,
  and typography settings
- reused document paragraph style CSS rules in the preview
- hid obvious editor-only music-object controls in preview CSS
- added preview-side `break-inside: avoid` rules for music embeds, tables, and
  figures

Verification:

- `npm run test:ui` passed after the split-pane Paged.js spike

Observed noise:

- npm still reports `16 vulnerabilities` after installing `pagedjs`; this was
  not triaged during the spike
- UI test output still includes known non-failing React `act(...)` warnings,
  module directive warnings, and table-related `flushSync` warnings

Next manual check:

- run the app and verify whether the right pane actually renders page boxes for
  text, tables, keyboard objects, staff objects, and captions

### 2026-06-01 Staff Preview Follow-Up

Observed during manual inspection:

- keyboard objects rendered in the Paged.js preview
- staff objects did not visibly render
- generated pages showed an unwanted inner scrollbar

First fix:

- added paged-preview-only staff sizing rules so cloned OSMD SVGs get a concrete
  viewport from `--music-embed-height`
- set paged page overflow rules to suppress the page-level scrollbar while
  allowing the page area to expose content
- added a debounced MutationObserver on the live Quill root so async staff SVG
  insertion updates `quill.root.innerHTML` after OSMD finishes rendering

Verification:

- `npm run test:ui` still passed after the preview CSS adjustment

Root cause note:

- keyboard preview DOM is available synchronously, so it appeared in the first
  Paged.js snapshot
- staff preview DOM is filled asynchronously by OSMD, so the initial paged
  snapshot could contain an empty `.music-staff-osmd` node

Scale follow-up:

- Paged.js may fragment the preview DOM so inspection starts at
  `.music-keyboard-embed-content` instead of the outer `.music-keyboard-embed`
  wrapper
- music-object display scale depends on nominal `--music-embed-width` and
  `--music-embed-height` plus `--music-embed-scale`; there is no separate
  natural/display width variable pair
- the spike copies those sizing variables from the outer wrapper/payload to the
  inner embed content before passing HTML to Paged.js, while reserving the
  scaled footprint with `--music-embedded-layout-width` and
  `--music-embedded-layout-height`
- preview CSS sizes staff hosts from those copied variables so the OSMD SVG can
  keep the intended object scale even when the wrapper is not the visible page
  fragment
- omitted payload `scale` means scale `1`; resize now persists `scale` instead
  of mutating nominal `width` and `height`

Width parity follow-up:

- the continuous editor surface currently renders a letter page with 24px left
  and right padding, so its effective content width is about 768px
- a paged letter page with real 72pt document margins has an effective content
  width of about 624px
- that mismatch makes resized music objects, especially staff objects, appear to
  ignore scaling because the paged preview clamps them into a narrower content
  area
- for the spike, the paged preview now uses explicit editor-equivalent margins
  (`4px 24px 0px 24px`) so staff scale can be compared against the editor
- final view mode still needs a product decision: either edit mode should honor
  document margins more closely, or read/view mode should intentionally differ
  from the continuous editor surface
- in split view, the editor pane initially shrank the continuous sheet to the
  pane width; that made a 456px staff render around 366px in Quill while the
  paged preview kept the stored 456px width
- the spike now keeps the continuous editor sheet at the configured page width
  and lets the editor pane scroll, so edit and paged preview compare the same
  page geometry
