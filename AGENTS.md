# Music Notebook Starting Notes

## Purpose

This file is the lightweight starting index for the repo.

Use it to:

- get oriented quickly
- see the current high-level direction
- jump to the canonical topic notes

Detailed architecture, testing, and POC guidance should live in the topic docs rather than be duplicated here.

## Current Snapshot

- App: `music-notebook`
- Architecture direction: `polylith` with `REMVC`
- Main editor direction: `Quill`
- Product direction: editor-first UI
- Native music payload format: `MusicXML`
- Initial export target: `PDF`
- Current implementation mode: post-POC cleanup complete; MVP implementation planning is the active phase

## Current Priorities

- keep the proven `Quill` custom embed model while translating the POC payload into an intentional notebook document model
- plan the MVP implementation around document model, inline chord objects, music-object payloads, persistence, auth, and export seams
- keep the completed post-POC React cleanup as the component baseline: class components, shared `MUI`-based form controls, localized labels, accessible helper text, and extracted shared music components
- use the current docs as the context bootstrap before starting new MVP code, then update topic notes when decisions change
- keep persistence, export, auth, and future app-shell work behind clear service/document seams

## Important Current Defaults

- current Polylith, not Polylith 2.0, is the planning baseline
- persistence stays abstracted for now
- keyboard/staff editing opens in a reusable dedicated `MUI` dialog component
- `MUI` `Dialog` should not be rendered directly inside unrelated feature components
- the rendered document object should stay visually simple, with floating controls for edit, playback, and resize
- rendering requirements matter more than loyalty to an initially named rendering library
- all else being equal, components with better `MusicXML` compatibility are preferred
- substantial React presentation components should use class components unless they are tiny, stateless helpers
- shared edit fields should use the local `Base*`/shared component layer where practical for localization and accessibility
- chord entry is moving toward one unified input that auto-detects direct chord names, Roman numeral degrees, and numeric degrees
- inline chord objects are now an MVP requirement: typed ASCII chord text in the editor should become a formatted structured chord object with a small floating editor field
- chord display style should be a document-level/global setting by default, with local inline/object overrides only when needed
- numeric chord degrees use the selected key mode to infer the default chord quality
- chord-name parsing design lives in the MVP topic; current direction is to preserve typed text while normalizing internally, include slash bass/inversion in the normalizer result, avoid nonstandard `o/` half-diminished shortcuts, and investigate `chord-symbol` before hand-writing a full direct chord parser
- playback is owned by the `player` feature through a registry service; editor components should use that service rather than importing player loadables directly

## Recent Verification Notes

- `npm run test:ui` passed after the post-POC React cleanup and `MusicEmbedView` class conversion: `113 SUCCESS`
- static search found no substantial hook-based JSX components under `src/mn` after cleanup
- known non-failing noise includes MUI Dialog `act(...)` warnings and module directive warnings
- if behavior looks stale in the browser, restart the watcher; it has failed to pick up changed build specifications during recent work

## Read First

For a fresh agent, read these in order:

- [Foundation Architecture](agents/topics/architecture/foundation-architecture.md)
- [Music Notebook App Architecture](agents/topics/architecture/app-architecture.md)
- [Feature Mechanics](agents/topics/architecture/feature-mechanics.md)
- [Build System](agents/topics/architecture/build-system.md)
- [Build And Asset Flow](agents/topics/architecture/build-and-assets.md)
- [Quill Integration](agents/topics/architecture/quill-integration.md)
- [UI Component Layer](agents/topics/architecture/ui-component-layer.md)
- [Localization And Accessibility](agents/topics/architecture/localization-accessibility.md)
- [MVP Topic](agents/topics/mvp/README.md)
- [Chord Name Parsing](agents/topics/mvp/chord-name-parsing.md)
- [React Code](agents/topics/react-code/README.md)
- [React Cleanup](agents/topics/react-code/react-cleanup.md)
- [Standards](agents/topics/standards/README.md)
- [Testing Strategy](agents/topics/testing/testing-strategy.md)
- [Initial POC](agents/topics/poc/initial-poc.md)

## Topic Map

### Architecture

- [Architecture Index](agents/topics/architecture/README.md)
- [Foundation Architecture](agents/topics/architecture/foundation-architecture.md)
  - general Polylith + `REMVC` model
  - executor, registry, service/model boundaries
- [Music Notebook App Architecture](agents/topics/architecture/app-architecture.md)
  - app-specific structure
  - document, embed, persistence, and export seams
  - product-specific open questions
- [Feature Mechanics](agents/topics/architecture/feature-mechanics.md)
  - feature startup, service files, and `.d.ts` conventions
  - current pattern for services such as `player`
- [Build System](agents/topics/architecture/build-system.md)
  - app builds
  - feature inclusion
  - synthetic modules
  - frontend test build flow
- [Quill Integration](agents/topics/architecture/quill-integration.md)
  - Quill document model
  - embed strategy options
  - rendering/dialog-editing guidance
- [UI Component Layer](agents/topics/architecture/ui-component-layer.md)
  - MUI as base component layer
  - CSS variables and cascade layers
  - CSS-first editor styling boundary
- [Localization And Accessibility](agents/topics/architecture/localization-accessibility.md)
  - localization as a first-class app concern
  - accessibility expectations for editor, embeds, and third-party components
  - component selection and testing guidance

### Testing

- [Testing Index](agents/topics/testing/README.md)
- [Testing Strategy](agents/topics/testing/testing-strategy.md)
  - server/shared/ui lanes
  - Polylith-coupled UI testing
  - test ownership and harness direction

### MVP

- [MVP Topic](agents/topics/mvp/README.md)
  - first usable product scope
  - POC carry-forward and rework guidance
  - document, persistence, and export priorities

### POC

- [POC Index](agents/topics/poc/README.md)
- [Initial POC](agents/topics/poc/initial-poc.md)
  - spike goal
  - scope and out-of-scope
  - success criteria
  - questions the spike should answer

## External References

- [modmod](../modmod)
  - strongest current reference for testing setup and practical Polylith app usage
- [poly-gc-react architecture notes](../poly-gc-react/agents/topics/architecture/README.md)
  - strongest reference for topic-style architecture synthesis
- [polylith](../polylith)
  - underlying platform repo for current Polylith behavior
