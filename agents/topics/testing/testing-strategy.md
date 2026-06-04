# Music Notebook Testing Strategy

## Purpose

Capture the most useful testing patterns observed in `c:\dev\modmod` and translate them into a practical testing topic for `music-notebook`.

This note is about:

- test-lane structure
- test ownership and placement
- UI test bundling
- service and registry testing patterns
- shared test support
- near-term testing recommendations for this app

This note should be read together with:

- [Foundation Architecture](../architecture/foundation-architecture.md)
- [Music Notebook App Architecture](../architecture/app-architecture.md)
- [Build System](../architecture/build-system.md)

Current platform assumption:

- the testing strategy in this note is based on the current Polylith toolchain and the way repos such as `modmod` integrate browser tests with it
- it is not based on the in-progress Polylith 2.0 rewrite
- if the repo later migrates to Polylith 2.0, this note should be reviewed rather than assumed to remain mechanically identical

## Core Testing Model

The strongest pattern in `modmod` is not just the use of Jasmine or Karma. It is the separation of testing into distinct lanes that match runtime concerns.

Current recommended model for `music-notebook`:

- server tests for backend or persistence-facing logic
- shared tests for runtime-independent shared logic
- UI tests for browser-rendered behavior and component integration

The key idea is that not everything should be pushed into browser tests.

Preferred rule:

- if browser rendering is not required, prefer a non-UI lane
- if a unit is pure or nearly pure, test it outside the browser
- use UI tests when actual rendering, DOM behavior, layout, or React wiring matters

## Recommended Test Lanes

### 1. Server Lane

Use for:

- persistence services
- backend integration logic
- serialization boundaries that depend on server-side behavior
- future auth, save/load, or export infrastructure

Recommended shape:

- Jasmine-based
- tests live close to the server code they cover
- feature or service folders can own `_tests` folders where appropriate

### 2. Shared Lane

Use for:

- document-model logic
- `MusicXML` conversion helpers
- parsing and normalization
- embed serialization rules
- any deterministic utility or domain logic that does not need browser rendering

This lane is especially important for `music-notebook`, because a lot of the risky logic will likely be in document representation and transformation rather than in UI rendering alone.

Recommended shape:

- Jasmine-based
- tests live near shared code
- fixture-heavy testing is appropriate when parsing or conversion behavior matters

### 3. UI Lane

Use for:

- React component behavior
- editor shell behavior
- embed insertion and selection flows
- DOM integration
- browser layout issues
- visual interaction bugs that only appear in a real render environment

Recommended shape:

- Polylith-built browser test bundle
- Karma serving the built output
- feature-owned and shared spec aggregators

Important rule:

- Karma should act as the browser runner, not the main bundling mechanism
- UI test inclusion should be treated as a Polylith build concern first and a Karma concern second

## Why This Model Is Strong

The main strengths of the `modmod` setup are worth preserving:

- tests are aligned with architecture rather than forced into one runner
- tests live close to the code they validate
- shared infrastructure exists, but it is intentionally light
- UI tests reflect the real runtime structure instead of a fake alternate app architecture
- spec ownership stays near the code under test

This is a good fit for `music-notebook`, where we are likely to have:

- pure logic around document shape
- service-layer logic around orchestration and persistence seams
- UI-specific behavior around the editor and embedded objects

## Ownership And Placement

The most useful placement rule from `modmod` is:

- keep tests close to the code they cover

Recommended placement model:

- shared/domain logic tests live next to the shared logic
- server tests live next to the relevant server feature or service
- UI specs live with the relevant feature, shared component layer, or shared client logic
- the root UI spec entry should stay small and structural

Preferred pattern for UI test ownership:

- each feature can eventually own a local spec aggregator if test volume justifies it
- shared component tests can eventually be grouped through a shared component spec aggregator
- shared editor/model/client utilities can use their own shared spec aggregator
- the app root test entry should stay structural rather than become a dumping ground

This keeps test ownership visible and reduces the chance that one central file becomes unmaintainable.
For the current `mn` app, the immediate rule is simpler: concrete browser specs must be explicitly imported from `src/mn/test.js` or from a file it imports.

## Service And Registry Testing

One of the most useful testing ideas from `modmod` is that tests should stay close to the real service architecture.

Current recommended direction:

- services should be instantiable with a registry under test
- tests should be able to provide controlled dependencies through that registry
- services should not require full production wiring just to be unit tested

That aligns with the broader architecture:

- the registry remains the real dependency container
- tests can use smaller, controlled registries
- startup and dependency assumptions remain visible

Practical implication:

- when writing services, keep constructor and lifecycle behavior test-friendly
- prefer `start()` for local initialization only
- prefer `ready()` for dependency-driven setup
- do not hide dependency expectations in places that are hard to reproduce in tests

## Shared UI Test Support

`modmod` has a useful lightweight test harness pattern, and `music-notebook` should likely adopt something similar early.

Recommended shared UI test support should eventually include:

- a shared test harness for mounting components with context
- registry injection helpers
- service registration helpers
- reusable editor test setup helpers
- eventually, helpers for embedded object setup and fake document state

Likely home:

- `src/testing`

The important principle is not the exact filename. It is that shared test support should exist, but remain small and aligned with the real app structure.

## UI Test Bundling

The frontend/browser test lane ties very tightly into Polylith.

This is the most important thing to understand about the UI test setup.

Use [Build System](../architecture/build-system.md) as the canonical architecture note for the underlying Polylith build model.
This section focuses on what that build model means specifically for testing.

The most useful `modmod` browser-test pattern is:

- the app build defines a UI spec entrypoint
- Polylith builds the browser test bundle into a test destination
- Karma serves the built test output

Current shape for `music-notebook`:

- app build defines `spec` and `testDest`
- root UI spec entry is `src/mn/test.js`
- `src/mn/test.js` explicitly imports concrete specs or local spec aggregators
- `polylith test <app>` builds browser test output
- Karma runs against the built output
- server specs live beside server features/services and run through the same
  project test script before the Karma browser lane

The practical model is:

1. the app build declares where browser test building starts
2. Polylith follows that spec entrypoint and assembles a browser-ready bundle
3. specs participate only when explicitly imported into that bundle
4. built test files land in the configured `testDest`
5. Karma runs what Polylith built

This means the browser test lane is not just "Jasmine plus Karma".
It is:

- build configuration
- explicit spec imports
- feature registration through Polylith
- browser execution through Karma

Current full verification command:

```text
npm run test:ui
```

Current continuous UI loop:

```text
npm run test:ui:watch
```

That command does an initial `polylith test mn`, starts
`polylith test mn -w` to rebuild the browser test bundle on source changes,
and runs Karma with `karma.watch.conf.cjs` so browser results rerun when the
built `tests/` output changes. When started by Codex for monitorable output,
the current convention is to run the two long-lived processes with logs at
`.codex-logs/ui-test-build-watch.log` and
`.codex-logs/ui-test-karma-watch.log`.

Recent known-good result:

```text
ViewModeService: 328 SUCCESS
TableController: 330 SUCCESS
Continuous watcher after selected-column right-click regression: 334 SUCCESS
```

The `ViewModeService` result followed the read-only paged-preview table CSS fix.
The `TableController` result followed the current split-table context-menu
attempt, but the split-table behavior is not manually working yet and should
not be treated as complete. The continuous watcher result followed the table
context-menu ordering, fit-to-width/distribute-columns commands, document-tab
click fix, and selected-column right-click preservation regression. Known
non-failing noise remains MUI Dialog
`act(...)` warnings, React lifecycle/flushSync warnings around
Quill/table/editor mount paths, module directive warnings, and occasional OSMD
layout warnings.

## How Specs Enter The UI Test Build

The strongest reusable insight from `modmod` and `poly-gc-react` is that browser specs are not discovered directly by Karma.

Instead:

- the app build defines a `spec` entry such as `src/mn/test.js`
- that root spec entry explicitly imports concrete spec files or spec aggregators
- Karma runs the built bundle; it does not discover raw source specs with globs

So the inclusion chain is:

1. app build
2. root spec entry, currently `src/mn/test.js`
3. explicit spec imports
4. concrete `*Spec.js` files

Practical consequence:

- if a UI spec is not running, the first thing to check is whether it is reachable from `src/mn/test.js`
- Karma is not the source-side spec discovery layer
- new test files must be explicitly imported
- broken explicit imports and broken feature inclusion can both make tests "disappear"

## Why Polylith Matters So Much Here

The browser test lane is tightly coupled to Polylith because Polylith owns:

- app build definition
- feature inclusion
- root spec entrypoint
- explicit spec participation
- built output location

Karma only owns:

- loading the built files
- running Jasmine in the browser
- reporting results

That division of responsibility is the architectural center of the frontend test setup.

If we forget that and think of the UI lane as "just Karma tests", we will likely debug the wrong layer.

## Recommended Debugging Order For Missing UI Specs

When a browser spec is not appearing or a UI test lane seems wrong, check in this order:

1. Does the app build define `spec` and `testDest`?
2. Is the relevant feature included in the app build?
3. Is `src/mn/test.js` importing the relevant concrete spec or aggregator?
4. If a local aggregator is introduced later, does it import the concrete spec?
5. Did `polylith test <app>` actually rebuild the expected output under `testDest`?
6. Only after that, check Karma file loading and browser execution.

Important consequence:

- UI test inclusion and app runtime inclusion are related but different
- a UI spec can fail to appear either because the spec aggregation path is wrong or because feature wiring is wrong

## Layout And Editor Testing

The `modmod` notes also capture a useful idea for browser tests: some bugs are really layout bugs, not just state bugs.

This is especially relevant for `music-notebook`.

Use browser-side geometry assertions when testing things like:

- editor/embed alignment
- placeholder or blot sizing
- caret-adjacent layout behavior
- focus-triggered visual corrections
- panel resizing
- notation or keyboard display layout interactions

Recommended techniques:

- `getBoundingClientRect()`
- tolerance-based comparisons
- assertions before and after focus, selection, or edit operations

Rule of thumb:

- use exact state assertions for logic
- use tolerance-based geometry assertions for layout

## Naming And Conventions

Useful conventions borrowed from `modmod`:

- keep spec filenames close to the implementation name
- current local pattern can reasonably remain `ClassNameSpec.js`
- top-level `describe(...)` names should match the main unit under test where practical

That naming discipline helps:

- navigation
- test ownership clarity
- future targeted filtering if we add it later

## Suggested Script Shape

To preserve the tight Polylith coupling, the UI scripts should make the build step explicit.

Recommended pattern:

- `test:ui`
  - run `polylith test <app>`
  - then run Karma
- `dev:tests`
  - run `polylith test <app> -w`
- `karma`
  - run Karma only against the built output
- `test:ui:watch`
  - run the initial test build
  - keep `polylith test <app> -w` and Karma watch running together

For sustained UI work, the intended live loop is:

1. run `dev:tests`
2. run `karma`

That mirrors the strongest pattern from `modmod` and keeps build-time and browser-time concerns clearly separated.

## Near-Term Recommendations For Music Notebook

The most valuable early testing investments appear to be:

1. Create separate `server`, `shared`, and `ui` test lanes from the start, even if one or two are initially sparse.
2. Put shared document and conversion logic under test before editor behavior gets too complex.
3. Add a lightweight shared UI harness early rather than repeating ad hoc setup in component specs.
4. Treat editor embed mechanics as a test-first or at least test-alongside area.
5. Prefer testing document representation and embed serialization outside the browser whenever possible.
6. Use browser tests for the parts that truly depend on DOM layout, editor behavior, and render integration.

## Suggested First Test Targets

If we start small, these are likely the highest-value first candidates:

- document model shape and round-tripping
- `MusicXML` payload wrapping and extraction
- first embed representation rules
- editor insertion behavior for one embed type
- selection/editing behavior for one embedded object
- export boundary contracts, even if export is initially mocked

## Current Verified Coverage

The `mn` UI test lane already covers a useful slice of the editor/embed implementation and shared component cleanup.

Current tested areas include:

- app shell and test harness wiring
- localization primitives, `LocaleString`, and `HelperText`
- chord, scale, and chord-degree builder behavior
- music object insertion through the editor toolbar
- Quill Delta round-tripping for the custom embed payload
- keyboard and staff display-mode payloads
- width-driven resize persistence and legacy height payload compatibility
- staff rendering options such as octave, enharmonic key spelling, and arpeggiated `MusicXML`
- localized floating controls for playback and resize
- editor interaction and editor view registry services
- table row/column selection helpers, context menu filtering, context menu
  operations, keyboard cell navigation, and edit-view table overflow handling
- music-object sizing behavior inside table cells, including keyboard aspect
  ratio preservation

Important current convention:

- UI specs must be explicitly imported into `src/mn/test.js` or into a file imported by it
- adding a `*Spec.js` file without an import does not make it run
- do not assume Karma source globs will discover new browser specs

## Risks And Gaps

The useful cautions from `modmod` also apply here:

- UI test targeting may start coarse unless we add filtering intentionally
- mocks can become inconsistent if we do not centralize the common ones over time
- browser tests are valuable, but can become a dumping ground if shared/domain logic is not tested separately
- if services are not written with registry-based testability in mind, unit tests become much heavier than they need to be

## Practical Rule Of Thumb

Before adding a new test, ask:

1. Is this really server, shared, or UI behavior?
2. Can this be validated without a browser?
3. Does the test belong next to the code it covers?
4. Should the setup be promoted into shared test support instead of copied again?

## References

Useful reference material from `modmod`:

- [package.json](../../../../modmod/package.json:1)
- [spec/README.md](../../../../modmod/spec/README.md:1)
- [src/testing/README.md](../../../../modmod/src/testing/README.md:1)
- [src/testing/TestHarness.js](../../../../modmod/src/testing/TestHarness.js:1)
- [karma.conf.cjs](../../../../modmod/karma.conf.cjs:1)
- [src/spec.js](../../../../modmod/src/spec.js:1)
- [builds/modmod.js](../../../../modmod/builds/modmod.js:1)
- [agents/topics/architecture/feature-mechanics.md](../../../../modmod/agents/topics/architecture/feature-mechanics.md:156)
- [agents/topics/architecture/build-and-assets.md](../../../../modmod/agents/topics/architecture/build-and-assets.md:148)
