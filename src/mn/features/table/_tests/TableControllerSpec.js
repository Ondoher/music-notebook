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
			.map((handler) => handler.handle(event, { ...context, eventName }))
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

	it('registers table context menu editor interactions', function() {
		expect(editorInteractions.handlers.map((handler) => handler.id)).toContain('table.context-menu');
		expect(editorInteractions.handlers[0].events).toEqual(['contextmenu', 'keydown']);
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
			getTableSelectionModule: () => null,
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
			getTableSelectionModule: () => ({
				selectedTds: [selectedCell],
			}),
		});

		expect(editorViews.requestedViews[0].props.context).toEqual({
			cell,
			cellBlot,
			cells: [selectedCell],
			selectionShape: 'cell',
			table,
			tableModule: null,
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
			getTableSelectionModule: () => ({
				selectedTds: [selectedTop, selectedBottom],
			}),
		})).toEqual({ handled: true });

		expect(editorViews.requestedViews[0].props.anchorPosition).toEqual({ left: 80, top: 48 });
		expect(editorViews.requestedViews[0].props.context).toEqual({
			cell: firstColumnTop,
			cellBlot: selectedTop,
			cells: [selectedTop, selectedBottom],
			selectionShape: 'column',
			table,
			tableModule: null,
		});
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
			getCurrentTableCellInner: () => cell,
			getTableSelectionModule: () => null,
		})).toEqual({ handled: true });

		expect(editorViews.requestedViews[0].props.anchorPosition).toEqual({ left: 24, top: 72 });
		expect(editorViews.requestedViews[0].props.context.cell).toBe(cell);
	});
});
