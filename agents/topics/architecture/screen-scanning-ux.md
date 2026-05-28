# Screen Scanning UX

## Purpose

Summarize screen-scanning and visual-hierarchy research that should inform `music-notebook` UI design.

Use this topic when designing:

- dialogs
- editor controls
- toolbars
- form groups
- help text
- document-object controls
- settings and future account/save/export flows

The goal is not to make every screen look the same.
The goal is to make important information easy to find quickly without forcing users to read every word.

## Research Summary

Users scan more than they read.
Nielsen Norman Group reports that this has stayed true across decades of eye-tracking research.
Their newer report draws from 5 eye-tracking studies, more than 500 participants, and more than 750 hours of eye-tracking time.

Source:

- [How People Read Online: New and Old Findings](https://www.nngroup.com/articles/how-people-read-online/)

The F-pattern is real, but it is not a design goal.
It tends to appear when content has weak structure: wall-of-text, weak headings, few bullets, and few strong visual cues.
NN/g frames F-pattern scanning as a bad outcome because users can miss important content.

Source:

- [F-Shaped Pattern of Reading on the Web](https://www.nngroup.com/articles/f-shaped-pattern-reading-web-content/)

Better UI encourages layer-cake scanning.
In this pattern, users scan meaningful headings, labels, buttons, and section markers, then read details only where relevant.
This is a better fit for dialogs, forms, and editor controls than relying on long explanatory text.

Source:

- [The Layer-Cake Pattern of Scanning Content on the Web](https://www.nngroup.com/articles/layer-cake-pattern-scanning/)

Users also scan for distinct targets.
The spotted pattern means users jump to things that visually or semantically stand out, such as links, bold words, numbers, buttons, distinctive labels, or known keywords.

Source:

- [Text Scanning Patterns: Eyetracking Evidence](https://www.nngroup.com/articles/text-scanning-patterns-eyetracking/)

Visual hierarchy is a usability mechanism, not decoration.
NN/g identifies color and contrast, scale, and grouping as major ways to guide attention.

Source:

- [Visual Hierarchy in UX: Definition](https://www.nngroup.com/articles/visual-hierarchy-ux-definition/)

For left-to-right interfaces, attention leans left.
NN/g found that users spend much more viewing time on the left half of webpages than the right.
This does not mean everything belongs on the left, but it does mean leading labels, left edges, and first words carry a lot of scanning weight.

Source:

- [Horizontal Attention Leans Left](https://www.nngroup.com/articles/horizontal-attention-leans-left/)

## Principles To Borrow

Prefer layer-cake scanning over F-pattern scanning:

- use clear titles, headings, group labels, and action labels
- make section labels visually distinct but not promotional
- group related controls with proximity and spacing
- break long option sets into labeled groups
- use bullets or compact lists for short sets of facts
- avoid long, dense explanatory paragraphs in operational UI

Use information-bearing first words:

- start titles with the thing or task being edited
- start labels with the distinguishing term
- avoid generic lead words when the first words are likely to be scanned
- use button labels that describe the action, not vague words like "OK" when a clearer verb exists

Create hierarchy deliberately:

- make the main task and primary action obvious
- use one primary action per dialog or focused workflow
- use contrast, scale, spacing, and grouping sparingly but consistently
- avoid giving many elements equal visual weight
- reserve warning/error emphasis for real warning/error states

Make scan targets work for keyboard and screen-reader users too:

- visible buttons and icon buttons remain keyboard reachable
- hover-help targets remain keyboard reachable
- unavailable controls expose why they are unavailable
- accessible labels should carry the same information that visual labels provide
- live announcements should be deliberate and tied to meaningful state changes

## Music Notebook UI Guidance

For `music-notebook`, the editor can be expressive, but the surrounding controls should be calm and easy to scan.

Dialogs:

- put the dialog purpose in the title
- keep the optional description short
- prefer labeled field groups over explanatory paragraphs
- use one primary action
- keep action order predictable
- make disabled or unavailable actions discoverable and explainable
- announce major mode or state changes explicitly instead of relying on title rereads

Editor controls:

- group object controls by task, such as edit, playback, resize, and display options
- use icon buttons with accessible labels and keyboard-reachable help
- avoid making every tool look equally prominent
- keep destructive or uncommon actions visually secondary until needed

Forms:

- make field labels scannable
- put helper text near the field or group it explains
- use group-level helper text when a message describes a combined value
- make validation state visible and accessible
- avoid forcing users to read a long description before they can understand the form structure

Music object editing:

- use structured groups for display mode, music input, staff options, keyboard options, and playback options
- avoid hiding important mode changes only in prose
- when a button press changes the dialog state substantially, use an explicit live announcement
- preserve focus on same-dialog rerenders so the screen does not feel like it reopened

## Practical Checklist

Before finishing a UI surface, ask:

1. Can a user understand the main task from the title and first visible labels?
2. Are related controls visually grouped?
3. Is there only one visually primary action?
4. Are important words near the start of headings, labels, and actions?
5. Is explanatory text short enough that users can scan past it without losing the UI structure?
6. Do keyboard and screen-reader users get the same control availability and help cues as mouse users?
7. Does a mode/state change need an explicit announcement rather than a silent title change?

## Related Topics

- [UI Component Layer](ui-component-layer.md)
- [Localization And Accessibility](localization-accessibility.md)
- [Base Dialog Design](../mvp/base-dialog.md)
