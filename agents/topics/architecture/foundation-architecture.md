# Music Notebook Foundation Architecture

## Purpose

Capture the current architectural direction for `music-notebook` in a way that blends:

- the practical, pattern-extracting style used in `modmod`
- the scoped, decision-oriented synthesis style used in `poly-gc-react`

This note is a foundation brief for the MVP implementation phase. It should be read as:

- a working architecture brief
- a place to record preferred patterns
- a way to call out what is still unclear before implementation hardens around assumptions

App-specific planning and product-facing architecture notes now live in:

- [Music Notebook App Architecture](app-architecture.md)

Current platform assumption:

- `music-notebook` is being planned against the current Polylith implementation, not the in-progress Polylith 2.0 rewrite
- Polylith 2.0 may become relevant later as a migration or upgrade topic, but it is not the baseline for current architectural decisions

## General Architecture

This section captures the reusable architectural model we are borrowing from the reference apps.

## Polylith Summary

At a high level, a Polylith app is a system of decoupled services and isolated features, with the build defining how those pieces are assembled into a runnable application.

The core philosophy is:

- functionality should be modular
- features should interact through service interfaces rather than direct internal dependencies
- app composition should be handled structurally by the build and registry model rather than by tightly coupled wiring

The core mechanics are:

- services register themselves with a `Registry`
- services discover one another through the registry rather than direct construction
- `start()` is for local initialization
- `ready()` is for cross-service setup once the service graph exists
- features are isolated units that can contribute code, config, CSS, resources, loadables, and tests
- app builds define entrypoints, included features, output destinations, templates, and optional test entry/output paths
- synthetic modules such as `@polylith/features`, `@polylith/config`, and `@polylith/loader` expose build-generated application structure to runtime code
- frontend tests follow the same structural model, using build-defined `spec` and `testDest` entry/output paths rather than ad hoc browser-side file discovery

The practical result is that runtime behavior comes from registry-driven collaboration, while build-time configuration determines what actually exists in the final app.

## Current Framing

The planned architecture is `polylith` with `REMVC`.

That implies a few early working assumptions:

- the repo will likely be organized around side-effect-driven service registration
- the registry will act as the primary service locator
- features may form their own scoped MVC groupings rather than belonging to one monolithic global MVC stack
- controllers should manage user-facing orchestration
- views should organize presentation decisions
- React and related UI libraries should act as the presentation mechanism rather than the whole architecture

This is the conceptual framing inherited from the reference apps, not yet a fully implemented fact inside this repo.

When this note refers to Polylith behavior, it should be read as referring to the current stable Polylith line used by repos such as `modmod`, unless explicitly stated otherwise.

## Core Architectural Direction

### 1. Feature-Oriented Structure

The reference apps suggest a feature-oriented organization where each feature can own:

- controller logic
- views
- React presentation components
- feature-local styles and assets
- possibly feature-local services or models

### 2. Registry-Centered Service Wiring

The reference architecture strongly favors registry lookup over dependency injection.

Current preferred direction:

- services should locate other services through the registry
- service-local dependency knowledge should stay close to the code that needs it
- local initialization should happen in `start()`
- cross-service subscriptions and dependency-driven setup should happen in `ready()`

This is especially relevant if the app adopts Polylith startup patterns similar to `modmod` and `poly-gc-react`.

### 3. Executor Responsibility

The executor is the part of the app responsible for:

- making sure the initial services are loaded
- determining which controller receives first control

That first controller may vary depending on external runtime conditions such as:

- whether the user is logged in
- whether URL state or routing information indicates a particular starting context
- whether startup context implies a specific notebook, screen, or workflow

So the executor should be understood as startup orchestration, not just generic boot code.

Practical implication:

- startup logic that decides initial control flow should not be scattered across unrelated controllers
- controllers can assume the executor has already done the initial environment check and handoff decision

### 4. Model And Service Boundary

A useful boundary from both reference codebases is:

- models own raw data access, transport-facing behavior, serialization, or backend/domain interaction
- services provide the app-facing or UI-facing interface over those models
- views should prefer consuming services rather than reaching directly into models

### 5. Completed Spike And Cleanup, Durable Learnings

The first editor/embed spike and post-POC React cleanup have now wrapped successfully enough to move into MVP implementation.

That leaves an important architectural rule:

- the completed cleanup is the current React/component baseline
- some POC-era payload and workflow choices may still be temporary
- learned boundaries, constraints, and successful patterns should be treated as durable
- the POC payload shape should not be mistaken for the final notebook document model

The goal is not to freeze the first structure forever.
The goal is to carry forward the proven editor/embed approach and cleaned-up component structure while designing the real document, persistence, and application seams deliberately.

## Working Conventions To Borrow

The following conventions seem worth borrowing from the reference repos unless the app proves they are a bad fit:

- use topic docs to capture architecture by concern, not one giant master document
- separate conceptual architecture from feature mechanics and build/asset behavior
- keep feature-owned code private unless deliberately promoted to a shared layer
- prefer class-based service organization where it aligns with the local Polylith patterns
- keep component-specific styling close to the component or feature that owns it
- treat global styling as shared foundation, not a catch-all bucket
- distinguish current preferred direction from current implementation reality

## Relationship To App-Specific Notes

This document captures the general architectural model.

Use [Music Notebook App Architecture](app-architecture.md) for:

- editor-first product shape
- `Quill` and embedded music objects
- document, persistence, and export seams
- app-specific inconsistencies and open questions

Use a future migration note, if needed later, for:

- evaluation of Polylith 2.0
- compatibility gaps between current Polylith and 2.0
- migration strategy and risk
