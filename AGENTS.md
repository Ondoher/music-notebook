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
- Current implementation mode: first editor/embed POC wrapped; ready to move into real application planning

## Current Priorities

- preserve the POC findings about the `Quill` custom embed model
- plan the real application document model around editor content plus music-object payloads
- decide which POC implementation pieces should be hardened and which should be replaced
- keep persistence, export, and future app-shell planning behind clear service/document seams

## Important Current Defaults

- current Polylith, not Polylith 2.0, is the planning baseline
- persistence stays abstracted for now
- keyboard/staff editing opens in a dedicated MUI dialog
- the rendered document object should stay visually simple, with floating controls for edit, playback, and resize
- rendering requirements matter more than loyalty to an initially named rendering library
- all else being equal, components with better `MusicXML` compatibility are preferred
- substantial React presentation components should use class components unless they are tiny, stateless helpers

## Read First

- [Foundation Architecture](agents/topics/architecture/foundation-architecture.md)
- [Music Notebook App Architecture](agents/topics/architecture/app-architecture.md)
- [Build System](agents/topics/architecture/build-system.md)
- [Quill Integration](agents/topics/architecture/quill-integration.md)
- [UI Component Layer](agents/topics/architecture/ui-component-layer.md)
- [Localization And Accessibility](agents/topics/architecture/localization-accessibility.md)
- [MVP Topic](agents/topics/mvp/README.md)
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
