/* global describe it expect beforeEach */

import { Registry, Service } from '@polylith/core';

import MainMenuService from '../../app/main-menu.js';
import TableController from '../controller.js';

class EditorSurfaceMock extends Service {
	constructor(registry) {
		super('editor-surface', registry);
		this.implement(['insertTable']);
		this.insertedTables = [];
	}

	insertTable(rows, columns) {
		this.insertedTables.push({ columns, rows });
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

describe('TableController', function() {
	let editorSurface;
	let editorInteractions;
	let editorViews;
	let mainMenu;
	let tableController;

	beforeEach(function() {
		const registry = new Registry();

		mainMenu = new MainMenuService(registry);
		mainMenu.start();
		editorSurface = new EditorSurfaceMock(registry);
		editorInteractions = new EditorInteractionsMock(registry);
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

	it('inserts a two-column table from the insert menu', function() {
		mainMenu.selectItem('insert', 'table.menu.insert');

		expect(editorSurface.insertedTables).toEqual([
			{ rows: 1, columns: 2 },
		]);
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

	it('fits a table to the available editor width while preserving column differences', function() {
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

		editorRoot.appendChild(table);
		table.appendChild(colgroup);
		editorRoot.getBoundingClientRect = () => ({
			width: 600,
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

	it('splits a table above and below the selected row range', function() {
		const calls = [];
		const wrapperNode = document.createElement('div');
		wrapperNode.className = 'ql-table-wrapper';
		const parent = {
			insertBefore(block, ref) {
				calls.push({ block, method: 'insertBefore', ref });
			},
		};
		const newTables = [20, 40].map((offset, index) => {
			const domNode = document.createElement('table');
			const bodyNode = document.createElement('tbody');
			const rowNode = document.createElement('tr');
			const cellNode = document.createElement('td');
			const tableBlot = {
				children: {
					forEach(callback) {
						this.items.forEach(callback);
					},
					head: null,
					items: [],
				},
				domNode,
				offset(parentBlot) {
					return parentBlot === wrapper ? 200 + (index * 200) : -1;
				},
				insertBefore(child, ref) {
					calls.push({ child, method: 'insertTableChild', ref, table: tableBlot });
					this.children.items.unshift(child);
					this.children.head = child;
					this.domNode.insertBefore(child.domNode, this.domNode.firstChild);
				},
			};

			domNode.dataset.tableId = 'original-table';
			bodyNode.dataset.tableId = 'original-table';
			rowNode.dataset.tableId = 'original-table';
			cellNode.dataset.tableId = 'original-table';
			rowNode.appendChild(cellNode);
			bodyNode.appendChild(rowNode);
			domNode.appendChild(bodyNode);
			return { offset, tableBlot };
		});
		const newWrappers = [200, 400].map((offset, index) => {
			const domNode = document.createElement('div');

			domNode.dataset.tableId = 'original-table';
			domNode.appendChild(newTables[index].tableBlot.domNode);
			return { domNode, offset };
		});
		const wrapper = {
			domNode: wrapperNode,
			next: null,
			parent,
			scroll: {
				create(name) {
					calls.push({ method: 'create', name });
					return { name };
				},
			},
			split(offset) {
				const newWrapper = newWrappers.find((candidate) => candidate.offset === offset);

				this.next = newWrapper;
				calls.push({ method: 'splitWrapper', offset });
				return newWrapper;
			},
		};
		const table = {
			children: {
				forEach(callback) {
					this.items.forEach(callback);
				},
				head: null,
				items: [],
			},
			domNode: document.createElement('table'),
			getRows() {
				return rows;
			},
			parent: wrapper,
			split(offset) {
				const newTable = newTables.find((candidate) => candidate.offset === offset)?.tableBlot;

				calls.push({ method: 'splitTable', offset });
				return newTable;
			},
		};
		const colBlot = {
			clone() {
				const domNode = document.createElement('col');

				domNode.dataset.tableId = 'original-table';
				return { domNode };
			},
			domNode: document.createElement('col'),
		};
		const colgroupBlot = {
			appendChild(child) {
				this.children.items.push(child);
				this.domNode.appendChild(child.domNode);
			},
			children: {
				forEach(callback) {
					this.items.forEach(callback);
				},
				items: [colBlot],
			},
			clone() {
				const domNode = document.createElement('colgroup');

				domNode.dataset.tableId = 'original-table';
				return {
					appendChild(child) {
						this.children.items.push(child);
						this.domNode.appendChild(child.domNode);
					},
					children: {
						items: [],
					},
					domNode,
				};
			},
			domNode: document.createElement('colgroup'),
		};

		colBlot.domNode.dataset.tableId = 'original-table';
		colgroupBlot.domNode.dataset.tableId = 'original-table';
		colgroupBlot.domNode.appendChild(colBlot.domNode);
		table.children.items.push(colgroupBlot);
		table.children.head = colgroupBlot;
		table.domNode.appendChild(colgroupBlot.domNode);
		const body = { parent: table };
		const rows = [10, 20, 30, 40].map((offset) => ({
			offset(parent) {
				return parent === table ? offset : -1;
			},
			parent: body,
		}));
		const selectedCells = [
			{ getTableRow: () => rows[1] },
			{ getTableRow: () => rows[2] },
		];
		const quill = {
			update(source) {
				calls.push({ method: 'update', source });
			},
		};
		const context = {
			cells: selectedCells,
			quill,
			tableModule: {},
		};

		expect(tableController.handleContextMenuCommand('split-table-above', context)).toBeTrue();
		expect(tableController.handleContextMenuCommand('split-table-below', context)).toBeTrue();
		expect(calls.slice(0, 10)).toEqual([
			{ method: 'splitTable', offset: 20 },
			{ child: newTables[0].tableBlot.children.head, method: 'insertTableChild', ref: null, table: newTables[0].tableBlot },
			{ method: 'splitWrapper', offset: 200 },
			{ method: 'create', name: 'block' },
			{ block: { name: 'block' }, method: 'insertBefore', ref: newWrappers[0] },
			{ method: 'update', source: 'user' },
			{ method: 'splitTable', offset: 40 },
			{ child: newTables[1].tableBlot.children.head, method: 'insertTableChild', ref: null, table: newTables[1].tableBlot },
			{ method: 'splitWrapper', offset: 400 },
			{ method: 'create', name: 'block' },
		]);
		expect(calls.slice(10, 12)).toEqual([
			{ block: { name: 'block' }, method: 'insertBefore', ref: newWrappers[1] },
			{ method: 'update', source: 'user' },
		]);
		expect(newWrappers[0].domNode.dataset.tableId).not.toBe('original-table');
		expect(newWrappers[0].domNode.querySelector('table').dataset.tableId)
			.toBe(newWrappers[0].domNode.dataset.tableId);
		expect(newWrappers[0].domNode.querySelector('colgroup')).not.toBeNull();
		expect(newWrappers[0].domNode.querySelector('col').dataset.tableId)
			.toBe(newWrappers[0].domNode.dataset.tableId);
		expect(newWrappers[0].domNode.querySelector('td').dataset.tableId)
			.toBe(newWrappers[0].domNode.dataset.tableId);
		expect(newWrappers[1].domNode.dataset.tableId).not.toBe('original-table');
	});

	it('does not split a table outside the table row range', function() {
		const calls = [];
		const wrapper = {
			domNode: document.createElement('div'),
			split(offset) {
				calls.push({ method: 'splitWrapper', offset });
			},
		};
		wrapper.domNode.className = 'ql-table-wrapper';
		const table = {
			getRows() {
				return rows;
			},
			parent: wrapper,
		};
		const body = { parent: table };
		const rows = [10, 20].map((offset) => ({
			offset() {
				return offset;
			},
			parent: body,
		}));
		const firstRowContext = {
			cells: [{ getTableRow: () => rows[0] }],
			tableModule: {},
		};
		const lastRowContext = {
			cells: [{ getTableRow: () => rows[1] }],
			tableModule: {},
		};

		expect(tableController.handleContextMenuCommand('split-table-above', firstRowContext)).toBeFalse();
		expect(tableController.handleContextMenuCommand('split-table-below', lastRowContext)).toBeFalse();
		expect(calls).toEqual([]);
	});

	it('registers table context menu editor interactions', function() {
		expect(editorInteractions.handlers.map((handler) => handler.id)).toContain('table.editor-region');
		expect(editorInteractions.handlers[0].serviceName).toBe('table-controller');
		expect(editorInteractions.handlers[0].selector).toBe('.ql-table, .table-up-table, table');
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
		]);
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
			suppressTableSelection: true,
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

	it('clears TableUp cell selection on a simple cell click without forcing Quill selection', function() {
		const calls = [];
		const table = document.createElement('table');
		const cell = document.createElement('div');
		const tableSelection = {
			hide() {
				calls.push({ method: 'hide' });
			},
			setSelectedTds(cells) {
				calls.push({ cells, method: 'setSelectedTds' });
			},
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
		table.appendChild(cell);

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
			getModule: () => ({
				getModule: () => tableSelection,
			}),
			quill: {
				focus(options) {
					calls.push({ method: 'focus', options });
				},
			},
			setSelection(...args) {
				calls.push({ args, method: 'setSelection' });
			},
			target: {
				element: table,
				serviceName: 'table-controller',
			},
			targetServiceName: 'table-controller',
		})).toEqual({
			handled: true,
			suppressTableSelection: true,
		});
		expect(calls).toEqual([
			{ cells: [], method: 'setSelectedTds' },
			{ method: 'hide' },
		]);
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
