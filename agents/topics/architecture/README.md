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

## Current Status

The architecture documentation is intentionally early and incomplete.

Right now the main job of these notes is to:

- capture current direction
- separate likely patterns from unresolved assumptions
- make inconsistencies visible before implementation hardens around them
