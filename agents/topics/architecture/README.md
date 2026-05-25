# Architecture Topics

This folder contains working architecture notes for `music-notebook`.

## Current Documents

- [Foundation Architecture](/c:/dev/music-notebook/agents/topics/architecture/foundation-architecture.md)
- [Music Notebook App Architecture](/c:/dev/music-notebook/agents/topics/architecture/app-architecture.md)
- [Build System](/c:/dev/music-notebook/agents/topics/architecture/build-system.md)
- [Build And Asset Flow](/c:/dev/music-notebook/agents/topics/architecture/build-and-assets.md)
- [Feature Mechanics](/c:/dev/music-notebook/agents/topics/architecture/feature-mechanics.md)
- [REMVC Architecture](/c:/dev/music-notebook/agents/topics/architecture/remvc-architecture.md)
- [Quill Integration](/c:/dev/music-notebook/agents/topics/architecture/quill-integration.md)
- [UI Component Layer](/c:/dev/music-notebook/agents/topics/architecture/ui-component-layer.md)
- [Localization And Accessibility](/c:/dev/music-notebook/agents/topics/architecture/localization-accessibility.md)
- [Accessibility](/c:/dev/music-notebook/agents/topics/architecture/accessibility.md)

## Reading Order

1. Start with [Foundation Architecture](/c:/dev/music-notebook/agents/topics/architecture/foundation-architecture.md) for the general architectural model and borrowed conventions.
2. Then read [Music Notebook App Architecture](/c:/dev/music-notebook/agents/topics/architecture/app-architecture.md) for the editor-first app shape, proposed seams, and open questions specific to this product.
3. Use [REMVC Architecture](/c:/dev/music-notebook/agents/topics/architecture/remvc-architecture.md) and [Feature Mechanics](/c:/dev/music-notebook/agents/topics/architecture/feature-mechanics.md) for service, feature ownership, lifecycle, and React boundary guidance inherited from the Polylith app pattern.
4. Use [Build System](/c:/dev/music-notebook/agents/topics/architecture/build-system.md) for app-build composition, feature inclusion, synthetic modules, and frontend test builds.
5. Use [Build And Asset Flow](/c:/dev/music-notebook/agents/topics/architecture/build-and-assets.md) for copied assets, runtime asset paths, and `dist` behavior.
6. Use [Quill Integration](/c:/dev/music-notebook/agents/topics/architecture/quill-integration.md) for editor-model implications, embed strategies, and Quill-specific risks and recommendations.
7. Use [UI Component Layer](/c:/dev/music-notebook/agents/topics/architecture/ui-component-layer.md) for the MUI plus CSS styling direction.
8. Use [Localization And Accessibility](/c:/dev/music-notebook/agents/topics/architecture/localization-accessibility.md) for first-class localization and accessibility expectations.
9. Use [Accessibility](/c:/dev/music-notebook/agents/topics/architecture/accessibility.md) for contrast targets, keyboard embed accessibility checks, and visual-state guidance.

## Current Status

The architecture documentation is intentionally early and incomplete.

Right now the main job of these notes is to:

- capture current direction
- separate likely patterns from unresolved assumptions
- make inconsistencies visible before implementation hardens around them
