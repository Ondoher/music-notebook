# REMVC Architecture

## Purpose

Capture the primary architectural organization used by this repo independently of build-system and asset-pipeline concerns.

This note is about application structure, dependency location, runtime orchestration, and conceptual boundaries within the client architecture.

## Historical Note

This codebase is a conversion from an earlier non-React application.

That earlier codebase can be found locally at `c:\dev\gc`.

That history is useful context when reading current architectural seams, because some present implementation choices reflect adaptation into React rather than a clean-sheet React-first design.

## Core Framing

The primary architectural framing used in this repo is `REMVC`:

- `Registry`
- `Executor`
- `Model`
- `View`
- `Controller`

This should not be read as one global model, one global view, and one global controller for the entire application.

A more accurate reading is that the application may contain multiple scoped MVC groupings. Those scopes often correspond to a feature or bounded functional area, and each such scope may have its own model, view, and controller.

## Roles

Within that framing:

- the registry is a centralized locator for service dependencies
- the executor is responsible for initializing the application and determining which controller should receive initial control
- models own durable or domain state, data access, transport-facing behavior, serialization, and domain rules
- controllers manage feature flow, user-facing behavior, command handling, and orchestration between services, models, views, and presentation
- views organize controller-provided information into presentation state, layout decisions, and renderable presentation structures
- presentation renders the concrete UI through React and reports user gestures back through callbacks or controller-facing sessions

The initial controller selected by the executor may be influenced by startup context such as configuration, route, URL, or similar runtime inputs.

## Registry

The registry is especially important in this architecture because the repo prefers service location through the registry over dependency injection.

The registry is not just a generic coordination mechanism. Its primary purpose is to provide a centralized way for code to locate the services it depends on.

That preference appears deliberate rather than accidental. The local reasoning is that dependency knowledge should stay close to the code that actually knows what it needs, rather than being pushed outward into a separate injection layer.

In practice, this often means classes declare their dependencies by calling `this.registry.subscribe(...)` where the dependency is used, instead of receiving every dependency from an external injector.

The philosophy is not that service location is always good or dependency
injection is always bad. The core rule is that dependency knowledge should live
inside the conceptual owner. If a dependency belongs to an app-facing service,
the service should usually locate or declare it through the registry close to
where it is used. If a complex internal unit is split into helper classes, that
unit may inject its own helper dependencies because the knowledge has not leaked
outside the owning concept.

So in practical terms, the repo behaves more like a registry-centered architecture containing multiple scoped MVC groupings than a single monolithic MVC stack.

Clarification for structural helper clusters:

- When a complex internal interface is split into multiple helper classes for
  structural reasons, the helper collection can still be treated as one
  conceptual unit.
- Each helper should remain separately testable.
- Options-object dependency injection is acceptable inside that tight unit when
  it improves testability or keeps boundaries clear.
- Method parameters are part of the runtime API. Do not add parameters whose
  only purpose is to steer internals for tests.
- Except for passing mocks or stubs through construction seams, prefer stubbing
  or mocking the owning state/collaborator over adding extra method parameters
  solely to assist tests.
- If a test needs to influence an internal decision, that influence should come
  through the same state or collaborator the production code would use.
- This is not the same thing as app-level service/plugin architecture. Use the
  registry for app-facing services and independently located dependencies.

There is also an important lifecycle rule for registry-backed services:

- service `start()` should be used for local initialization that makes the service usable
- service `start()` should not assume other services are ready yet
- code should not call or depend on other services until `ready()` has been called
- cross-service subscriptions, listener wiring, and precache work that depends on another service should happen in `ready()`

This matters because Polylith startup can initialize services in parallel. A service may exist in the registry during startup without yet being safe to call as a dependency.

## Model And Service Boundary

Another useful architectural boundary is the distinction between models and services on the client side.

Current preferred pattern:

- models should own raw data access, transport-facing behavior, or backend/domain interaction
- services should provide the UI-facing or app-facing interface over those models
- views should prefer subscribing to services rather than reaching directly into models

This matters because it keeps view dependencies aligned with runtime/UI concerns rather than transport or storage concerns.

A useful way to think about the boundary is:

- model
  - fetches, persists, or bridges domain data
- service
  - caches, adapts, and presents that data for the rest of the client
- view
  - consumes the service

This should be treated as:

- preferred direction
- useful review heuristic
- an incremental cleanup target where existing code still bypasses the service layer

## Model, Controller, View, And Presentation

For this repo, the practical split should be read as four distinct domains:

- model
  - owns durable state, document state, serialization, transport-facing behavior, persistence-facing behavior, and domain normalization that should be reusable outside one screen
- controller
  - owns user-facing flow, command handling, feature startup wiring, controller-owned sessions, behavior decisions, and coordination between services and model operations
- view
  - owns presentation organization: what state is needed for rendering, how controller decisions become renderable structures, and which presentation components are mounted
- presentation
  - owns concrete React rendering: JSX, MUI controls, localized labels, DOM event handlers, and visual state that does not change application behavior

The boundary is about responsibility, not file count.
A small feature may have no separate view class yet, and a complex feature may have one controller plus multiple scoped controller-owned sessions.
When a React component starts owning command decisions, service orchestration, or durable mutation rules, that is a sign that controller or model responsibilities have leaked into presentation.

Controller-owned sessions are an acceptable way to keep presentation thin when a feature has repeated rendered instances.
For example, an embedded object can attach a per-object session through the feature controller.
The presentation can render session-provided actions and report gestures such as `performAction('edit')`, while the controller decides what the action means and which buttons should exist.

## Quill Embed Exception

Quill blots are a deliberate edge case in the normal separation.
Quill owns their DOM lifecycle, so a custom blot may need to create DOM nodes, mount a React root, bridge app context, and translate Quill lifecycle calls into app events.

That exception should stay narrow:

- the blot adapts Quill lifecycle and Delta round-tripping
- the feature controller owns commands, toolbar action lists, playback/edit routing, and durable behavior
- a controller-owned embed session can provide per-embed state and actions to the React presentation
- the React presentation renders the embed and reports gestures back to the session
- reusable domain behavior, payload normalization, layout rules, and music-note generation should move out of the blot when they have more than one caller

The current music-object path follows this pattern with `music-object-controller`, a controller-owned embed session, and the `keyboard-embed.js` Quill adapter.

Future service documentation question:

- investigate whether service-emitted events should be documented consistently
  with standard JSDoc `@event`, `@fires`, and `@listens` tags across the repo
- treat this as exploratory for now; do not convert existing service event
  documentation mechanically until the pattern has been tested against the
  generated docs and local IntelliSense behavior
- useful candidates for review include services that call `this.fire(...)` and
  service consumers that register listeners with `listen(...)`

## View And Presentation

Another important distinction is between the view and the presentation layer.

In this architecture, the purpose of a view is to organize information and direction coming from the controller and translate that into presentation decisions.

The presentation itself is rendered through React.

A useful way to think about that boundary is:

- controller
  - determines user-facing flow, behavior, and direction
- view
  - organizes that information and translates it into presentation structure, component choice, and render state
- presentation
  - is the concrete React rendering layer and should delegate meaningful behavior back through callbacks, services, or controller-owned sessions

This distinction matters because it helps separate:

- application flow and intent
- UI organization
- actual rendering technology

So when reading or evolving the repo, React should be understood as the presentation mechanism, not as the full meaning of the view layer.

## Current Addendum

The repo is not following that separation perfectly today.

In the current implementation, some code paths have the controller render the React component directly rather than delegating through a distinct view layer.

That should be treated as a current implementation detail rather than the ideal architectural target.

So the present reality is:

- `REMVC` remains the intended architectural framing
- React remains the presentation technology
- some controllers are currently taking on direct rendering responsibility that would more cleanly belong behind a view boundary

This is a point to revisit later rather than an intentional rejection of the broader `REMVC` organization.
