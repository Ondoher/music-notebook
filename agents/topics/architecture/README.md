# Architecture Topics

This folder contains working architecture notes for `music-notebook`.

## Current Documents

- [Foundation Architecture](foundation-architecture.md)
- [Music Notebook App Architecture](app-architecture.md)
- [Build System](build-system.md)
- [Build And Asset Flow](build-and-assets.md)
- [Feature Mechanics](feature-mechanics.md)
- [REMVC Architecture](remvc-architecture.md)
- [Quill Integration](quill-integration.md)
- [UI Component Layer](ui-component-layer.md)
- [Localization And Accessibility](localization-accessibility.md)
- [Accessibility](accessibility.md)
- [Screen Scanning UX](screen-scanning-ux.md)
- [Temporary Architecture Cleanup Tracker](temporary-cleanup.md)

## Reading Order

1. Start with [Foundation Architecture](foundation-architecture.md) for the general architectural model and borrowed conventions.
2. Then read [Music Notebook App Architecture](app-architecture.md) for the editor-first app shape, proposed seams, and open questions specific to this product.
3. Use [REMVC Architecture](remvc-architecture.md) and [Feature Mechanics](feature-mechanics.md) for service, feature ownership, lifecycle, and React boundary guidance inherited from the Polylith app pattern.
4. Use [Build System](build-system.md) for app-build composition, feature inclusion, synthetic modules, and frontend test builds.
5. Use [Build And Asset Flow](build-and-assets.md) for copied assets, runtime asset paths, and `dist` behavior.
6. Use [Quill Integration](quill-integration.md) for editor-model implications, embed strategies, and Quill-specific risks and recommendations.
7. Use [UI Component Layer](ui-component-layer.md) for the MUI plus CSS styling direction.
8. Use [Localization And Accessibility](localization-accessibility.md) for first-class localization and accessibility expectations.
9. Use [Accessibility](accessibility.md) for contrast targets, keyboard embed accessibility checks, and visual-state guidance.
10. Use [Screen Scanning UX](screen-scanning-ux.md) for research-backed scanability and visual-hierarchy principles.

## Current Status

The editor/embed POC is proven, the post-POC React cleanup is complete, and MVP implementation is underway.
The first-pass app shell, document tabs, document-model service, document-format service/feature, paragraph-format feature, editor toolbar service, music-object controller/session path, editor/model tab-content bridge, account/session flow, localized markdown flow, document persistence slice, editor interaction/view services, and first table interaction slice exist.

Current high-value context:

- document-format means document-wide formatting, not per-page formatting
- document-model stores typography defaults and document paragraph styles
- paragraph direct formatting overrides style values and should preserve which properties were changed
- Quill blots are adapter exceptions; behavior should be delegated to controllers or controller-owned sessions
- read/view mode is a separate presentation path from Quill edit mode, with split view likely for layout-sensitive features
- editor-local feature behavior should use narrow editor services where possible: `editor-interactions` for event opt-in and `editor-views` for feature-owned views mounted by `EditorPage`
- table behavior now lives in the `table` feature; `EditorPage` supplies editor context but should not own table commands or table-specific UI
- table cleanup should use Quill-aware editor seams rather than pretending to be editor-agnostic; `editor-surface` needs live helpers such as `getQuillModule(name)` so the table feature can own TableUp behavior while the editor still hosts Quill
- table cell clicks are an established editing gesture, not a table-selection gesture; the current implementation uses native caret placement when possible, Quill range fallback for blank cell space, and a music-embed special case
- wide editable content should be handled through a generic wide-content contribution model because any feature may exceed page width; tables are the first known contributor
- accounts use UUIDs, deterministic username salts, durable `HttpOnly` login-session cookies, and short-lived in-memory bearer tokens
- document APIs are authenticated, account-scoped, app-id-scoped, and backed by MongoDB
- cross-feature UI launches should go through narrow UI services such as `account-ui`

Right now the main job of these notes is to:

- capture current direction
- separate likely patterns from unresolved assumptions
- make inconsistencies visible before MVP implementation hardens further around them
- provide enough bootstrap context for a fresh agent to continue planning or implementation without rediscovering completed cleanup work
