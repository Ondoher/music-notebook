# Document Model

## Purpose

Track the current first-pass notebook document model for MVP implementation.

This is the bootstrap note for code that needs to read, update, save, load, or render the current notebook document.
Product scope still lives in [MVP Topic](README.md); this note describes the implemented model seam.

## Current Implementation

The first-pass model is the `document-model` registry service implemented in `src/mn/models/document-model.js`.

It is intentionally generic enough for features to insert document objects without the model knowing the object's type-specific behavior.
Object type ownership lives elsewhere, currently through `object-type-registry` and feature-owned Quill blots/renderers.

The model currently owns:

- document id
- document title
- persisted server document name mapping
- revision
- dirty state
- persistence transport for document save/load/list/rename operations
- document settings
- document typography defaults
- document paragraph styles
- notebook tabs
- active tab id
- per-tab Quill editor content
- generic document objects

The model does not yet own:

- account or ownership checks
- export rendering
- object-type-specific validation
- type-specific object rendering

## Document Shape

The current in-memory and serialized shape is:

```js
{
	id: null,
	title: 'Untitled notebook',
	revision: 0,
	settings: {
		viewMode: 'continuous',
		chordDisplayStyle: 'plain',
		typography: {
			fontSize: 12,
		},
		styles: [
			{
				id: 'normal',
				name: 'Normal',
				parentStyleId: '',
				format: {},
			},
			{
				id: 'header-1',
				name: 'Header 1',
				parentStyleId: 'normal',
				format: {
					bold: true,
					fontSize: 25,
					start: 'full-line',
				},
			},
			{
				id: 'header-2',
				name: 'Header 2',
				parentStyleId: 'normal',
				format: {
					bold: true,
					fontSize: 20,
					start: 'full-line',
				},
			},
			{
				id: 'header-3',
				name: 'Header 3',
				parentStyleId: 'normal',
				format: {
					bold: true,
					fontSize: 15,
					start: 'full-line',
				},
			},
		],
		page: {
			size: 'letter',
			orientation: 'portrait',
			margins: {
				top: 72,
				right: 72,
				bottom: 72,
				left: 72,
			},
		},
	},
	tabs: [
		{
			id: 'tab-1',
			title: '',
			order: 0,
			editorContent: { ops: [{ insert: '\n' }] },
		},
	],
	activeTabId: 'tab-1',
	objects: [],
}
```

Saved server documents wrap this model snapshot instead of replacing it. The
server record currently stores ownership and document-list metadata around the
model content:

```js
{
	id: "document-uuid",
	appId: "mn",
	accountId: "account-uuid",
	name: "Notebook",
	content: documentModel.toJSON(),
	size: Buffer.byteLength(JSON.stringify(content), "utf8"),
	createdAt: Date.now(),
	modifiedAt: Date.now(),
	lockedAt: null
}
```

The server uses app-owned UUIDs for account and document ids.
Mongo `_id` values are persistence details and should not be the domain ids
used by client or document APIs.

Document list responses return metadata only:

- `id`
- `appId`
- `name`
- `size`
- `createdAt`
- `modifiedAt`
- `lockedAt`

Full document responses include that metadata plus `content`.
The current client maps server `name` into document-model `title` when loading.

Page margin values are currently stored as point values.
The editor uses page settings to derive CSS variables for wrapping width and page-related layout.

Document typography defaults are also stored in settings.
The current default font size is `12`.
Paragraph styles are document-global settings rather than app-only constants, so a saved document can carry its own style definitions.

Current default paragraph styles:

- `normal`: Normal, no direct format overrides
- `header-1`: Header 1, parent `normal`, bold, 25px, starts on a full line
- `header-2`: Header 2, parent `normal`, bold, 20px, starts on a full line
- `header-3`: Header 3, parent `normal`, bold, 15px, starts on a full line

The formatting cascade is:

1. document typography/default formatting
2. paragraph style and parent styles
3. paragraph direct formatting
4. inline text formatting where Quill supports it
5. local object or caption formatting for embedded objects

Paragraph direct formatting must preserve which properties were actually changed.
That lets a paragraph continue inheriting future style changes for properties it has not overridden.
For now, paragraph formatting exposes a complete reset action that removes direct overrides and returns the paragraph to its selected style.

## Tabs

Notebook tabs are persisted document metadata.
They are not Quill objects.

Each tab owns one Quill Delta payload in `editorContent`.
The active tab determines which payload the editor is currently editing.

Current tab behavior:

- a new document starts with one tab
- the initial tab title is empty
- adding a tab inserts it after the active tab when an `afterTabId` is supplied
- adding a tab makes the new tab active
- renaming a tab updates `tab.title`
- tabs are ordered by the `order` property
- moving or drag-reordering tabs rewrites `order`
- removing a tab also removes document objects owned by that tab
- at least one tab must remain
- joining tabs appends source content to target content and moves source objects to the target tab

The current app tab strip lives in `src/mn/features/app/components/DocumentTabs.jsx`.
It renders bottom tabs in edit view using `MUI` tabs and `dnd-kit`.

Current tab UI behavior:

- single click selects a tab
- double click starts inline tab-name editing
- `Enter` commits a tab rename
- `Escape` cancels a tab rename
- blur commits a tab rename
- right-side arrow buttons move the active tab left or right when possible
- the plus button adds a tab after the active tab
- drag-and-drop reorders tabs

Delete and join controls are not yet exposed in the tab strip.
Those actions need confirmation before they become normal UI controls.

## Editor Bridge

`EditorPage` bridges Quill and the document model.

Current behavior:

- on mount, the editor loads `documentModel.getEditorContent(activeTabId)`
- when `active-tab-changed` fires, the editor replaces Quill contents with the new tab's `editorContent`
- when `document-loaded` fires, the editor reloads the active tab content
- user-originated Quill text changes call `documentModel.setEditorContent(quill.getContents(), activeTabId)`
- programmatic content loads use Quill's `silent` source and do not write back into the model

This means tab controls are document-model operations, while text editing remains Quill-native for the active tab.

The browser title is derived from the current document name/title, falling back
to `untitled`, and adds `*` while the document model is dirty.

## Generic Objects

Generic document objects live in `document.objects`.

Each object has:

- `id`
- `type`
- `tabId`
- caller-owned additional fields
- usually a `data` payload owned by the feature that understands the object type

The model can create, upsert, update, remove, and query objects.
It does not interpret the object type.

Current music objects are created by the music-object feature and rendered through the registered object type and Quill blot.
The model only persists their generic object identity, tab ownership, and payload.

## Formatting Services

Document-level formatting is split between a reusable service and a feature controller:

- `src/mn/services/document-format.js` is the global document-format service.
- `src/mn/features/document-format/controller.js` owns menu/dialog orchestration for the document-format feature.

The document-format service reads and writes document-wide page and typography settings through `document-model`.
It replaced the older misleading page-format language; there is no per-page formatting model.

Paragraph-level formatting is owned by the `paragraph-format` feature.
It registers Quill paragraph formats for:

- paragraph style
- font size
- bold
- italic
- underline
- alignment
- start behavior

Current start behavior values:

- `continuous`: keep normal flow
- `full-line`: start the paragraph on its own full line
- `next-page`: mark the paragraph as starting on a new page for read view/export interpretation

The edit view can represent `full-line` with block-start styling.
`next-page` is primarily a read-view/export layout instruction unless a simple edit-view marker is added.

The editor also has a see-white-space toggle. It should draw non-printing
markers without changing document layout. Marker styling belongs in editor CSS
and should be overlay-like rather than mutating Quill whitespace behavior.

Music objects are large inline Quill embed leaves, similar to image embeds.
Side-by-side music layout should use tables or a later explicit layout
container rather than adjacent floated embeds.
Music-object `width` and `height` are nominal natural object dimensions.
Displayed size is controlled by optional `scale`; when `scale` is omitted the
object should render as scale `1`. This keeps old documents compatible while
making resize a scale operation instead of mutating the object's natural size.

## Document Persistence Feature

The document feature owns client-side document commands and dialogs:

- `src/mn/features/document/controller.js`
- `src/mn/features/document/components/DocumentList.jsx`
- `src/mn/features/document/components/DocumentNameDialog.jsx`
- `src/mn/features/document/components/DocumentOpenDialog.jsx`
- `src/mn/features/document/components/DocumentMessageDialog.jsx`

The persistence boundary is intentionally split:

- `document-model` owns the actual client transport calls for persisted
  document data.
- the document feature controller owns user-facing flow only: menu commands,
  dialogs, prompting, conflict confirmation state, and last-open coordination.
- document feature controllers must not call `io` or encode document API URLs
  directly.

Current document menu commands:

- New
- Open
- Save
- Save as
- Rename
- Delete

When logged out, every document command except Save is disabled. Save stays
enabled so it can explain that account creation or login is required and offer
buttons through `account-ui`.

Current implemented flows:

- Save creates a document when the current document is new, using the same name
  dialog family as Save as with save-specific wording.
- Save updates the existing server document when the current document has an id.
- Save as creates a new server document from the current model snapshot.
- Rename updates only the server document name and local document title; it does
  not prompt to save/ignore content changes because content is not changing.
- Open loads a document by id and updates `lastOpenDocumentId`.
- New clears the document model and clears `lastOpenDocumentId`.
- Open/New prompt for unsaved work with specifically named actions:
  `[Save] [Do not save] [Cancel]`.

Client-side name conflict checks are convenience only. The server always owns
final conflict resolution and returns `409 documents.name_conflict` when the
client must confirm overwrite/name reuse behavior.

On successful login or session restore, the document feature attempts to open
the account's `lastOpenDocumentId` if the current local document has no id and
is not dirty. If that stored document no longer exists, the account metadata is
cleared.

On logout, the accounts controller fires an asynchronous cancellable logout
intent. The document feature can cancel logout while prompting for unsaved work.
If the user chooses Save and the document is new, the save-name dialog opens
before logout is allowed to finish. If the user chooses Do not save, the
document can be cleared after logout.

## Server Document API

The current server document feature lives under:

- `server/features/document/document-router.js`
- `server/features/document/document-service.js`
- `server/features/document/db/DocumentsDb.js`

All document API routes require a valid bearer token. Missing or invalid bearer
tokens return `401` with:

```js
{ success: false, reason: "unauthorized" }
```

Routes:

```text
GET    /api/documents
GET    /api/documents/:id
POST   /api/documents
PUT    /api/documents/:id
POST   /api/documents/:id/save-as
PATCH  /api/documents/:id/name
POST   /api/documents/:id/duplicate
DELETE /api/documents/:id
```

The route does not accept `accountId` from the client. Scope is derived from the
bearer token and the `X-Music-Notebook-App-Id` header.

## Service API

The service currently implements:

- `getId()`
- `getTitle()`
- `setTitle(title)`
- `getRevision()`
- `isDirty()`
- `markSaved(revision)`
- `getSettings()`
- `updateSettings(patch)`
- `getTabs()`
- `getTab(tabId)`
- `addTab(input)`
- `updateTab(tabId, patch)`
- `removeTab(tabId)`
- `moveTab(tabId, targetIndex)`
- `joinTabs(sourceTabId, targetTabId)`
- `getActiveTabId()`
- `setActiveTab(tabId)`
- `getEditorContent(tabId)`
- `setEditorContent(content, tabId)`
- `getObjects(tabId)`
- `getObject(objectId)`
- `createObject(type, data, options)`
- `upsertObject(object)`
- `updateObject(objectId, patch)`
- `removeObject(objectId)`
- `loadDocumentList()`
- `loadServerDocument(documentId)`
- `saveNewDocument(name, options)`
- `saveExistingDocument(options)`
- `renameServerDocument(name, options)`
- `toJSON()`
- `load(snapshot)`

Lifecycle methods such as `start()` are Polylith runtime methods and are not part of the ambient service interface contract.

## Events

The service fires specific events and a broad `document-changed` event after changes.

Important events:

- `title-changed`
- `settings-changed`
- `tabs-changed`
- `tab-added`
- `tab-updated`
- `tab-removed`
- `tabs-reordered`
- `tabs-joined`
- `active-tab-changed`
- `editor-content-changed`
- `object-created`
- `object-updated`
- `object-changed`
- `object-removed`
- `document-loaded`
- `document-saved`
- `document-changed`

UI surfaces should subscribe to the narrowest useful event.
Persistence can use `document-changed` or explicit save commands depending on the final save strategy.

## Current Tests

Document model behavior is covered in `src/mn/models/_tests/DocumentModelSpec.js`.
Tab UI behavior is covered in `src/mn/features/app/components/_tests/DocumentTabsSpec.js`.
The editor/model active-tab bridge is covered in `src/mn/features/music-object/quill/_tests/EditorToolbarSpec.js`.

Recent full UI verification:

- `npm run test:ui -- --grep ViewModeService` passed with `328 SUCCESS` after the current read-only paged-preview table CSS fix
- `npm run test:ui -- --grep TableController` passed with `330 SUCCESS` after the current table context-menu split-table attempt; the split-table manual behavior is still not working and should not be treated as complete

Known non-failing noise includes MUI Dialog `act(...)` warnings,
React lifecycle/flushSync warnings around Quill/table/editor mount paths,
module directive warnings, and OSMD SkyBottomLineCalculator warnings.

## Open Questions

- What visible default name should a new tab get?
- What confirmation flow should delete and join use?
- Should joining tabs always append source content, or eventually offer cursor insertion?
- How should tab overflow, compression, color coding, and ellipsis selection work?
- Should tab metadata later include read-view placement or export behavior?
- Should revision history store whole snapshots, patches, or both?
- How should style editing and style creation be exposed once paragraph style selection is stable?
- Should object/caption styles reuse paragraph styles directly, or eventually move to a style subtype?
- Should server duplicate/save-as enforce name conflicts the same way create/rename currently do?
- How should locked documents be represented in the UI when local PWA editing begins?
