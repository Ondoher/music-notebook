/* global describe it expect beforeEach */

import { Registry, Service } from '@polylith/core';
import TableUp from 'quill-table-up';

import MainMenuService from '../../app/main-menu.js';
import TableController from '../controller.js';

class EditorSurfaceMock extends Service {
	constructor(registry) {
		super('editor-surface', registry);
		this.implement(['getEditorRoot', 'getQuillModule', 'update']);
		this.editorRoot = null;
		this.insertedTables = [];
		this.tableModule = null;
		this.updatedSources = [];
	}

	getEditorRoot() {
		return this.editorRoot;
	}

	getQuillModule(name) {
		this.requestedModuleName = name;
		if (this.tableModule) {
			return this.tableModule;
		}

		return {
			insertTable: (rows, columns, source) => {
				this.insertedTables.push({ columns, rows, source });
			},
		};
	}

	update(source) {
		this.updatedSources.push(source);
		return true;
	}
}

class EditorInteractionsMock extends Service {
	constructor(registry) {
		super('editor-interactions', registry);
		this.implement(['registerHandler', 'dispatch']);
		this.handlers = [];
	}

	registerHandler(handler) {
		this.handlers.push(handler);
		return () => {
			this.handlers = this.handlers.filter((candidate) => candidate !== handler);
			return true;
		};
	}

	dispatch(eventName, event, context = {}) {
		return this.handlers
			.filter((handler) => handler.events.includes(eventName))
			.map((handler) => {
				const service = this.registry.subscribe(handler.serviceName);

				return service?.handleEditorEvent?.(eventName, event, { ...context, eventName, handler });
			})
			.find((result) => result === true || result?.handled === true)
			|| false;
	}
}

class EditorViewsMock extends Service {
	constructor(registry) {
		super('editor-views', registry);
		this.implement(['requestView', 'closeView']);
		this.closedViews = [];
		this.requestedViews = [];
	}

	requestView(name, props) {
		this.requestedViews.push({ name, props });
		return true;
	}

	closeView(name) {
		this.closedViews.push(name);
		return true;
	}
}

class EditorLayoutMock extends Service {
	constructor(registry) {
		super('editor-layout', registry);
		this.implement(['registerWideContentContributor']);
		this.wideContentContributors = [];
	}

	registerWideContentContributor(contributor) {
		this.wideContentContributors.push(contributor);
		return () => true;
	}
}

class DocumentFormatMock extends Service {
	constructor(registry) {
		super('document-format', registry);
		this.implement(['getContentWidth']);
		this.contentWidth = null;
	}

	getContentWidth() {
		return this.contentWidth;
	}
}

function buildSplitTableDom() {
	const table = document.createElement('table');
	const body = document.createElement('tbody');
	const cells = [];

	table.dataset.tableId = 'table-1';
	for (let rowIndex = 0; rowIndex < 3; rowIndex++) {
		const row = document.createElement('tr');

		for (let columnIndex = 0; columnIndex < 2; columnIndex++) {
			const wrapper = document.createElement('td');
			const cell = document.createElement('div');

			cell.className = 'ql-table-cell-inner';
			cell.dataset.tableId = 'table-1';
			cell.dataset.rowId = `row-${rowIndex + 1}`;
			cell.dataset.colId = `col-${columnIndex + 1}`;
			wrapper.appendChild(cell);
			row.appendChild(wrapper);
			cells.push(cell);
		}
		body.appendChild(row);
	}
	table.appendChild(body);

	return {
		cell: cells[2],
		cells,
		firstCell: cells[0],
		table,
	};
}

function buildSplitTableOps() {
	return [
		{ insert: { 'table-up-col': { colId: 'col-1', full: false, tableId: 'table-1', width: 100 } } },
		{ insert: { 'table-up-col': { colId: 'col-2', full: false, tableId: 'table-1', width: 120 } } },
		{ insert: 'A1' },
		{ attributes: { 'table-up-cell-inner': cellValue('row-1', 'col-1') }, insert: '\n' },
		{ insert: 'A2' },
		{ attributes: { 'table-up-cell-inner': cellValue('row-1', 'col-2') }, insert: '\n' },
		{ insert: 'B1' },
		{ attributes: { 'table-up-cell-inner': cellValue('row-2', 'col-1') }, insert: '\n' },
		{ insert: 'B2' },
		{ attributes: { 'table-up-cell-inner': cellValue('row-2', 'col-2') }, insert: '\n' },
		{ insert: 'C1' },
		{ attributes: { 'table-up-cell-inner': cellValue('row-3', 'col-1') }, insert: '\n' },
		{ insert: 'C2' },
		{ attributes: { 'table-up-cell-inner': cellValue('row-3', 'col-2') }, insert: '\n' },
		{ insert: 'after\n' },
	];
}

function cellValue(rowId, colId) {
	return {
		colId,
		colspan: 1,
		rowId,
		rowspan: 1,
		tableId: 'table-1',
	};
}

describe('TableController', function() {
	let documentFormat;
	let editorSurface;
	let editorInteractions;
	let editorLayout;
	let editorViews;
	let mainMenu;
	let tableController;

	beforeEach(function() {
		const registry = new Registry();

		mainMenu = new MainMenuService(registry);
		mainMenu.start();
		documentFormat = new DocumentFormatMock(registry);
		editorSurface = new EditorSurfaceMock(registry);
		editorInteractions = new EditorInteractionsMock(registry);
		editorLayout = new EditorLayoutMock(registry);
		editorViews = new EditorViewsMock(registry);
		tableController = new TableController(registry);
		mainMenu.addMainItem(200, 'insert', 'app.menu.insert');
		tableController.ready();
	});

	it('registers a table command in the insert menu', function() {
		const item = mainMenu.getItem('insert', 'table.menu.insert');

		expect(item).toBeTruthy();
		expect(item.enabled).toBeTrue();
	});

	it('registers table content as a generic wide-content layout contribution', function() {
		expect(editorLayout.wideContentContributors).toEqual([
			jasmine.objectContaining({
				id: 'table.wide-content',
				padding: 24,
				selector: jasmine.stringMatching(/ql-table-wrapper/),
			}),
		]);
	});

	it('inserts a two-column table from the insert menu', function() {
		mainMenu.selectItem('insert', 'table.menu.insert');

		expect(editorSurface.insertedTables).toEqual([
			{ rows: 1, columns: 2, source: 'user' },
		]);
		expect(editorSurface.requestedModuleName).toBe(TableUp.moduleName);
		expect(editorSurface.updatedSources).toEqual(['user']);
	});

	it('gates TableUp root mousedown selection through the table controller', function() {
		const calls = [];
		const root = document.createElement('div');
		const tableSelection = {
			tableSelectMouseDownHandler(event) {
				calls.push({ event, method: 'original', thisValue: this });
			},
		};
		const original = tableSelection.tableSelectMouseDownHandler;

		editorSurface.editorRoot = root;
		editorSurface.tableModule = {
			getModule() {
				return tableSelection;
			},
		};

		expect(tableController.attachTableSelectionMouseDownGate()).toBeTrue();
		const gated = tableSelection.tableSelectMouseDownHandler;

		expect(gated).not.toBe(original);

		root.dispatchEvent(new MouseEvent('mousedown', {
			bubbles: true,
		}));
		const suppressedEvent = new MouseEvent('mousedown', {
			bubbles: true,
		});

		suppressedEvent.mnSuppressNativeSelection = true;
		root.dispatchEvent(suppressedEvent);

		expect(calls.length).toBe(1);
		expect(calls[0].method).toBe('original');
		expect(calls[0].thisValue).toBe(tableSelection);
		expect(tableController.detachTableSelectionMouseDownGate()).toBeTrue();
		expect(tableSelection.tableSelectMouseDownHandler).toBe(original);

		root.dispatchEvent(new MouseEvent('mousedown', {
			bubbles: true,
		}));

		expect(calls.length).toBe(2);
	});

	it('replaces the TableUp mousedown gate when the active editor surface changes', function() {
		const firstRoot = document.createElement('div');
		const secondRoot = document.createElement('div');
		const firstSelection = {
			tableSelectMouseDownHandler() {},
		};
		const secondSelection = {
			tableSelectMouseDownHandler() {},
		};
		const firstOriginal = firstSelection.tableSelectMouseDownHandler;
		const secondOriginal = secondSelection.tableSelectMouseDownHandler;

		editorSurface.editorRoot = firstRoot;
		editorSurface.tableModule = {
			getModule() {
				return firstSelection;
			},
		};

		expect(tableController.attachTableSelectionMouseDownGate()).toBeTrue();
		expect(firstSelection.tableSelectMouseDownHandler).not.toBe(firstOriginal);

		editorSurface.editorRoot = secondRoot;
		editorSurface.tableModule = {
			getModule() {
				return secondSelection;
			},
		};

		expect(tableController.attachTableSelectionMouseDownGate()).toBeTrue();
		expect(firstSelection.tableSelectMouseDownHandler).toBe(firstOriginal);
		expect(secondSelection.tableSelectMouseDownHandler).not.toBe(secondOriginal);
	});

	it('returns false for table context menu commands without a table module', function() {
		const context = {
			selectionShape: 'column',
		};

		expect(tableController.handleContextMenuCommand('delete-column', context)).toBeFalse();
	});

	it('routes table context menu commands to TableUp operations', function() {
		const calls = [];
		const firstCell = { id: 'first-cell' };
		const secondCell = { id: 'second-cell' };
		const tableModule = {
			appendCol(cells, isRight) {
				calls.push({ cells, isRight, method: 'appendCol' });
			},
			appendRow(cells, isDown) {
				calls.push({ cells, isDown, method: 'appendRow' });
			},
			deleteTable(cells) {
				calls.push({ cells, method: 'deleteTable' });
			},
			removeCol(cells) {
				calls.push({ cells, method: 'removeCol' });
			},
			removeRow(cells) {
				calls.push({ cells, method: 'removeRow' });
			},
		};
		const context = {
			cells: [firstCell, secondCell],
			tableModule,
		};

		expect(tableController.handleContextMenuCommand('insert-row-above', context)).toBeTrue();
		expect(tableController.handleContextMenuCommand('insert-row-below', context)).toBeTrue();
		expect(tableController.handleContextMenuCommand('insert-column-left', context)).toBeTrue();
		expect(tableController.handleContextMenuCommand('insert-column-right', context)).toBeTrue();
		expect(tableController.handleContextMenuCommand('delete-row', context)).toBeTrue();
		expect(tableController.handleContextMenuCommand('delete-column', context)).toBeTrue();
		expect(tableController.handleContextMenuCommand('delete-table', context)).toBeTrue();
		expect(calls).toEqual([
			{ cells: [firstCell, secondCell], isDown: false, method: 'appendRow' },
			{ cells: [firstCell, secondCell], isDown: true, method: 'appendRow' },
			{ cells: [firstCell, secondCell], isRight: false, method: 'appendCol' },
			{ cells: [firstCell, secondCell], isRight: true, method: 'appendCol' },
			{ cells: [firstCell, secondCell], method: 'removeRow' },
			{ cells: [firstCell, secondCell], method: 'removeCol' },
			{ cells: [firstCell, secondCell], method: 'deleteTable' },
		]);
		expect(tableController.lastContextMenuCommand).toEqual({
			commandId: 'delete-table',
			context,
		});
	});

	it('fits a table to the document-format content width while preserving column differences', function() {
		const calls = [];
		const editorRoot = document.createElement('div');
		const table = document.createElement('table');
		const colgroup = document.createElement('colgroup');
		const columns = [100, 150, 200].map((width) => {
			const column = document.createElement('col');

			column.setAttribute('width', `${width}px`);
			colgroup.appendChild(column);
			return column;
		});

		documentFormat.contentWidth = 600;
		editorRoot.appendChild(table);
		table.appendChild(colgroup);
		editorRoot.getBoundingClientRect = () => ({
			width: 900,
		});

		expect(tableController.handleContextMenuCommand('fit-table-to-width', {
			editorRoot,
			quill: {
				update(source) {
					calls.push({ method: 'update', source });
				},
			},
			table,
			tableModule: {},
		})).toBeTrue();

		expect(columns.map((column) => column.getAttribute('width'))).toEqual([
			'150px',
			'200px',
			'250px',
		]);
		expect(table.style.width).toBe('600px');
		expect(calls).toEqual([
			{ method: 'update', source: 'user' },
		]);
	});

	it('ignores editor DOM width when fitting to document-format content width', function() {
		const editorRoot = document.createElement('div');
		const table = document.createElement('table');
		const colgroup = document.createElement('colgroup');
		const columns = [100, 150, 200].map((width) => {
			const column = document.createElement('col');

			column.setAttribute('width', `${width}px`);
			colgroup.appendChild(column);
			return column;
		});

		documentFormat.contentWidth = 624;
		editorRoot.appendChild(table);
		table.appendChild(colgroup);
		editorRoot.getBoundingClientRect = () => ({
			width: 900,
		});

		expect(tableController.handleContextMenuCommand('fit-table-to-width', {
			editorRoot,
			getContentWidth: () => 720,
			table,
			tableModule: {},
		})).toBeTrue();

		expect(columns.map((column) => column.getAttribute('width'))).toEqual([
			'158px',
			'208px',
			'258px',
		]);
		expect(table.style.width).toBe('624px');
	});

	it('fits a table to the document-format content width even when the table has a layout offset', function() {
		const contentHost = document.createElement('div');
		const table = document.createElement('table');
		const colgroup = document.createElement('colgroup');
		const columns = [100, 150, 200].map((width) => {
			const column = document.createElement('col');

			column.setAttribute('width', `${width}px`);
			colgroup.appendChild(column);
			return column;
		});

		documentFormat.contentWidth = 600;
		contentHost.className = 'mn-document-content';
		contentHost.appendChild(table);
		table.appendChild(colgroup);
		contentHost.getBoundingClientRect = () => ({
			left: 10,
		});
		table.getBoundingClientRect = () => ({
			left: 40,
		});

		expect(tableController.handleContextMenuCommand('fit-table-to-width', {
			table,
			tableModule: {},
		})).toBeTrue();

		expect(columns.map((column) => column.getAttribute('width'))).toEqual([
			'150px',
			'200px',
			'250px',
		]);
		expect(table.style.width).toBe('600px');
	});

	it('does not fit a table when document-format content width is unavailable', function() {
		const editorRoot = document.createElement('div');
		const table = document.createElement('table');
		const colgroup = document.createElement('colgroup');
		const columns = [100, 150, 200].map((width) => {
			const column = document.createElement('col');

			column.setAttribute('width', `${width}px`);
			colgroup.appendChild(column);
			return column;
		});

		editorRoot.appendChild(table);
		table.appendChild(colgroup);
		editorRoot.getBoundingClientRect = () => ({
			width: 600,
		});

		expect(tableController.handleContextMenuCommand('fit-table-to-width', {
			editorRoot,
			table,
			tableModule: {},
		})).toBeFalse();

		expect(columns.map((column) => column.getAttribute('width'))).toEqual([
			'100px',
			'150px',
			'200px',
		]);
		expect(table.style.width).toBe('');
	});

	it('distributes table columns without changing the table width', function() {
		const calls = [];
		const table = document.createElement('table');
		const colgroup = document.createElement('colgroup');
		const columns = [120, 180, 300].map((width) => {
			const column = document.createElement('col');

			column.setAttribute('width', `${width}px`);
			colgroup.appendChild(column);
			return column;
		});

		table.style.width = '600px';
		table.appendChild(colgroup);

		expect(tableController.handleContextMenuCommand('distribute-table-columns', {
			quill: {
				update(source) {
					calls.push({ method: 'update', source });
				},
			},
			table,
			tableModule: {},
		})).toBeTrue();

		expect(columns.map((column) => column.getAttribute('width'))).toEqual([
			'200px',
			'200px',
			'200px',
		]);
		expect(table.style.width).toBe('600px');
		expect(calls).toEqual([
			{ method: 'update', source: 'user' },
		]);
	});

	it('splits a table into two table deltas at the selected row', function() {
		const updates = [];
		const { cell, table } = buildSplitTableDom();
		const quill = {
			getContents: () => ({
				ops: buildSplitTableOps(),
			}),
			update(source) {
				updates.push({ method: 'update', source });
			},
			updateContents(delta, source) {
				updates.push({ delta, method: 'updateContents', source });
			},
		};

		expect(tableController.handleContextMenuCommand('split-table-above', {
			cell,
			quill,
			table,
			tableModule: {},
		})).toBeTrue();

		const changeOps = updates[0].delta.ops;
		const cellOps = changeOps.filter((op) => op.attributes?.['table-up-cell-inner']);
		const splitTableIds = cellOps.map((op) => op.attributes['table-up-cell-inner'].tableId);

		expect(updates[0].source).toBe('user');
		expect(changeOps.some((op) => op.delete > 0)).toBeTrue();
		expect(new Set(splitTableIds).size).toBe(2);
		expect(splitTableIds.slice(0, 2)).toEqual([splitTableIds[0], splitTableIds[0]]);
		expect(splitTableIds.slice(2)).toEqual([
			splitTableIds[2],
			splitTableIds[2],
			splitTableIds[2],
			splitTableIds[2],
		]);
		expect(cellOps.map((op) => op.insert)).toEqual(['\n', '\n', '\n', '\n', '\n', '\n']);
		expect(updates[1]).toEqual({ method: 'update', source: 'user' });
	});

	it('splits a table below the selected row', function() {
		const updates = [];
		const { cell, table } = buildSplitTableDom();
		const quill = {
			getContents: () => ({
				ops: buildSplitTableOps(),
			}),
			update() {},
			updateContents(delta, source) {
				updates.push({ delta, source });
			},
		};

		expect(tableController.handleContextMenuCommand('split-table-below', {
			cell,
			quill,
			table,
			tableModule: {},
		})).toBeTrue();

		const cellOps = updates[0].delta.ops.filter((op) => op.attributes?.['table-up-cell-inner']);
		const splitTableIds = cellOps.map((op) => op.attributes['table-up-cell-inner'].tableId);

		expect(new Set(splitTableIds).size).toBe(2);
		expect(splitTableIds.slice(0, 4)).toEqual([
			splitTableIds[0],
			splitTableIds[0],
			splitTableIds[0],
			splitTableIds[0],
		]);
		expect(splitTableIds.slice(4)).toEqual([splitTableIds[4], splitTableIds[4]]);
		expect(updates[0].source).toBe('user');
	});

	it('does not split a table when one side would be empty', function() {
		const updates = [];
		const { firstCell, table } = buildSplitTableDom();
		const quill = {
			getContents: () => ({
				ops: buildSplitTableOps(),
			}),
			updateContents(delta, source) {
				updates.push({ delta, source });
			},
		};

		expect(tableController.handleContextMenuCommand('split-table-above', {
			cell: firstCell,
			quill,
			table,
			tableModule: {},
		})).toBeFalse();
		expect(updates).toEqual([]);
	});

	it('does not split a table through a spanning cell', function() {
		const updates = [];
		const { cell, table } = buildSplitTableDom();
		const ops = buildSplitTableOps();

		ops[3].attributes['table-up-cell-inner'].rowspan = 2;

		const quill = {
			getContents: () => ({
				ops,
			}),
			updateContents(delta, source) {
				updates.push({ delta, source });
			},
		};

		expect(tableController.handleContextMenuCommand('split-table-above', {
			cell,
			quill,
			table,
			tableModule: {},
		})).toBeFalse();
		expect(updates).toEqual([]);
	});


	it('registers table context menu editor interactions', function() {
		expect(editorInteractions.handlers.map((handler) => handler.id)).toContain('table.editor-region');
		expect(editorInteractions.handlers[0].serviceName).toBe('table-controller');
		expect(editorInteractions.handlers[0].selector).toBe('.ql-table, .table-up-table, table');
		expect(editorInteractions.handlers[0].editorReady).toBeTrue();
		expect(editorInteractions.handlers[0].gutterSelectable).toBeTrue();
		expect(editorInteractions.handlers[0].pointSelectable).toBeTrue();
		expect(editorInteractions.handlers[0].pointHitMargin).toEqual({ top: 10 });
		expect(editorInteractions.handlers[0].events).toEqual([
			'contextmenu',
			'gutter-line-select-cancel',
			'gutter-line-select-end',
			'gutter-line-select-move',
			'gutter-line-select-start',
			'keydown',
			'mousedown-capture',
			'pointerdown',
			'pointerleave',
			'pointermove',
			'pointerup',
			'pointercancel',
			'selection-change',
		]);
	});

	it('contributes TableUp registration and module options when the editor is ready', function() {
		const registrations = [];
		const moduleOptions = [];

		expect(tableController.handleEditorReady({
			addQuillModuleOptions(name, options) {
				moduleOptions.push({ name, options });
				return true;
			},
			registerQuillModule(path, value, overwrite) {
				registrations.push({ overwrite, path, value });
				return true;
			},
		})).toBeTrue();

		expect(registrations).toEqual([{
			overwrite: true,
			path: `modules/${TableUp.moduleName}`,
			value: TableUp,
		}]);
		expect(moduleOptions.length).toBe(1);
		expect(moduleOptions[0].name).toBe(TableUp.moduleName);
		expect(moduleOptions[0].options.modules.length).toBe(2);
		expect(moduleOptions[0].options.modules[0].options.selectColor).toBe('var(--mn-selection-color)');
	});

	it('opens a table context menu from a table cell right-click interaction', function() {
		const calls = [];
		const table = document.createElement('table');
		const cell = document.createElement('div');
		const cellBlot = { id: 'cell-blot' };

		cell.className = 'ql-table-cell-inner';
		table.appendChild(cell);

		expect(editorInteractions.dispatch('contextmenu', {
			clientX: 32,
			clientY: 48,
			target: cell,
			preventDefault() {
				calls.push({ method: 'preventDefault' });
			},
			stopPropagation() {
				calls.push({ method: 'stopPropagation' });
			},
		}, {
			findBlot: () => cellBlot,
			getModule: () => null,
		})).toEqual({ handled: true });

		expect(calls).toEqual([
			{ method: 'preventDefault' },
			{ method: 'stopPropagation' },
		]);
		expect(editorViews.requestedViews[0].name).toBe('table.context-menu');
		expect(editorViews.requestedViews[0].props.anchorPosition).toEqual({ left: 32, top: 48 });
		expect(editorViews.requestedViews[0].props.context).toEqual({
			cell,
			cellBlot,
			cells: [cellBlot],
			selectionShape: 'cell',
			table,
			tableModule: null,
		});
	});

	it('uses active table selected cells in the table context menu context', function() {
		const table = document.createElement('table');
		const cell = document.createElement('div');
		const cellBlot = { id: 'cell-blot' };
		const selectedCell = {
			id: 'selected-cell',
			parent: {
				domNode: cell,
			},
		};
		const tableModule = {
			getModule: () => ({
				selectedTds: [selectedCell],
			}),
		};

		cell.className = 'ql-table-cell-inner';
		table.appendChild(cell);
		editorInteractions.dispatch('contextmenu', {
			clientX: 32,
			clientY: 48,
			target: cell,
			preventDefault() {},
			stopPropagation() {},
		}, {
			findBlot: () => cellBlot,
			getModule: () => tableModule,
		});

		expect(editorViews.requestedViews[0].props.context).toEqual({
			cell,
			cellBlot,
			cells: [selectedCell],
			selectionShape: 'cell',
			table,
			tableModule,
		});
	});

	it('opens the table context menu from an empty selected column area', function() {
		const table = document.createElement('table');
		const firstRow = document.createElement('tr');
		const secondRow = document.createElement('tr');
		const firstColumnTop = document.createElement('div');
		const firstColumnBottom = document.createElement('div');
		const secondColumnTop = document.createElement('div');
		const secondColumnBottom = document.createElement('div');
		const selectedTop = {
			id: 'selected-top',
			parent: {
				domNode: firstColumnTop,
			},
		};
		const selectedBottom = {
			id: 'selected-bottom',
			parent: {
				domNode: firstColumnBottom,
			},
		};
		const tableModule = {
			getModule: () => ({
				selectedTds: [selectedTop, selectedBottom],
			}),
		};

		[
			firstColumnTop,
			firstColumnBottom,
			secondColumnTop,
			secondColumnBottom,
		].forEach((cell) => {
			cell.className = 'ql-table-cell-inner';
		});
		firstRow.appendChild(firstColumnTop);
		firstRow.appendChild(secondColumnTop);
		secondRow.appendChild(firstColumnBottom);
		secondRow.appendChild(secondColumnBottom);
		table.appendChild(firstRow);
		table.appendChild(secondRow);

		expect(editorInteractions.dispatch('contextmenu', {
			clientX: 80,
			clientY: 48,
			target: table,
			preventDefault() {},
			stopPropagation() {},
		}, {
			findBlot: () => null,
			getModule: () => tableModule,
		})).toEqual({ handled: true });

		expect(editorViews.requestedViews[0].props.anchorPosition).toEqual({ left: 80, top: 48 });
		expect(editorViews.requestedViews[0].props.context).toEqual({
			cell: firstColumnTop,
			cellBlot: selectedTop,
			cells: [selectedTop, selectedBottom],
			selectionShape: 'column',
			table,
			tableModule,
		});
	});

	it('preserves selected columns when right-clicking their column selection area', function() {
		const calls = [];
		const table = document.createElement('table');
		const firstRow = document.createElement('tr');
		const secondRow = document.createElement('tr');
		const firstColumnTop = document.createElement('div');
		const firstColumnBottom = document.createElement('div');
		const secondColumnTop = document.createElement('div');
		const secondColumnBottom = document.createElement('div');
		const selectedTop = {
			id: 'selected-top',
			parent: {
				domNode: firstColumnTop,
			},
		};
		const selectedBottom = {
			id: 'selected-bottom',
			parent: {
				domNode: firstColumnBottom,
			},
		};
		const tableSelection = {
			hide() {
				calls.push({ method: 'hide' });
			},
			selectedTds: [selectedTop, selectedBottom],
			setSelectedTds(cells) {
				calls.push({ cells, method: 'setSelectedTds' });
				this.selectedTds = cells;
			},
		};
		const tableModule = {
			getModule: () => tableSelection,
		};

		table.getBoundingClientRect = () => ({
			bottom: 90,
			height: 80,
			left: 10,
			right: 110,
			top: 10,
			width: 100,
		});
		[
			firstColumnTop,
			firstColumnBottom,
			secondColumnTop,
			secondColumnBottom,
		].forEach((cell, index) => {
			const column = index % 2;
			const row = Math.floor(index / 2);
			const left = 10 + (column * 50);
			const top = 10 + (row * 35);

			cell.className = 'ql-table-cell-inner';
			cell.getBoundingClientRect = () => ({
				bottom: top + 30,
				height: 30,
				left,
				right: left + 50,
				top,
				width: 50,
			});
		});
		firstRow.appendChild(firstColumnTop);
		firstRow.appendChild(secondColumnTop);
		secondRow.appendChild(firstColumnBottom);
		secondRow.appendChild(secondColumnBottom);
		table.appendChild(firstRow);
		table.appendChild(secondRow);

		expect(editorInteractions.dispatch('mousedown-capture', {
			button: 2,
			clientX: 30,
			clientY: 12,
			target: table,
		}, {
			editorRoot: table,
			findBlot: (cell) => (cell === firstColumnTop ? selectedTop : selectedBottom),
			getIndex: () => 0,
			getModule: () => tableModule,
			target: {
				element: table,
				serviceName: 'table-controller',
			},
			targetServiceName: 'table-controller',
		})).toEqual({
			handled: true,
			suppressBlankTableCellFocus: true,
			suppressNativeSelection: true,
		});
		expect(tableSelection.selectedTds).toEqual([selectedTop, selectedBottom]);
		expect(calls).toEqual([]);

		expect(editorInteractions.dispatch('contextmenu', {
			clientX: 30,
			clientY: 12,
			target: table,
			preventDefault() {},
			stopPropagation() {},
		}, {
			findBlot: () => null,
			getModule: () => tableModule,
		})).toEqual({ handled: true });
		expect(editorViews.requestedViews[0].props.context.selectionShape).toBe('column');
		expect(editorViews.requestedViews[0].props.context.cells).toEqual([selectedTop, selectedBottom]);
	});

	it('opens a table context menu from keyboard context menu interaction', function() {
		const table = document.createElement('table');
		const cell = document.createElement('div');
		const cellBlot = { id: 'cell-blot' };

		cell.className = 'ql-table-cell-inner';
		cell.getBoundingClientRect = () => ({
			bottom: 72,
			left: 24,
			top: 50,
		});
		table.appendChild(cell);

		expect(editorInteractions.dispatch('keydown', {
			key: 'F10',
			shiftKey: true,
			preventDefault() {},
			stopPropagation() {},
		}, {
			findBlot: () => cellBlot,
			getLeaf: () => [],
			getLine: () => [{ domNode: cell }],
			getModule: () => null,
			getSelection: () => ({ index: 0, length: 0 }),
		})).toEqual({ handled: true });

		expect(editorViews.requestedViews[0].props.anchorPosition).toEqual({ left: 24, top: 72 });
		expect(editorViews.requestedViews[0].props.context.cell).toBe(cell);
	});

	it('moves table cell navigation from left to right and top to bottom', function() {
		const calls = [];
		const table = document.createElement('table');
		const firstRow = document.createElement('tr');
		const secondRow = document.createElement('tr');
		const cells = Array.from({ length: 4 }, (_item, index) => {
			const cell = document.createElement('div');

			cell.className = 'ql-table-cell-inner';
			cell.id = `cell-${index}`;
			return cell;
		});

		firstRow.appendChild(cells[0]);
		firstRow.appendChild(cells[1]);
		secondRow.appendChild(cells[2]);
		secondRow.appendChild(cells[3]);
		table.appendChild(firstRow);
		table.appendChild(secondRow);

		const result = editorInteractions.dispatch('keydown', {
			key: 'Tab',
			mnLeadingKeyboardBinding: true,
			preventDefault() {
				calls.push({ method: 'preventDefault' });
			},
			shiftKey: false,
			stopPropagation() {
				calls.push({ method: 'stopPropagation' });
			},
		}, {
			findBlot: (node) => ({ domNode: node }),
			getIndex: (blot) => cells.indexOf(blot.domNode),
			getLeaf: () => [],
			getLine: () => [{ domNode: cells[1] }],
			getModule: () => null,
			getSelection: () => ({ index: 1, length: 0 }),
			quill: {
				focus() {
					calls.push({ method: 'focus' });
				},
			},
			setSelection(index, length, source) {
				calls.push({ index, length, method: 'setSelection', source });
			},
		});

		expect(result).toEqual({
			handled: true,
			result: {
				preventDefault: true,
				stopPropagation: true,
			},
		});
		expect(calls).toEqual([
			{ method: 'focus' },
			{ index: 2, length: 0, method: 'setSelection', source: 'user' },
			{ method: 'preventDefault' },
			{ method: 'stopPropagation' },
		]);
	});

	it('ignores ordinary React tab keydown after the leading Quill binding has handled navigation', function() {
		const table = document.createElement('table');
		const row = document.createElement('tr');
		const firstCell = document.createElement('div');
		const secondCell = document.createElement('div');

		firstCell.className = 'ql-table-cell-inner';
		secondCell.className = 'ql-table-cell-inner';
		row.appendChild(firstCell);
		row.appendChild(secondCell);
		table.appendChild(row);

		expect(editorInteractions.dispatch('keydown', {
			key: 'Tab',
			shiftKey: false,
		}, {
			findBlot: () => {
				throw new Error('ordinary React tab keydown should not move table cells');
			},
			getLeaf: () => [],
			getLine: () => [{ domNode: firstCell }],
			getSelection: () => ({ index: 0, length: 0 }),
		})).toBeFalse();
	});

	it('adds a row when tabbing from the last table cell', function() {
		const calls = [];
		const table = document.createElement('table');
		const row = document.createElement('tr');
		const firstCell = document.createElement('div');
		const lastCell = document.createElement('div');
		const appendedCell = document.createElement('div');
		const lastBlot = { domNode: lastCell };
		const tableModule = {
			appendRow(cells, isDown) {
				const appendedRow = document.createElement('tr');

				calls.push({ cells, isDown, method: 'appendRow' });
				appendedRow.appendChild(appendedCell);
				table.appendChild(appendedRow);
			},
		};

		firstCell.className = 'ql-table-cell-inner';
		lastCell.className = 'ql-table-cell-inner';
		appendedCell.className = 'ql-table-cell-inner';
		row.appendChild(firstCell);
		row.appendChild(lastCell);
		table.appendChild(row);

		expect(editorInteractions.dispatch('keydown', {
			key: 'Tab',
			mnLeadingKeyboardBinding: true,
			preventDefault() {},
			shiftKey: false,
			stopPropagation() {},
		}, {
			findBlot: (node) => (node === lastCell ? lastBlot : { domNode: node }),
			getIndex: (blot) => Array.from(table.querySelectorAll('.ql-table-cell-inner')).indexOf(blot.domNode),
			getLeaf: () => [],
			getLine: () => [{ domNode: lastCell }],
			getModule: () => tableModule,
			getSelection: () => ({ index: 1, length: 0 }),
			quill: {
				focus() {
					calls.push({ method: 'focus' });
				},
				update(source) {
					calls.push({ method: 'update', source });
				},
			},
			setSelection(index, length, source) {
				calls.push({ index, length, method: 'setSelection', source });
			},
		})).toEqual({
			handled: true,
			result: {
				preventDefault: true,
				stopPropagation: true,
			},
		});

		expect(calls).toEqual([
			{ cells: [lastBlot], isDown: true, method: 'appendRow' },
			{ method: 'update', source: 'user' },
			{ method: 'focus' },
			{ index: 2, length: 0, method: 'setSelection', source: 'user' },
		]);
	});

	it('swallows shift-tab from the first table cell', function() {
		const calls = [];
		const table = document.createElement('table');
		const row = document.createElement('tr');
		const firstCell = document.createElement('div');
		const lastCell = document.createElement('div');

		firstCell.className = 'ql-table-cell-inner';
		lastCell.className = 'ql-table-cell-inner';
		row.appendChild(firstCell);
		row.appendChild(lastCell);
		table.appendChild(row);

		expect(editorInteractions.dispatch('keydown', {
			key: 'Tab',
			mnLeadingKeyboardBinding: true,
			preventDefault() {
				calls.push({ method: 'preventDefault' });
			},
			shiftKey: true,
			stopPropagation() {
				calls.push({ method: 'stopPropagation' });
			},
		}, {
			findBlot: () => {
				throw new Error('first-cell shift-tab should not select another cell');
			},
			getLeaf: () => [],
			getLine: () => [{ domNode: firstCell }],
			getModule: () => ({
				appendRow() {
					throw new Error('shift-tab should not add a row');
				},
			}),
			getSelection: () => ({ index: 0, length: 0 }),
		})).toEqual({
			handled: true,
			result: {
				preventDefault: true,
				stopPropagation: true,
			},
		});
		expect(calls).toEqual([
			{ method: 'preventDefault' },
			{ method: 'stopPropagation' },
		]);
	});

	it('passes tab keydown through when the selection is outside a table', function() {
		expect(editorInteractions.dispatch('keydown', {
			key: 'Tab',
			shiftKey: false,
		}, {
			getLeaf: () => [],
			getLine: () => [{ domNode: document.createElement('p') }],
			getSelection: () => ({ index: 0, length: 0 }),
		})).toBeFalse();
	});

	it('does not turn a normal first-row cell click into column selection', function() {
		const table = document.createElement('table');
		const cell = document.createElement('div');

		cell.className = 'ql-table-cell-inner';
		table.getBoundingClientRect = () => ({
			bottom: 80,
			height: 80,
			left: 0,
			right: 120,
			top: 10,
			width: 120,
		});
		cell.getBoundingClientRect = () => ({
			bottom: 54,
			height: 36,
			left: 8,
			right: 112,
			top: 18,
			width: 104,
		});
		table.appendChild(cell);

		expect(editorInteractions.dispatch('pointerdown', {
			clientX: 24,
			clientY: 24,
			target: cell,
		}, {
			editorRoot: table,
			target: {
				element: table,
				serviceName: 'table-controller',
			},
			targetServiceName: 'table-controller',
		})).toBeFalse();
	});

	it('places the caret in a table cell when a plain click lands on blank cell space', function(done) {
		const calls = [];
		const table = document.createElement('table');
		const wrapper = document.createElement('td');
		const cell = document.createElement('div');
		const cellBlot = { domNode: cell };
		const tableSelection = {
			hide() {
				calls.push({ method: 'hide' });
			},
			setSelectedTds(cells) {
				calls.push({ cells, method: 'setSelectedTds' });
			},
		};

		cell.className = 'ql-table-cell-inner';
		document.body.appendChild(table);
		table.getBoundingClientRect = () => ({
			bottom: 80,
			height: 80,
			left: 0,
			right: 120,
			top: 10,
			width: 120,
		});
		cell.getBoundingClientRect = () => ({
			bottom: 54,
			height: 36,
			left: 8,
			right: 112,
			top: 18,
			width: 104,
		});
		wrapper.appendChild(cell);
		table.appendChild(wrapper);

		expect(editorInteractions.dispatch('mousedown-capture', {
			button: 0,
			clientX: 24,
			clientY: 24,
			preventDefault() {
				calls.push({ method: 'preventDefault' });
			},
			target: cell,
		}, {
			editorRoot: table,
			findBlot: (node) => (node === cell ? cellBlot : null),
			getIndex: (blot) => (blot === cellBlot ? 5 : null),
			getLeaf: () => [],
			getLine: () => [{ domNode: document.createElement('p') }],
			getSelection: () => ({ index: 0, length: 0 }),
			getModule: () => ({
				getModule: () => tableSelection,
			}),
			setSelectionWithoutScroll(index, length, source, anchor) {
				calls.push({ anchor, index, length, method: 'setSelectionWithoutScroll', source });
			},
			target: {
				element: table,
				serviceName: 'table-controller',
			},
			targetServiceName: 'table-controller',
		})).toEqual({
			handled: true,
			suppressNativeSelection: true,
		});
		expect(calls).toEqual([
			{ cells: [], method: 'setSelectedTds' },
			{ method: 'hide' },
		]);
		expect(cell.classList.contains('mn-table-cell-focus')).toBeTrue();
		expect(wrapper.classList.contains('mn-table-cell-focus')).toBeTrue();

		window.setTimeout(() => {
			document.body.removeChild(table);
			expect(calls).toEqual([
				{ cells: [], method: 'setSelectedTds' },
				{ method: 'hide' },
				{ method: 'hide' },
				{ anchor: cell, index: 5, length: 0, method: 'setSelectionWithoutScroll', source: 'user' },
			]);
			done();
		}, 40);
	});

	it('scrolls a focused table cell into view when it is clipped', function() {
		const calls = [];
		const scroller = document.createElement('div');
		const table = document.createElement('table');
		const wrapper = document.createElement('td');
		const cell = document.createElement('div');
		const cellBlot = { domNode: cell };

		cell.className = 'ql-table-cell-inner';
		wrapper.appendChild(cell);
		table.appendChild(wrapper);
		scroller.appendChild(table);
		Object.defineProperties(scroller, {
			clientHeight: { value: 100 },
			clientWidth: { value: 100 },
			scrollHeight: { value: 220 },
			scrollWidth: { value: 100 },
		});
		scroller.getBoundingClientRect = () => ({
			bottom: 100,
			height: 100,
			left: 0,
			right: 100,
			top: 0,
			width: 100,
		});
		wrapper.getBoundingClientRect = () => ({
			bottom: 140,
			height: 60,
			left: 0,
			right: 100,
			top: 80,
			width: 100,
		});
		wrapper.scrollIntoView = (options) => {
			calls.push({ method: 'scrollIntoView', options });
		};

		expect(tableController.selectTableCell(cell, {
			findBlot: (node) => (node === cell ? cellBlot : null),
			getIndex: (blot) => (blot === cellBlot ? 7 : null),
			getModule: () => null,
			quill: {
				focus() {},
			},
			setSelection() {},
		})).toBeTrue();
		expect(calls).toEqual([
			{ method: 'scrollIntoView', options: { block: 'nearest', inline: 'nearest' } },
		]);
	});

	it('scrolls a focused table cell after no-scroll selection restoration', function(done) {
		const calls = [];
		const scroller = document.createElement('div');
		const table = document.createElement('table');
		const wrapper = document.createElement('td');
		const cell = document.createElement('div');
		const cellBlot = { domNode: cell };

		cell.className = 'ql-table-cell-inner';
		wrapper.appendChild(cell);
		table.appendChild(wrapper);
		scroller.appendChild(table);
		Object.defineProperties(scroller, {
			clientHeight: { value: 100 },
			clientWidth: { value: 100 },
			scrollHeight: { value: 220 },
			scrollWidth: { value: 100 },
		});
		scroller.getBoundingClientRect = () => ({
			bottom: 100,
			height: 100,
			left: 0,
			right: 100,
			top: 0,
			width: 100,
		});
		wrapper.getBoundingClientRect = () => ({
			bottom: 140,
			height: 60,
			left: 0,
			right: 100,
			top: 80,
			width: 100,
		});
		wrapper.scrollIntoView = (options) => {
			calls.push({ method: 'scrollIntoView', options });
		};

		expect(tableController.selectTableCell(cell, {
			findBlot: (node) => (node === cell ? cellBlot : null),
			getIndex: (blot) => (blot === cellBlot ? 7 : null),
			getModule: () => null,
			setSelectionWithoutScroll() {
				window.setTimeout(() => calls.push({ method: 'restoreScrollSnapshots' }), 0);
			},
		})).toBeTrue();
		expect(calls).toEqual([]);

		window.setTimeout(() => {
			expect(calls).toEqual([
				{ method: 'restoreScrollSnapshots' },
				{ method: 'scrollIntoView', options: { block: 'nearest', inline: 'nearest' } },
			]);
			done();
		}, 40);
	});

	it('does not scroll a focused table cell that is fully visible', function() {
		const calls = [];
		const scroller = document.createElement('div');
		const table = document.createElement('table');
		const wrapper = document.createElement('td');
		const cell = document.createElement('div');
		const cellBlot = { domNode: cell };

		cell.className = 'ql-table-cell-inner';
		wrapper.appendChild(cell);
		table.appendChild(wrapper);
		scroller.appendChild(table);
		Object.defineProperties(scroller, {
			clientHeight: { value: 100 },
			clientWidth: { value: 100 },
			scrollHeight: { value: 220 },
			scrollWidth: { value: 100 },
		});
		scroller.getBoundingClientRect = () => ({
			bottom: 100,
			height: 100,
			left: 0,
			right: 100,
			top: 0,
			width: 100,
		});
		wrapper.getBoundingClientRect = () => ({
			bottom: 80,
			height: 60,
			left: 0,
			right: 100,
			top: 20,
			width: 100,
		});
		wrapper.scrollIntoView = (options) => {
			calls.push({ method: 'scrollIntoView', options });
		};

		expect(tableController.selectTableCell(cell, {
			findBlot: (node) => (node === cell ? cellBlot : null),
			getIndex: (blot) => (blot === cellBlot ? 7 : null),
			getModule: () => null,
			quill: {
				focus() {},
			},
			setSelection() {},
		})).toBeTrue();
		expect(calls).toEqual([]);
	});

	it('clears table cell focus when the editor selection leaves the focused cell', function() {
		const table = document.createElement('table');
		const wrapper = document.createElement('td');
		const cell = document.createElement('div');
		const outside = document.createElement('p');
		const cellBlot = { domNode: cell };

		cell.className = 'ql-table-cell-inner';
		wrapper.appendChild(cell);
		table.appendChild(wrapper);

		expect(tableController.selectTableCell(cell, {
			findBlot: (node) => (node === cell ? cellBlot : null),
			getIndex: (blot) => (blot === cellBlot ? 7 : null),
			getModule: () => null,
			setSelectionWithoutScroll() {},
		})).toBeTrue();
		expect(wrapper.classList.contains('mn-table-cell-focus')).toBeTrue();

		expect(tableController.handleEditorSelectionChange({
			getLeaf: () => [],
			getLine: () => [{ domNode: outside }],
			getSelection: () => ({ index: 10, length: 0 }),
		})).toBeFalse();
		expect(cell.classList.contains('mn-table-cell-focus')).toBeFalse();
		expect(wrapper.classList.contains('mn-table-cell-focus')).toBeFalse();
	});

	it('focuses a table cell when the editor selection enters it', function() {
		const table = document.createElement('table');
		const wrapper = document.createElement('td');
		const cell = document.createElement('div');
		const paragraph = document.createElement('p');
		const text = document.createTextNode('A');

		cell.className = 'ql-table-cell-inner';
		paragraph.appendChild(text);
		cell.appendChild(paragraph);
		wrapper.appendChild(cell);
		table.appendChild(wrapper);

		expect(tableController.handleEditorSelectionChange({
			getLeaf: () => [{ domNode: text }],
			getLine: () => [{ domNode: paragraph }],
			getSelection: () => ({ index: 7, length: 0 }),
		})).toBeFalse();
		expect(cell.classList.contains('mn-table-cell-focus')).toBeTrue();
		expect(wrapper.classList.contains('mn-table-cell-focus')).toBeTrue();
	});

	it('keeps table cell focus when the editor selection stays inside the focused cell', function() {
		const table = document.createElement('table');
		const wrapper = document.createElement('td');
		const cell = document.createElement('div');
		const paragraph = document.createElement('p');
		const cellBlot = { domNode: cell };

		cell.className = 'ql-table-cell-inner';
		cell.appendChild(paragraph);
		wrapper.appendChild(cell);
		table.appendChild(wrapper);

		expect(tableController.selectTableCell(cell, {
			findBlot: (node) => (node === cell ? cellBlot : null),
			getIndex: (blot) => (blot === cellBlot ? 7 : null),
			getModule: () => null,
			setSelectionWithoutScroll() {},
		})).toBeTrue();

		expect(tableController.handleEditorSelectionChange({
			getLeaf: () => [],
			getLine: () => [{ domNode: paragraph }],
			getSelection: () => ({ index: 7, length: 0 }),
		})).toBeFalse();
		expect(cell.classList.contains('mn-table-cell-focus')).toBeTrue();
		expect(wrapper.classList.contains('mn-table-cell-focus')).toBeTrue();
	});

	it('places the caret after a music embed when a table cell embed is clicked', function(done) {
		const calls = [];
		const table = document.createElement('table');
		const cell = document.createElement('div');
		const embed = document.createElement('span');
		const caption = document.createElement('div');
		const embedBlot = {
			length: () => 1,
		};
		const tableSelection = {
			hide() {
				calls.push({ method: 'hide' });
			},
			setSelectedTds(cells) {
				calls.push({ cells, method: 'setSelectedTds' });
			},
		};

		cell.className = 'ql-table-cell-inner';
		embed.className = 'music-keyboard-embed';
		caption.className = 'music-embed-caption';
		embed.appendChild(caption);
		cell.appendChild(embed);
		table.appendChild(cell);
		document.body.appendChild(table);

		expect(editorInteractions.dispatch('mousedown-capture', {
			button: 0,
			target: caption,
		}, {
			editorRoot: table,
			findBlot: (node) => (node === embed ? embedBlot : null),
			getIndex: (blot) => (blot === embedBlot ? 10 : null),
			getLeaf: () => [],
			getLine: () => [{ domNode: document.createElement('p') }],
			getModule: () => ({
				getModule: () => tableSelection,
			}),
			getSelection: () => ({ index: 0, length: 0 }),
			setSelectionWithoutScroll(index, length, source, anchor) {
				calls.push({ anchor, index, length, method: 'setSelectionWithoutScroll', source });
			},
			target: {
				element: table,
				serviceName: 'table-controller',
			},
			targetServiceName: 'table-controller',
		})).toEqual({
			handled: true,
			suppressNativeSelection: true,
		});

		window.setTimeout(() => {
			document.body.removeChild(table);
			expect(calls).toEqual([
				{ cells: [], method: 'setSelectedTds' },
				{ method: 'hide' },
				{ method: 'hide' },
				{ anchor: embed, index: 11, length: 0, method: 'setSelectionWithoutScroll', source: 'user' },
			]);
			done();
		}, 40);
	});

	it('does not force table-cell focus for text cursor targets', function(done) {
		const calls = [];
		const table = document.createElement('table');
		const wrapper = document.createElement('td');
		const cell = document.createElement('div');
		const paragraph = document.createElement('p');
		const text = document.createTextNode('A');
		const tableSelection = {
			hide() {
				calls.push({ method: 'hide' });
			},
			setSelectedTds(cells) {
				calls.push({ cells, method: 'setSelectedTds' });
			},
		};

		cell.className = 'ql-table-cell-inner';
		paragraph.appendChild(text);
		cell.appendChild(paragraph);
		wrapper.appendChild(cell);
		table.appendChild(wrapper);
		document.body.appendChild(table);

		expect(editorInteractions.dispatch('mousedown-capture', {
			button: 0,
			target: text,
		}, {
			editorRoot: table,
			findBlot() {
				throw new Error('text cursor target should not force Quill selection');
			},
			getModule: () => ({
				getModule: () => tableSelection,
			}),
			setSelectionWithoutScroll() {
				throw new Error('text cursor target should not force Quill selection');
			},
			target: {
				element: table,
				serviceName: 'table-controller',
			},
			targetServiceName: 'table-controller',
		})).toEqual({
			handled: true,
			suppressNativeSelection: true,
		});
		expect(cell.classList.contains('mn-table-cell-focus')).toBeTrue();
		expect(wrapper.classList.contains('mn-table-cell-focus')).toBeTrue();

		window.setTimeout(() => {
			document.body.removeChild(table);
			expect(calls).toEqual([
				{ cells: [], method: 'setSelectedTds' },
				{ method: 'hide' },
			]);
			done();
		}, 40);
	});

	it('lets intentional table selection gestures reach the selection handler', function() {
		const calls = [];
		const table = document.createElement('table');
		const row = document.createElement('tr');
		const cell = document.createElement('div');
		const cellBlot = {
			length: () => 1,
		};

		cell.className = 'ql-table-cell-inner';
		table.getBoundingClientRect = () => ({
			bottom: 80,
			height: 80,
			left: 0,
			right: 120,
			top: 10,
			width: 120,
		});
		cell.getBoundingClientRect = () => ({
			bottom: 54,
			height: 36,
			left: 8,
			right: 112,
			top: 18,
			width: 104,
		});
		row.appendChild(cell);
		table.appendChild(row);

		expect(editorInteractions.dispatch('mousedown-capture', {
			button: 0,
			clientX: 24,
			clientY: 10,
			target: cell,
		}, {
			editorRoot: table,
			findBlot: () => cellBlot,
			getIndex: () => 4,
			getModule: () => ({
				getModule: () => ({
					hide() {
						calls.push({ method: 'hide' });
					},
					setSelectedTds(cells) {
						calls.push({ cells, method: 'setSelectedTds' });
					},
				}),
			}),
			target: {
				element: table,
				serviceName: 'table-controller',
			},
			targetServiceName: 'table-controller',
		})).toBeFalse();
		expect(calls).toEqual([]);
	});

	it('selects the second column and extends selection while dragging', function() {
		const table = document.createElement('table');
		const rows = [document.createElement('tr'), document.createElement('tr')];
		const cells = Array.from({ length: 6 }, () => document.createElement('td'));
		const inners = cells.map(() => document.createElement('div'));
		const blots = cells.map((cell, index) => ({
			id: `cell-${index}`,
			length: () => 1,
			parent: { domNode: cell },
		}));
		const selectedCalls = [];
		const tableSelection = {
			setSelectedTds(selectedCells) {
				selectedCalls.push({
					cells: selectedCells.map((cell) => cell.id),
					method: 'setSelectedTds',
				});
				this.selectedTds = selectedCells;
			},
			setSelectionTable(selectedTable) {
				selectedCalls.push({ method: 'setSelectionTable', table: selectedTable });
				this.table = selectedTable;
			},
			show() {
				selectedCalls.push({ method: 'show' });
			},
		};
		const context = {
			editorRoot: {
				getBoundingClientRect: () => ({
					left: 0,
					top: 0,
				}),
			},
			findBlot: (cell) => blots[inners.indexOf(cell)],
			getIndex: (blot) => blots.indexOf(blot),
			getModule: () => ({
				getModule: () => tableSelection,
			}),
			setSelection() {},
			target: {
				element: table,
				serviceName: 'table-controller',
			},
			targetServiceName: 'table-controller',
		};

		table.getBoundingClientRect = () => ({
			bottom: 90,
			height: 80,
			left: 10,
			right: 160,
			top: 10,
			width: 150,
		});
		cells.forEach((cell, index) => {
			const column = index % 3;
			const row = Math.floor(index / 3);
			const left = 10 + (column * 50);
			const top = 10 + (row * 35);

			cell.getBoundingClientRect = () => ({
				bottom: top + 30,
				height: 30,
				left,
				right: left + 50,
				top,
				width: 50,
			});
			inners[index].className = 'ql-table-cell-inner';
			inners[index].getBoundingClientRect = () => ({
				bottom: top + 30,
				height: 30,
				left,
				right: left + 50,
				top,
				width: 50,
			});
			cell.appendChild(inners[index]);
			rows[row].appendChild(cell);
		});
		rows.forEach((row) => table.appendChild(row));

		expect(editorInteractions.dispatch('pointerdown', {
			clientX: 75,
			clientY: 15,
			preventDefault() {},
			stopPropagation() {},
			target: table,
		}, context)).toEqual({
			capturePointer: true,
			handled: true,
			preventDefault: true,
			stopPropagation: true,
		});
		expect(tableSelection.selectedTds.map((cell) => cell.id)).toEqual(['cell-1', 'cell-4']);

		expect(editorInteractions.dispatch('pointermove', {
			clientX: 125,
			clientY: 15,
			preventDefault() {},
			target: table,
		}, context)).toEqual({
			handled: true,
			preventDefault: true,
		});
		expect(tableSelection.selectedTds.map((cell) => cell.id)).toEqual(['cell-1', 'cell-2', 'cell-4', 'cell-5']);
		expect(selectedCalls.map((call) => call.method)).toEqual([
			'setSelectionTable',
			'setSelectedTds',
			'show',
			'setSelectionTable',
			'setSelectedTds',
			'show',
		]);
	});

	it('resolves table cells from text-node event targets', function() {
		const cell = document.createElement('div');
		const paragraph = document.createElement('p');
		const text = document.createTextNode('A');

		cell.className = 'ql-table-cell-inner';
		paragraph.appendChild(text);
		cell.appendChild(paragraph);

		expect(tableController.getTableCellInnerFromNode(text)).toBe(cell);
	});

	it('resolves table cells from table cell wrapper event targets', function() {
		const wrapper = document.createElement('td');
		const cell = document.createElement('div');
		const embed = document.createElement('span');

		cell.className = 'ql-table-cell-inner';
		embed.className = 'music-keyboard-embed';
		wrapper.appendChild(cell);
		cell.appendChild(embed);

		expect(tableController.getTableCellInnerFromNode(wrapper)).toBe(cell);
		expect(tableController.getTableCellInnerFromNode(embed)).toBe(cell);
	});

	it('selects a table row from a gutter selection interaction', function() {
		const table = document.createElement('table');
		const row = document.createElement('tr');
		const firstOuterCell = document.createElement('td');
		const secondOuterCell = document.createElement('td');
		const firstCell = document.createElement('div');
		const secondCell = document.createElement('div');
		const firstBlot = {
			id: 'first-blot',
			length: () => 1,
			parent: { domNode: firstOuterCell },
		};
		const secondBlot = {
			id: 'second-blot',
			length: () => 1,
			parent: { domNode: secondOuterCell },
		};
		const selectedCalls = [];
		const tableSelection = {
			setSelectedTds(cells) {
				selectedCalls.push({ cells, method: 'setSelectedTds' });
				this.selectedTds = cells;
			},
			setSelectionTable(selectedTable) {
				selectedCalls.push({ method: 'setSelectionTable', table: selectedTable });
				this.table = selectedTable;
			},
			show() {
				selectedCalls.push({ method: 'show' });
			},
		};

		[firstOuterCell, secondOuterCell].forEach((cell, index) => {
			cell.getBoundingClientRect = () => ({
				bottom: 34,
				height: 28,
				left: 6 + (index * 48),
				right: 54 + (index * 48),
				top: 6,
				width: 48,
			});
			row.appendChild(cell);
		});
		[firstCell, secondCell].forEach((cell, index) => {
			cell.className = 'ql-table-cell-inner';
			cell.getBoundingClientRect = () => ({
				bottom: 30,
				height: 20,
				left: 10 + (index * 40),
				right: 50 + (index * 40),
				top: 10,
				width: 40,
			});
		});
		firstOuterCell.appendChild(firstCell);
		secondOuterCell.appendChild(secondCell);
		row.getBoundingClientRect = () => ({
			bottom: 30,
			height: 20,
			top: 10,
		});
		table.appendChild(row);

		expect(editorInteractions.dispatch('gutter-line-select-start', {
			clientY: 20,
			preventDefault() {},
			stopPropagation() {},
		}, {
			editorRoot: {
				getBoundingClientRect: () => ({
					left: 4,
					top: 5,
				}),
			},
			findBlot: (cell) => (cell === firstCell ? firstBlot : secondBlot),
			getIndex: (blot) => (blot === firstBlot ? 4 : 5),
			getModule: () => ({
				getModule: () => tableSelection,
			}),
			lineHit: {
				point: {
					clientY: 20,
				},
			},
			target: {
				element: table,
				serviceName: 'table-controller',
			},
			targetServiceName: 'table-controller',
		})).toEqual({
			handled: true,
			preventDefault: true,
			stopPropagation: true,
		});

		expect(selectedCalls).toEqual([
			{ method: 'setSelectionTable', table },
			{ cells: [firstBlot, secondBlot], method: 'setSelectedTds' },
			{ method: 'show' },
		]);
		expect(tableSelection.boundary).toEqual({
			height: 28,
			width: 96,
			x: 2,
			y: 1,
		});
	});
});
