# Base Dialog Design

## Purpose

Track the MVP design for a shared `BaseDialog` component.

This note is for product and component design decisions before implementation.
Use it to keep the dialog contract intentional as shared dialogs grow across the notebook editor, music-object editing, account prompts, save/export gates, help, and later persistence flows.

## Current Goal

Create a shared dialog foundation that wraps the common `MUI` dialog shell while letting each concrete dialog own its domain content.

The component should help every dialog in the app get the boring-but-important pieces right:

- consistent title, content, and action regions
- localized labels and helper text
- accessible title and description wiring
- predictable close, escape, and button behavior
- direct `MUI` imports
- app-level styling hooks without owning feature-specific layout

`BaseDialog` should not become a generic form framework or a place for music-object-specific behavior.
It should provide the shared shell.
Concrete dialogs, such as `MusicEmbedDialog`, should provide the workflow.

## Architectural Fit

`BaseDialog` belongs in the shared component layer, likely under `src/mn/components`.

It aligns with current repo direction:

- use `MUI` for dialogs and application controls
- avoid rendering raw `MUI Dialog` directly inside unrelated feature components
- keep reusable presentation components localized and accessible
- keep substantial React components class-based
- let feature components compose shared components instead of duplicating dialog chrome

The expected relationship is:

- parent feature component owns whether a dialog is open
- concrete dialog component owns workflow state and domain actions
- `BaseDialog` owns the common shell, ARIA wiring, title/content/action layout, and close affordance

## Initial Component Contract

The first design should use a constrained dialog contract rather than accepting arbitrary action markup.

Top-level dialog shape:

- `open`
- `title`
- `titleKey`
- `titleId`
- `description`
- `descriptionKey`
- `descriptionId`
- `children`
- `buttons`
- `buttonStyle`
- `showClose`
- `closeLabelKey`
- `onButtonPress`
- `resetToken`
- `className`
- `contentClassName`
- `actionsClassName`
- `maxWidth`
- `fullWidth`

Required structure:

- the dialog has one title
- the title may have a caller-provided id
- if no title id is provided, `BaseDialog` creates one for `aria-labelledby`
- the dialog can show an optional top-right close icon
- the dialog can show an optional descriptive paragraph below the title
- the description may have a caller-provided id
- if a description exists and no description id is provided, `BaseDialog` creates one for `aria-describedby`
- the dialog accepts a single child component
- the dialog renders a list of buttons
- the dialog has one button style for the action list: `link` or `button`
- the dialog uses the React `key` property at the component boundary as its identity and reset boundary
- the dialog stays open when it is rerendered with the same React `key`
- the dialog key must not change while the dialog is open
- rerendering the same dialog because of property changes preserves the same focused element when possible
- rerendering the same dialog because of property changes must not remove and recreate the dialog DOM node
- rerendering the same dialog because of property changes must not cause the title to be reread as if the dialog reopened
- the dialog accepts a `className` property for dialog-level styling
- the dialog always applies its own default class for base styling
- when `className` is passed, both the default class and caller class are applied

Button model:

- each button has an `id`
- each button has a `labelKey`
- literal `label` is intentionally not part of the production button contract
- each button has a visual priority: `primary` or `secondary`
- only one button may be treated as primary
- if more than one button is configured as primary, the first primary button is accepted and each later primary button is downgraded or treated as non-primary with a console warning
- each button has an enabled state: `enabled` or `disabled`
- each button has a pressed state: `pressed` or `unpressed`
- `unpressed` is the default pressed state
- pressed state is not the same as disabled state; pressed and unpressed buttons may still be interactable
- pressed state only gets `aria-pressed` when the button is marked as pressable
- each button can declare `pressable`
- each button has a visibility state: `show` or `hide`
- `show` is the default visibility state
- hidden buttons may be bad UX and should be used sparingly
- if a button is hidden, it is not rendered
- disabled buttons are visible and cannot be activated
- disabled buttons remain tabbable/focusable so the unavailable state can be announced
- disabled should be implemented as a visual and interaction state rather than relying only on native button disabling
- hidden buttons stay part of the configured button list, but are not rendered as active dialog actions
- buttons render in configured array order
- an action button must not use the reserved id `close`
- dialog buttons follow the app-wide rule that buttons, icon buttons, and hover-help targets remain in the tab list; display state and interaction availability are handled in code

Event model:

- `onButtonPress(buttonId)` is the only action callback
- pressing a configured action button calls `onButtonPress` with that button's `id`
- pressing the top-right close icon calls `onButtonPress("close")`
- if the close icon is shown, pressing Escape dismisses the dialog as if the close icon was pressed
- if the close icon is not shown, Escape should not dismiss the dialog through `BaseDialog`
- background or backdrop click follows the same rule as Escape
- a submit action can be added to the callback method list so child forms can request the dialog's submit behavior intentionally
- there should never be a state that prevents the dialog from being dismissed by an available close path

Child update model:

- the single child component receives one injected property with update methods
- the injected property is named `dialog`
- the injected property lets the child request updates to the dialog title
- the injected property lets the child request updates to the dialog description
- the injected property lets the child request updates to button states
- button state updates should target existing button ids rather than replacing the whole dialog contract accidentally
- child-driven updates must not accidentally close or remount the dialog when the React `key` is unchanged

State model:

- child-driven title, description, and button updates live in `BaseDialog` internal state
- `BaseDialog` follows React's controlled/uncontrolled pattern: props initialize state for the keyed dialog, and internal state owns later child-driven shell updates
- rerendering with the same React `key` does not overwrite that internal state by default
- rerendering with the same React `key` should preserve focus inside the dialog when possible
- rerendering with the same React `key` should update existing DOM rather than unmounting and remounting the dialog
- rerendering with the same React `key` should not cause assistive technology to treat the dialog as newly opened
- property changes are handled as state changes, not as implicit remounts
- prop changes only override internal state when the caller uses an explicit override mechanism
- the explicit same-key override mechanism is `resetToken`
- when `resetToken` changes, `BaseDialog` reinitializes title, description, and buttons from props without changing the React `key`
- changing the React `key` while the dialog is open is not supported
- callers should close the current dialog before opening a different keyed dialog

Likely injected child API:

- `dialog.setTitle(titleSpec)`
- `dialog.setDescription(descriptionSpec)`
- `dialog.setButtonState(buttonId, patch)`
- `dialog.announce(messageOrSpec)`
- `dialog.submit()`

Announcement model:

- changing the title does not automatically force a screen reader announcement
- changing the description does not automatically force a screen reader announcement
- the dialog exposes an explicit announcement method for important state changes
- button presses that change the whole dialog state can use the announcement method to describe the new state
- button state changes that happen outside direct button interaction may need explicit announcement
- announcements should render through a visually hidden live region owned by `BaseDialog`
- announcement priority should default to polite
- assertive announcements should be reserved for blocking or urgent states

Label model:

- `labelKey` is a localization phrase key resolved through the app localization layer
- production dialog buttons should use `labelKey`
- literal labels should not be added only to make tests easier
- tests should provide phrase data or test localization behavior through the same localization path as production UI

React state direction:

- `BaseDialog` is intentionally stateful, using props as initial state for the current keyed dialog
- ordinary prop updates for the same keyed dialog should not blindly replace child-driven internal state
- this follows React's common controlled/uncontrolled distinction: either props fully control a value, or internal state owns it after initialization
- because `BaseDialog` owns child-driven dialog shell state, implementation should avoid broad derived-state-from-props logic
- the React `key` boundary is the standard reset mechanism when a new dialog instance is needed
- `resetToken` is the explicit same-key state override mechanism
- implementation should avoid broad `getDerivedStateFromProps` style syncing

Localization direction:

- accept phrase keys for shared app dialogs
- allow literal strings for transitional call sites and tests
- do not assemble grammatical fragments inside `BaseDialog`
- prefer full-sentence phrase keys for descriptions and helper text

Accessibility direction:

- generate stable title and description ids when callers do not supply them
- wire `aria-labelledby` to the rendered dialog title
- wire `aria-describedby` only when a description exists
- provide an accessible close button when a close affordance is shown
- render the close affordance as an X icon from MUI icons
- use a default localized hover/accessibility text key for the close icon
- allow the default close icon text key to be overridden by property
- preserve `MUI` focus management rather than replacing it
- treat backdrop click like Escape: it closes only when the close icon is available
- provide an explicit live-announcement channel for major dialog state changes
- same-dialog rerenders should preserve focus and avoid title rereads by keeping the dialog DOM node stable
- apply `aria-pressed` only for buttons that are meaningfully pressable or toggle-like
- represent disabled buttons in a way that remains focusable and announces the unavailable state
- keep dialog buttons and close/help icons keyboard reachable whenever they are visually present
- avoid inaccessible disabled-button traps; an available close path must remain operable
- let concrete dialogs define field-level labels, helper text, validation, and submit semantics

## Content And Actions

`BaseDialog` should provide the structure, not decide the workflow.

Content:

- render the single child component inside a `DialogContent` region
- optionally render a localized description before custom children
- avoid imposing form layout rules beyond basic dialog spacing

Actions:

- render configured `buttons` through `DialogActions`
- keep action alignment consistent through `DialogActions`
- do not hardcode save/cancel labels into the base component
- route every button press through `onButtonPress(buttonId)`
- preserve configured array order
- `buttonStyle: "button"` renders normal dialog action buttons
- `buttonStyle: "link"` renders dialog actions with link styling and without the normal button class
- concrete dialogs should choose whether actions mean save, apply, insert, cancel, sign in, or export

## Styling Direction

Dialog chrome should be styleable with app-level classes and CSS variables.

Preferred styling boundaries:

- use `MUI` component props for dialog behavior
- expose `className` as the dialog-level styling hook
- keep the default base dialog class on the root even when callers pass `className`
- expose class hooks for the base shell, content, and actions
- avoid component-specific `sx` for product styling unless the value is purely structural
- keep feature-specific dialog body styling in the concrete dialog or feature stylesheet

Likely class names:

- `mn-base-dialog`
- `mn-base-dialog__title`
- `mn-base-dialog__description`
- `mn-base-dialog__content`
- `mn-base-dialog__actions`
- `mn-base-dialog__close`

## First Consumers

Likely first or early consumers:

- `MusicEmbedDialog`
- future account creation and sign-in dialogs
- anonymous save/export gate dialogs
- document rename dialog
- tab delete confirmation dialog
- help/about dialogs

`MusicEmbedDialog` is the best first real consumer because it is already a dedicated feature-owned dialog and currently represents the dialog extraction direction from the POC.
Reusable controls used inside that dialog should stay in the shared component layer when they are useful outside the music-object feature.

## Testing Expectations

Tests should cover the base shell behavior without overfitting to `MUI` internals.

Useful first tests:

- renders localized title and description
- wires `aria-labelledby` and `aria-describedby`
- calls `onButtonPress("close")` from the close affordance
- calls `onButtonPress(buttonId)` when an enabled action button is pressed
- keeps disabled buttons focusable
- does not activate disabled buttons
- announces or exposes disabled button state to assistive technology
- keeps visually present buttons, icon buttons, and hover-help targets in the tab order
- renders pressed/unpressed button states according to the final visual and ARIA design
- hides buttons configured with `hide`
- renders buttons in configured array order
- treats only the first configured primary button as primary
- logs a console warning for every configured primary button after the first
- warns when an action button uses the reserved `close` id
- omits `aria-describedby` when no description is present
- supports Escape as close only when the close icon is shown
- supports backdrop click as close only when the close icon is shown
- remains open across rerenders with the same React `key`
- preserves internal child-driven updates across rerenders with the same React `key`
- preserves focus across same-dialog property-change rerenders when the focused element still exists
- does not remount the dialog DOM on same-dialog property-change rerenders
- does not reread the title as a fresh dialog open on same-dialog property-change rerenders
- supports child-triggered submit through the dialog update property
- supports explicit polite live announcements
- does not automatically live-announce every title or description change
- reinitializes state from props when `resetToken` changes
- uses the production localization path for button labels

Concrete dialogs should still test their own workflow behavior separately.

## Open Questions

- Is `showClose` the right prop name for the optional top-right close icon?
- How should the component detect and warn if the React `key` effectively changes while the dialog is open?
- Should disabled action buttons use `aria-disabled="true"` with custom activation blocking, or another focusable unavailable-button pattern?
- What visual and announcement behavior should pressed/unpressed state use when the change is not caused by direct button interaction?
- Should the pressable flag be named `pressable`, `toggle`, or something else?
- Is `hide` needed at all, given the UX concern that hiding available actions can be confusing?
- Should `dialog.announce` accept only polite/assertive priority, or also a way to clear the live region?
- Should `primary` and `secondary` map directly to `MUI Button` variants, colors, or both?
- Should later primary buttons be explicitly downgraded to secondary, or rendered with a neutral fallback style?
- Should child-requested title and description updates accept phrase keys, literal text, or both?
- Should button state updates allow label changes, or only enabled, pressed, and visibility changes?
- Should the component expose id props for advanced accessibility cases, or rely on generated ids?
- Should form submission be supported directly, or should concrete dialogs wrap content in their own form?
- Is there a valid reason for dialog content to define an action button with id `close`, or should `close` remain reserved exclusively for the close affordance?
- Should full-screen behavior for tablet-sized viewports be part of `BaseDialog` now or later?
- Should destructive confirmation styling live in `BaseDialog`, a `ConfirmDialog`, or the concrete caller?

## Decision Log

### 2026-05-27

- Started MVP design tracking for a shared `BaseDialog`.
- Initial direction is a small shared `MUI Dialog` shell, not a workflow framework.
- Concrete dialogs remain responsible for domain content, validation, and actions.
- Added initial requirements: title, optional close icon, optional description, single child component, configured button list, one button callback, and child-driven updates to title, description, and button states.
- Added lifecycle requirement: rerendering the dialog with the same key must keep it open.
- Clarified that `BaseDialog` must accept a dialog-level `className` property.
- Clarified class behavior: the default base dialog class is always applied, and caller `className` is additive.
- Added primary button enforcement: only the first primary button is accepted, and every subsequent primary button produces a console warning.
- Added design decisions: child receives a single update-method property, dialog-owned internal state persists across same-key rerenders, backdrop click follows Escape behavior, button order is array order, forms can use a submit action, and type declarations are required.
- Split button state into pressed `on`/`off` and visibility `show`/`hide`.
- Clarified `label` versus `labelKey`.
- Added optional `titleId` and `descriptionId`; when absent, `BaseDialog` creates ids for ARIA wiring.
- Added explicit `dialog.announce(...)` support for major dialog state changes, especially state changes caused by button actions.
- Added stable rerender requirement: same-dialog property changes must preserve focus, keep the dialog DOM node stable, and avoid title rereads.
- Replaced `dialogKey` with the React `key` boundary as the dialog identity/reset mechanism.
- Decided key changes are not supported while a dialog is open; callers should close before opening a differently keyed dialog.
- Renamed button pressed state from `on`/`off` to `pressed`/`unpressed`.
- Clarified that `buttonStyle: "link"` is visual link styling without the normal button class.
- Added accessibility follow-up for disabled buttons and pressed-state announcements.
- Decided disabled buttons should stay focusable/tabbable so their unavailable state can be announced, with activation blocked by interaction handling rather than only native disabling.
- Added app-wide accessibility rule: visually present buttons, icon buttons, and hover-help targets stay in the tab list, with display and interaction state handled in code.
- Decided same-key prop overrides use an explicit `resetToken`; ordinary same-key prop changes do not overwrite internal dialog state.
- Decided production button labels use `labelKey`; literal labels should not be added just for tests.
- Decided pressed state uses a separate pressable flag before applying `aria-pressed`.
- Decided hidden buttons, if kept, do not render; hiding remains a UX concern to revisit.
- Decided the close affordance is an MUI X icon with a default localized hover/accessibility text key and an override property.
