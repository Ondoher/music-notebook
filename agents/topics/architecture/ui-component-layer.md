# UI Component Layer

## Purpose

Capture the current direction for the base UI component layer in `music-notebook`.

This note is informed by `modmod`, which uses Material UI as a component foundation while keeping most product styling in shipped CSS files.

## Current Direction

Use Material UI for common application controls, dialogs, menus, form inputs, toolbars, and icons.

Do not use Material UI as the owner of the document surface.

For `music-notebook`, the editor and embedded music objects should remain styled primarily by feature-owned CSS, because:

- `Quill` has its own document DOM and theme CSS
- keyboard and staff embeds will need document-specific sizing and layout rules
- CSS files are easier to reason about for printed/export-adjacent document styling
- the app should avoid burying editor layout decisions inside component-local `sx` props

## Lessons From `modmod`

`modmod` uses MUI successfully, but it often has to override MUI component internals with selectors such as:

- app wrapper classes
- MUI slot classes
- MUI state classes
- nested selectors with extra specificity

That approach works, but it can become noisy when complex MUI components expose deeply nested structure.

For this app, the preferred adaptation is:

- use MUI for shell-level interface controls
- use app wrapper classes for CSS ownership
- use MUI CSS variables for theme values
- use feature CSS for product-specific layout
- avoid styling the editor/document surface through heavy MUI overrides

## Modern MUI Improvements

The current MUI path is better than the older experimental CSS variables setup used by `modmod`.

Use stable theme APIs:

```js
import { createTheme, ThemeProvider } from '@mui/material/styles';

const theme = createTheme({
	cssVariables: true,
});
```

Do not use the older experimental imports:

```js
Experimental_CssVarsProvider
experimental_extendTheme
```

Current MUI also supports cascade layers through `StyledEngineProvider`:

```js
import StyledEngineProvider from '@mui/styled-engine/StyledEngineProvider';

<StyledEngineProvider enableCssLayer>
	<App />
</StyledEngineProvider>
```

That makes app CSS and external CSS easier to layer over MUI styles without escalating selector specificity as often.

## Import Rules

Prefer direct MUI component imports:

```js
import FormControl from '@mui/material/FormControl';
import Dialog from '@mui/material/Dialog';
```

Do not import components from the `@mui/material` barrel.
The barrel can slow Rollup substantially while it tries to shake the tree.

For the styles package, use only exported subpaths.
In the current MUI version used by the POC, `@mui/material/styles` is exported, but subpaths such as `@mui/material/styles/createTheme` and `@mui/material/styles/ThemeProvider` are not exported and will be emitted as broken browser imports.

Current exception:

```js
import { createTheme, ThemeProvider } from '@mui/material/styles';
```

This is acceptable because it is the supported package export for the styles APIs in this installed MUI version.

## Styling Rules For This App

Prefer this order:

1. Use MUI props for behavior and semantic component configuration.
2. Use `slotProps` when styling or configuring a specific MUI slot.
3. Use theme `components` overrides for app-wide MUI defaults.
4. Use CSS variables such as `var(--mui-palette-text-primary)` in shipped CSS.
5. Use scoped feature CSS for product and editor layout.
6. Use high-specificity MUI class overrides only when there is no cleaner slot or theme option.

## Current Implementation

The `mn` app currently installs MUI at the React root with:

- `StyledEngineProvider` from `@mui/styled-engine/StyledEngineProvider` using `enableCssLayer`
- `ThemeProvider` using a CSS-variable theme
- `CssBaseline`
- a registry-owned `theme` service

This gives the app stable MUI components and globally available CSS variables while preserving a CSS-first editor surface.

The POC also separates application UI typography from document typography:

- dialogs, form controls, and application chrome use the application theme font
- the Quill document surface and music-object preview use the notebook document font
- the current notebook text font is `Comic Neue`, chosen because it keeps a handwritten notebook feel while still providing useful weights such as bold

Keep that boundary intact.
Changing the document font should not unintentionally restyle MUI dialogs, and changing the app theme should not accidentally alter rendered notebook content.

## Practical Boundary

MUI should help build:

- shell controls
- dialogs for editing embedded objects
- insertion menus
- toolbar buttons
- form fields
- icon buttons
- settings panels

Feature CSS should own:

- Quill document layout
- editor page surface
- embedded keyboard sizing
- staff rendering layout
- music object resize handles and document-flow placement
- print/export-adjacent visual structure

This keeps MUI useful without letting it take over the music document model.
