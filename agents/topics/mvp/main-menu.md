# Main Menu

## Purpose

Track the MVP design for the application's main command surface.

This note is about commands that do not have a natural home in direct document editing or embedded-object interaction.
The goal is not to create a desktop-style application menu.
The goal is to provide a web-app command surface for document lifecycle, insertion, view controls, export, account, and help actions that would otherwise be scattered.

## Current Direction

The app likely needs a top-level command surface because some important actions are not reachable by interacting directly with document content.

Use a web-app command bar rather than a desktop menubar.

Current shape:

```text
[Music Notebook] [Document] [Insert] [Format] [View]        [account status]
```

The visible groups should be product-shaped, not a strict desktop `File / Edit / View` clone.
This should feel closer to a document web app than a native desktop application.

The current document name should appear in the browser title, not as persistent visible text in the command bar.
The visible command surface can show the application name or mark, but should avoid spending screen space on a document-name header.

The account controls now live in the top-right shell area rather than in the
main menu. When logged out, that area shows login and sign-up actions. When
logged in, it shows the username and a dropdown that currently contains logout.

## Command Placement Principle

Put commands as close as possible to the thing they affect.

- direct text editing belongs in the editor
- text formatting can live in the editor toolbar
- embedded-object actions belong on the object hover/focus menu
- document/app lifecycle actions belong in the main command surface
- account, export, settings, and help need a non-document access path

Object-specific commands should not be duplicated in the main menu unless there is a strong convenience or accessibility reason.

## Commands That Need A Main Surface

Likely main-menu commands:

- create new document
- open document
- save document
- save as or duplicate document
- rename document
- delete document
- export to `PDF`
- open login UI
- log out
- create account
- open account/settings UI
- change app-level locale
- change app-level accessibility preferences, if any
- open help, reference, or about content
- toggle edit view and read view
- change zoom
- search or find document
- insert objects that cannot be created through typing alone, such as keyboard, staff, table, and page break
- open global document formatting/settings, such as paper size, orientation, margins, base font size, and chord display style
- manage notebook tabs if add, delete, rename, join, or reorder are not fully handled through the tab strip

Commands that should usually stay off the main surface:

- edit a specific embedded object
- play or stop a specific embedded object
- resize an embedded object
- change a specific object's caption, caption formatting, alignment, border, or display mode
- delete or duplicate a specific embedded object

Those actions belong on the object hover/focus menu.

## Suggested Groups

### Document

- new
- open
- save
- save as or duplicate
- rename
- delete
- export `PDF`

### Insert

- table
- page break
- keyboard object
- staff object
- possibly inline chord, if typing is not sufficient for all users

### Format

- paragraph settings
- document format settings
- document chord display style
- document paragraph styles as a later style-management surface

### View

- edit view
- read view, later
- zoom controls
- search/find if it feels more like navigation than editing

### Account Status Area

- log in
- create account
- show current username
- log out from the username menu
- later account settings from the username menu

### Help

- help
- music notation reference
- keyboard shortcut reference
- about

## MUI Fit

The installed `@mui/material` package provides most of the primitives needed for the first MVP version:

- `AppBar`
- `Toolbar`
- `Button`
- `IconButton`
- `Menu`
- `MenuItem`
- `Divider`
- `Tooltip`
- `Dialog`
- `Tabs`

The first implementation should probably use normal `Button` components that open `Menu` dropdowns.
Each top-level group is a web-app menu button, not a true desktop menubar item.

This means:

- `Tab` moves between top-level buttons
- `Enter`, `Space`, or click opens a menu
- arrow-key behavior is mostly handled inside the opened MUI menu
- each menu can be implemented independently

This is enough for a web-style command bar and avoids overcommitting to desktop menubar behavior.

MUI also has examples for application-menu style behavior through its Menubar documentation, but Material UI does not ship that as a direct component.
That path uses `Base UI Menubar` and would require adding `@base-ui/react`.
Treat that as an upgrade path if the MVP command bar needs stronger desktop-style menubar semantics.

## Implementation Shape

The current implementation uses a data-driven `main-menu` registry service in `src/mn/features/app/main-menu.js`.

The service is structural.
It stores menu definitions, returns a sorted snapshot, and emits selection events.
It does not execute document commands itself.

Current service methods:

- `addMainItem(priority, id, stringId)`
- `addItem(mainMenuId, sectionNumber, priority, stringId, options)`
- `selectItem(mainMenuId, itemId)`
- `getMenu()`

Current event behavior:

- `main-item-added` fires when a top-level menu item is added or updated
- `item-added` fires when a regular menu item is added or updated
- `item-selected` fires when an existing regular menu item is selected
- missing main menu ids or missing selected items produce console warnings
- items can carry enabled/visible state and feature-owned metadata used by the renderer

Sorting rules:

- top-level menu items sort by `priority`
- item sections sort by `sectionNumber`
- items within a section sort by `priority`
- the rendered menu places dividers between sections

The app service currently owns the primary top-level menu items.
Other features can add their own items to existing top-level menus when needed.

The document feature currently registers:

- `document.menu.new`
- `document.menu.open`
- `document.menu.save`
- `document.menu.save_as`
- `document.menu.rename`
- `document.menu.delete`

The document controller updates enabled state from account state. Logged-out
users can still select Save so the app can explain that login or account
creation is required. Other document commands are disabled while logged out.

Prefer a data-driven command model.

Example:

```js
[
	{
		id: 'document',
		labelKey: 'menu.document',
		items: [
			{ id: 'newDocument', labelKey: 'menu.document.new' },
			{ id: 'openDocument', labelKey: 'menu.document.open' },
			{ id: 'saveDocument', labelKey: 'menu.document.save' },
			{ id: 'exportPdf', labelKey: 'menu.document.exportPdf' },
		],
	},
]
```

The menu component should render the command surface and emit command ids.
Controllers or view services should decide what each command does.

Command definitions should eventually support:

- id
- localized label key
- optional icon
- enabled or unavailable state
- unavailable reason or helper text
- checked state for view/settings commands
- shortcut display text
- grouping and dividers

## Accessibility Notes

The menu must be reachable and usable without pointer hover.

Accessibility requirements:

- top-level controls are keyboard focusable
- menu items have localized accessible names
- unavailable commands remain understandable, not just visually dimmed
- shortcut labels are visible text but not the only accessible name
- menus close predictably on escape and after command activation
- object-specific hover menus must also open on focus, not only hover

Avoid claiming full desktop-menubar behavior unless the implementation actually supports the full interaction pattern.
For MVP, a web command bar with accessible menu buttons is the cleaner target.

## Open Questions

- Should `Save` and `Export` also appear as persistent buttons outside the grouped menus?
- Should search/find live under `View`, in a document toolbar, or both?
- Should tab add, rename, delete, join, and reorder live only in the tab strip?
- Which commands need visible keyboard shortcut hints for MVP?
- How should anonymous-user save/export gates appear from menu commands?
- Should document settings open one dialog or separate focused dialogs?
- Does mobile/tablet need the same groups collapsed behind one menu button?
- Should account status eventually become part of a shared shell service rather than owned directly by the accounts feature component?
