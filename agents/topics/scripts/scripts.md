# Scripts

## Purpose

Capture guidance about repository scripts, especially generation, conversion,
and build-support tools that help Music Notebook feature work.

## Current Status

The top-level `scripts` folder is a place for repository tooling. Scripts should
be treated as checked-in support code when they help reproduce current work, but
not automatically as stable runtime infrastructure.

Useful script categories for this repo may include:

- asset conversion
- music notation fixture generation
- local verification helpers
- deployment or build support
- one-off analysis tools that are worth keeping because they document a repeatable workflow

## Implementation Guidance

Keep command files small when possible. If a script grows beyond a thin command
and stateless helpers, prefer extracting the domain behavior into a named module
or class so it can be tested and navigated like the rest of the codebase.

Plain functions are still appropriate for utilities that transform one input
into one output without carrying state. A class becomes a better fit when the
script accumulates reports, warnings, generated artifacts, or other structured
state across several operations.

Generated artifacts should be deterministic where practical. If a script writes
files that are committed, the command and its inputs should be clear from the
script name, nearby docs, or both.

## Placement

Prefer the top-level `scripts` folder for repo-wide tools.

Feature-specific generation that only supports one feature can live near that
feature if it is tightly coupled to the feature's source format. If the tool
becomes useful across features, promote it into `scripts` and document the
expected input/output paths.
