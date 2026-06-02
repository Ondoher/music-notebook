# alphaTab Investigation

## Purpose

Track alphaTab as a post-MVP investigation candidate.

This is not an MVP dependency decision.
The current MVP should continue with the simpler music-object path unless a later spike proves alphaTab solves a focused post-MVP problem better than the existing `MusicXML`/OSMD/player direction.

## Why It Is Interesting

alphaTab is a broad music notation SDK with strong support for guitar-oriented content.
It may support future Music Notebook features that are larger than the current keyboard/staff embed scope:

- guitar, bass, ukulele, and other stringed-instrument tablature
- Guitar Pro import
- alphaTex text-based notation snippets
- richer technique notation for guitar lessons
- practice playback with cursor tracking, looping, tempo control, and transposition
- synchronized notation with external audio or video
- multi-track and partial-score rendering

The main attraction is that it could support a dedicated tab/score object feature rather than only a small illustrative music embed.

## Likely Post-MVP Uses

### Tablature Object

A future music object could add a `tab` or `score` display mode.

Useful questions:

- Can alphaTab render compact tab snippets cleanly inside a Quill embed?
- Can the rendered output be sized and cropped consistently like the current shared music preview?
- Can a tab object behave like a document object rather than a mini editor inside Quill?
- Can read view and `PDF` export render the same tab object without requiring a live editor interaction layer?

### Guitar Pro Import

alphaTab can load Guitar Pro-family files.
That makes it a possible import path for users who already have `.gp`, `.gpx`, `.gp5`, or similar materials.

Useful questions:

- Which Guitar Pro versions are reliable enough for our target use cases?
- Can imported material be reduced to a small notebook object rather than a full song editor?
- What durable document payload should store imported source files, normalized music data, or both?
- How should copyright and user-owned material be handled if files are uploaded or saved?

### Practice And Exercise Features

alphaTab's playback and cursor features overlap with post-MVP practice goals.

Useful questions:

- Can alphaTab playback remain behind the existing `player` feature, or would it need a separate player adapter?
- Can playback range, tempo, looping, and transposition support exercise objects?
- Can track mute/solo/volume support practice accompaniments?
- Can synchronized external audio/video support lesson materials without overcomplicating the document model?

### Rich Guitar Techniques

alphaTab supports many guitar-specific techniques and annotations.

Useful questions:

- Which techniques matter for Music Notebook teaching content?
- Can those techniques be expressed in `MusicXML`, alphaTex, or alphaTab's own data model without locking the whole app to alphaTab?
- Which effects render but do not play back, and does that matter for our use case?
- How should technique-heavy material export to `PDF`?

## Risks

- alphaTab is a full SDK, not a drop-in renderer.
- It may overlap with existing OSMD/staff rendering and the player feature.
- A tab object could pull the app toward composition software if the scope is not constrained.
- Guitar Pro import may introduce large, multi-track song documents when the notebook model only needs snippets.
- Playback, audio export, and media sync features may duplicate or complicate the existing playback seam.
- File import raises persistence, storage, copyright, and export questions.

## Spike Shape

A useful first spike should be small:

1. Install alphaTab behind a temporary local spike path.
2. Render one alphaTex guitar tab snippet inside a standalone component.
3. Render the same snippet in a Quill embed-sized container.
4. Test resizing, cropping, and read-only rendering.
5. Load one small Guitar Pro file and inspect the parsed score/model shape.
6. Test playback with a soundfont only if rendering looks promising.
7. Decide whether alphaTab should be a tab-object renderer, an import adapter, a practice/playback engine, or deferred.

## Decision Criteria

Accept alphaTab as a post-MVP candidate if:

- it can render compact tab snippets reliably in the document flow
- output can be constrained for read view and export
- its data model can be adapted without replacing the notebook document model
- Guitar Pro import can be scoped to snippets or explicit imported objects
- playback can live behind a service boundary

Defer or reject it if:

- it requires turning Music Notebook into a full tablature editor
- it cannot render cleanly inside object embeds
- it duplicates OSMD/player behavior without a clear product gain
- Guitar Pro import creates persistence or licensing complexity too early

