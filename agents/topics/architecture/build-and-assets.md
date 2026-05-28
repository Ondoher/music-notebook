# Build And Asset Flow

## Purpose

Give humans and agents a compact, practical summary of how browser builds, feature inclusion, assets, and UI tests work in this repo.

This topic is meant to be loaded when a task involves:

- build behavior
- why a feature is or is not present in a browser app
- why a CSS or image file does or does not appear in `dist`
- whether a file should live under `assets/...` or be imported directly
- UI test bundling

## Current State

The repo uses Polylith builder configuration rather than one large generic frontend bundler config.

App build definitions explicitly define:

- HTML template
- app-wide copied resources
- app-wide copied CSS
- included feature list

## Core Build Model

### 1. App Builds Are Explicit

An app exists because a build file defines it.

Important consequences:

- adding source files alone does not make them part of a shipped browser app
- a feature must be included through the app build configuration
- shared app-wide assets must be added through the build configuration if they need to be copied into `dist`

### 2. Feature Inclusion Is Explicit

Each application build definition includes features explicitly by name.

In this repo, one concrete example is `builds\mn.json`.


Important consequence:

- if a feature appears to exist in source but not in the running browser app, first check whether that feature is included in the relevant build definition

### 3. Runtime Activation Is Still Side-Effect Based

Even after a feature is included in a build, the client still depends on side-effect imports and registry startup.

Important consequence:

- build inclusion and runtime activation are two separate concerns
- a feature can be present in the build graph but still fail to exist at runtime if its side-effect import chain is broken

## Asset Paths

There are two different ways styles and images can matter in this repo, and they should not be confused.

### Asset-Pipeline Files

These are files that must be copied into `dist` as standalone assets.

Examples:

- app-wide images under `assets/images`
- app-wide fonts under `assets/fonts`
- app-wide CSS under `assets/styles` for the `mn` app
- feature-local CSS under the app-scoped feature path, for example `src/<app>/features/<feature>/assets/css`
- feature-local images under the app-scoped feature path, for example `src/<app>/features/<feature>/assets/images`

These are copied because the build configuration says so.


Important rule:

- if a CSS or image file must physically exist in `dist`, it should live under the appropriate `assets/...` path used by the relevant build config

## Runtime Asset Path Derivation

When working inside a feature, derive runtime asset paths from that feature's `build.json`.

For each entry in the top-level `resources` array:

- `cwd` is the source root for the matched files inside the feature
- `glob` selects which files are copied from that source root
- `dest` is the runtime output directory those files are emitted into
- `keepNest: true` means preserve the folder structure under `cwd` inside `dest`

Path rules:

- for JSX/HTML tag asset paths such as `<img src="...">`, use the built runtime path derived from `dest`, not the source-tree path
- for CSS `url(...)` references, always write the URL relative to the CSS file itself after considering the built output layout

Layout image convention:

- prefer using CSS background images for decorative or layout-affecting assets such as frames, corners, borders, and chrome
- prefer `<img>` tags for content images where intrinsic image semantics matter

Example from `builds/mn.json`:

- app-wide Music Notebook images under `src/mn/assets/images/**` would be emitted to
  `dist/mn/assets/images/**` when configured as app resources
- app-wide Music Notebook CSS under `src/mn/assets/styles/**` is the current app-wide style location and should be emitted to
  `dist/mn/assets/styles/**` when configured as app CSS

So an app-wide Music Notebook icon such as
`src/mn/assets/images/music-object.svg` should be referenced at runtime
as `assets/images/music-object.svg` if emitted to that destination.

Example from `src/mn/features/editor/build.json`:

- feature-local CSS can be emitted to an editor-specific runtime CSS folder
- feature-local copied resources can be emitted beside the app bundle or under a feature-specific runtime folder

So:

- if `src/mn/features/editor/assets/images/example.png` is emitted to `editor/images/example.png`,
  it should be referenced from JSX as `editor/images/example.png`
- a CSS file emitted to `editor/css/...` should reference that same image relatively as `../images/example.png`

### Imported CSS

The platform does support imported CSS through module imports, but this is legacy behavior from an early exploration rather than the intended long-term styling contract.

Important rule:

- CSS import support should be treated as deprecated
- asset-pipeline CSS under the appropriate `assets/css` path is the expected default for shipped styling

That means imported CSS should not be the normal choice for new shipped styling when the styling should clearly participate in the app's normal asset flow.

## Practical Placement Rules

When deciding where a CSS or image file belongs:

- if it must be copied into `dist`, place it under the appropriate `assets` folder
- if it is app-wide `mn` styling, prefer app-wide `assets/styles`
- if it is feature-shipped styling, prefer that feature's `assets/css`
- if it is a shipped image asset, prefer the relevant `assets/images`
- treat CSS import support as deprecated rather than as a normal default path
- CSS and image filenames should use `kebab-case`

For the `mn` app specifically:

- global app styles live in `src/mn/assets/styles/mn.css`
- shared component styles should live in `src/mn/assets/styles`
- component-specific shared styles should use a component-oriented `kebab-case` filename such as `key-picker.css`
- color tokens and cross-component CSS variables should be centralized in `mn.css`
- feature-owned editor styles should stay in the editor feature stylesheet when they only affect that feature's document/editor surface

## Feature Build Files

Feature `build.json` files define what that feature contributes to the built browser output.

Common pattern:

- `css`
  - copies feature-local CSS from `assets/css`
- `resources`
  - copies feature-local images from `assets/images`
- `index`
  - declares the feature entrypoint

Important consequence:

- if a feature-local stylesheet or image is meant to ship as an asset, putting it next to a component is not enough

## Current MN Player Loadable

The player feature currently owns the MusicXML playback path.

Concrete example:

- `src/mn/features/player/build.json` declares a `musicxml-player` loadable
- `src/mn/features/player/player.js` exposes the `player` registry service
- editor-side music-object components request playback through the `player` service
- the same feature build file copies the `spessasynth_processor.js` worklet resource from `@music-i18n/musicxml-player`

This is a useful example of the build/runtime split:

- the loadable and worker resource are known to the build
- playback is activated only when the user invokes it at runtime through the service
- changing the loadable or resource shape requires restarting the watcher

Loadables are runtime delivery boundaries in the current Polylith line.
They should not be treated as a way to avoid full-build participation during MVP implementation.

## Agent Checklist

When a task touches build or assets, check these in order:

1. Is the relevant feature included in that build definition?
2. Does the feature have a `build.json` that contributes CSS or resources?
3. Does the file need to exist in `dist`, or is imported CSS sufficient for this case?
4. If it needs to exist in `dist`, is it under the correct `assets/...` path?
5. If runtime behavior is missing, is the side-effect import chain intact?

## Strengths

- build shape is explicit rather than hidden
- feature asset contribution is visible and local
- main app and driver app are clearly separated
- UI test build flow is consistent with the overall Polylith approach

## Risks

- feature inclusion can drift because it is manual
- runtime side-effect activation can be confused with build inclusion
- imported CSS and asset-pipeline CSS can be mixed without a clear decision rule unless the conventions are documented
- it is easy to misplace files that must physically land in `dist`
