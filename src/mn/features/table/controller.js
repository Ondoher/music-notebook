import { Service } from '@polylith/core';
import TableUp, { TableSelection } from 'quill-table-up';
import {
	getRenderedTableCellInnerFromBlot,
	getTableSelectionShape,
} from './table-selection.js';
import { TABLE_CONTEXT_MENU_VIEW } from './table-context-menu-view.js';

const INSERT_TABLE_ITEM_ID = 'table.menu.insert';
const TABLE_SELECTOR = '.ql-table, .table-up-table, table';
const TABLE_CELL_INNER_SELECTOR = '.ql-table-cell-inner, .table-up-cell-inner';
const TABLE_COLUMN_CURSOR_CLASS = 'mn-table-column-selection-cursor';

/** Registers table commands and routes them to the active editor surface. */
export default class TableController extends Service {
	constructor(registry) {
		super('table-controller', registry);
		this.implement([
			'ready',
			'registerMenuItems',
			'insertTable',
			'handleEditorEvent',
			'handleContextMenuCommand',
		]);
		this.lastContextMenuCommand = null;
	}

	ready() {
		this.editorSurface = this.registry.subscribe('editor-surface');
		this.editorInteractions = this.registry.subscribe('editor-interactions');
		this.editorViews = this.registry.subscribe('editor-views');
		this.mainMenu = this.registry.subscribe('main-menu');
		this.menuSelectedListener = this.mainMenu.listen(
			'item-selected',
			this.onMenuItemSelected.bind(this),
		);
		this.mainItemAddedListener = this.mainMenu.listen(
			'main-item-added',
			this.onMainMenuItemAdded.bind(this),
		);

		this.unregisterEditorInteractions = this.editorInteractions?.registerHandler?.({
			events: [
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
			],
			gutterSelectable: true,
			id: 'table.editor-region',
			idAttribute: 'data-table-id',
			pointHitMargin: {
				top: 10,
			},
			pointSelectable: true,
			priority: 100,
			role: 'table',
			selector: TABLE_SELECTOR,
			serviceName: 'table-controller',
		});
		this.registerMenuItems();
	}

	registerMenuItems() {
		if (!this.mainMenu.getMenu().some((item) => item.id === 'insert')) {
			return false;
		}

		this.mainMenu.addItem('insert', 30, 100, INSERT_TABLE_ITEM_ID);
		return true;
	}

	insertTable() {
		return this.editorSurface?.insertTable?.(1, 2) || false;
	}

	handleEditorEvent(eventName, event, context) {
		if (eventName === 'contextmenu') {
			return this.handleTableContextMenu(event, context);
		}

		if (eventName === 'keydown') {
			return this.handleTableContextMenuKeyDown(event, context);
		}

		if (eventName === 'mousedown-capture') {
			return this.handleTableMouseDownCapture(event, context);
		}

		if (eventName === 'pointerdown') {
			return this.handleTablePointerDown(event, context);
		}

		if (eventName === 'pointermove') {
			return this.handleTablePointerMove(event, context);
		}

		if (eventName === 'pointerleave') {
			return this.handleTablePointerLeave(event, context);
		}

		if (eventName === 'pointerup' || eventName === 'pointercancel') {
			return this.handleTablePointerEnd(event, context);
		}

		if (eventName === 'gutter-line-select-start') {
			return this.handleTableGutterSelectionStart(event, context);
		}

		if (eventName === 'gutter-line-select-move') {
			return this.handleTableGutterSelectionMove(event, context);
		}

		if (eventName === 'gutter-line-select-end' || eventName === 'gutter-line-select-cancel') {
			return this.handleTableGutterSelectionEnd();
		}

		return false;
	}

	handleTableContextMenu(event, context) {
		const cell = this.getTableCellInnerFromNode(event?.target);
		const table = this.getTableFromNode(event?.target);
		const commandContext = this.getTableCommandContext(cell, context, table);

		if (!commandContext) {
			return false;
		}

		event.preventDefault?.();
		event.stopPropagation?.();
		this.openTableContextMenu({
			left: event.clientX,
			top: event.clientY,
		}, commandContext, context);
		return { handled: true };
	}

	handleTableContextMenuKeyDown(event, context) {
		const isContextMenuKey = event?.key === 'ContextMenu';
		const isShiftF10 = event?.key === 'F10' && event.shiftKey === true;

		if (!isContextMenuKey && !isShiftF10) {
			return false;
		}

		const cell = this.getCurrentTableCellInner(context);
		const commandContext = this.getTableCommandContext(cell, context);

		if (!commandContext) {
			return false;
		}

		const rect = cell.getBoundingClientRect?.();

		event.preventDefault?.();
		event.stopPropagation?.();
		this.openTableContextMenu({
			left: Math.round(rect?.left || 0),
			top: Math.round(rect?.bottom || rect?.top || 0),
		}, commandContext, context);
		return { handled: true };
	}

	openTableContextMenu(anchorPosition, commandContext, interactionContext) {
		this.editorViews?.requestView?.(TABLE_CONTEXT_MENU_VIEW, {
			anchorPosition,
			context: commandContext,
			onClose: () => this.closeTableContextMenu(commandContext, interactionContext),
			onSelect: (commandId, selectedContext) => {
				this.handleContextMenuCommand(commandId, selectedContext);
				this.closeTableContextMenu(commandContext, interactionContext);
				return true;
			},
			open: true,
		});
	}

	closeTableContextMenu(commandContext, interactionContext) {
		this.editorViews?.closeView?.(TABLE_CONTEXT_MENU_VIEW);

		if (commandContext?.cell?.isConnected) {
			this.selectTableCell(commandContext.cell, interactionContext);
		}
	}

	getTableCellInnerFromNode(node) {
		const element = getElementFromNode(node);
		const inner = element?.closest?.(TABLE_CELL_INNER_SELECTOR) || null;

		if (inner) {
			return inner;
		}

		const cell = element?.closest?.('td, th, .ql-table-cell, .table-up-cell') || null;

		return cell?.querySelector?.(TABLE_CELL_INNER_SELECTOR) || null;
	}

	getTableFromNode(node) {
		const element = getElementFromNode(node);

		return element?.closest?.('table') || null;
	}

	handleTableMouseDownCapture(event, context) {
		if (this.isContextMenuClickInActiveTableSelection(event, context)) {
			return {
				handled: true,
				suppressBlankTableCellFocus: true,
				suppressTableSelection: true,
			};
		}

		if (!this.isPlainTableCellClick(event, context)) {
			return false;
		}

		this.clearTableSelection(context);
		return {
			handled: true,
			suppressTableSelection: true,
		};
	}

	isPlainTableCellClick(event, context) {
		if (event?.button !== 0 || !this.getTableCellInnerFromNode(event?.target)) {
			return false;
		}

		return !this.isTableSelectionGesture(event, context);
	}

	isContextMenuClickInActiveTableSelection(event, context) {
		if (event?.button !== 2) {
			return false;
		}

		const table = this.getTableFromNode(event?.target) || context?.target?.element || null;
		const selectedCells = this.getActiveTableSelectionCells(table, context);

		if (!table || !selectedCells.length) {
			return false;
		}

		const point = {
			clientX: Number(event?.clientX),
			clientY: Number(event?.clientY),
		};

		if (!Number.isFinite(point.clientX) || !Number.isFinite(point.clientY)) {
			return true;
		}

		if (this.isPointInSelectedTableCells(point, selectedCells)) {
			return true;
		}

		const range = this.getTableColumnSelectionRangeFromPoint(point.clientX, point.clientY, {
			...context,
			target: {
				...(context?.target || {}),
				element: table,
			},
		});

		return range?.table === table && range.cells?.some?.((cell) => selectedCells.includes(cell));
	}

	isPointInSelectedTableCells(point, selectedCells = []) {
		return selectedCells.some((cell) => {
			const rect = this.getTableCellBoundaryElement(cell)?.getBoundingClientRect?.();

			return rect
				&& rect.width > 0
				&& rect.height > 0
				&& rect.left <= point.clientX
				&& point.clientX <= rect.right
				&& rect.top <= point.clientY
				&& point.clientY <= rect.bottom;
		});
	}

	isTableSelectionGesture(event, context) {
		return !!this.getTableColumnSelectionRangeFromPoint(event?.clientX, event?.clientY, context);
	}

	handleTablePointerDown(event, context) {
		const range = this.getTableColumnSelectionRangeFromPoint(event?.clientX, event?.clientY, context);

		if (!range) {
			return false;
		}

		this.tableColumnSelectionAnchorRange = range;
		this.selectTableSelectionRanges(range, range, context);
		return {
			capturePointer: true,
			handled: true,
			preventDefault: true,
			stopPropagation: true,
		};
	}

	handleTablePointerMove(event, context) {
		if (this.tableColumnSelectionAnchorRange) {
			const range = this.getTableColumnSelectionRangeFromPoint(event?.clientX, event?.clientY, context);

			if (!range || range.table !== this.tableColumnSelectionAnchorRange.table) {
				return { handled: true };
			}

			this.selectTableSelectionRanges(this.tableColumnSelectionAnchorRange, range, context);
			return {
				handled: true,
				preventDefault: true,
			};
		}

		const range = this.getTableColumnSelectionRangeFromPoint(event?.clientX, event?.clientY, context);

		if (!range) {
			return false;
		}

		return {
			cursorClass: TABLE_COLUMN_CURSOR_CLASS,
			handled: true,
		};
	}

	handleTablePointerLeave(_event, context) {
		if (!this.tableColumnSelectionAnchorRange && context?.handler?.serviceName === 'table-controller') {
			return {
				cursorClass: null,
				handled: true,
			};
		}

		return false;
	}

	handleTablePointerEnd() {
		if (!this.tableColumnSelectionAnchorRange) {
			return false;
		}

		this.tableColumnSelectionAnchorRange = null;
		return {
			cursorClass: null,
			handled: true,
		};
	}

	handleTableGutterSelectionStart(event, context) {
		const range = this.getTableRowSelectionRangeFromGutterEvent(event, context);

		if (!range) {
			return false;
		}

		this.tableGutterSelectionAnchorRange = range;
		if (!this.selectTableSelectionRanges(range, range, context)) {
			this.tableGutterSelectionAnchorRange = null;
			return false;
		}

		return {
			handled: true,
			preventDefault: true,
			stopPropagation: true,
		};
	}

	handleTableGutterSelectionMove(event, context) {
		if (!this.tableGutterSelectionAnchorRange) {
			return false;
		}

		const range = this.getTableRowSelectionRangeFromGutterEvent(event, context);

		if (!range || range.table !== this.tableGutterSelectionAnchorRange.table) {
			return { handled: true };
		}

		if (!this.selectTableSelectionRanges(this.tableGutterSelectionAnchorRange, range, context)) {
			return { handled: true };
		}

		return {
			handled: true,
			preventDefault: true,
		};
	}

	handleTableGutterSelectionEnd() {
		if (!this.tableGutterSelectionAnchorRange) {
			return false;
		}

		this.tableGutterSelectionAnchorRange = null;
		return { handled: true };
	}

	getTableCommandContext(cell, context, fallbackTable = null) {
		let table = cell?.closest?.('table') || fallbackTable;
		let selectedCells = this.getActiveTableSelectionCells(table, context);
		let contextCell = cell || getRenderedTableCellInnerFromBlot(selectedCells[0]);
		let contextCellBlot = contextCell ? context.findBlot?.(contextCell, true) : null;

		table = table || contextCell?.closest?.('table');
		selectedCells = selectedCells.length
			? selectedCells
			: this.getActiveTableSelectionCells(table, context);
		contextCell = contextCell || getRenderedTableCellInnerFromBlot(selectedCells[0]);
		contextCellBlot = contextCellBlot || selectedCells[0] || null;

		if (!contextCell || !table || !contextCellBlot) {
			return null;
		}

		return {
			cell: contextCell,
			cellBlot: contextCellBlot,
			cells: selectedCells.length ? selectedCells : [contextCellBlot],
			...(context?.quill ? { quill: context.quill } : {}),
			selectionShape: selectedCells.length ? getTableSelectionShape(table, selectedCells) : 'cell',
			table,
			tableModule: this.getTableModule(context),
		};
	}

	getActiveTableSelectionCells(table, context) {
		const tableSelection = this.getTableSelectionModule(context);
		const selectedCells = Array.isArray(tableSelection?.selectedTds)
			? tableSelection.selectedTds
			: [];

		if (!table) {
			return selectedCells;
		}

		return selectedCells.filter((cell) => (
			getRenderedTableCellInnerFromBlot(cell)?.closest?.('table') === table
		));
	}

	getTableModule(context) {
		return context?.getModule?.(TableUp.moduleName) || null;
	}

	getTableSelectionModule(context) {
		return this.getTableModule(context)?.getModule?.(TableSelection.moduleName) || null;
	}

	getCurrentTableCellInner(context) {
		const range = context?.getSelection?.();

		if (!range) {
			return null;
		}

		const [line] = context.getLine?.(range.index) || [];
		const lineNode = line?.domNode;
		const leafNode = context.getLeaf?.(range.index)?.[0]?.domNode;
		const node = lineNode || leafNode;

		return node?.closest?.(TABLE_CELL_INNER_SELECTOR) || null;
	}

	selectTableCell(cell, context) {
		const blot = context?.findBlot?.(cell, true);
		const index = blot ? context?.getIndex?.(blot) : null;

		if (!Number.isInteger(index)) {
			return false;
		}

		this.getTableSelectionModule(context)?.hide?.();
		context?.quill?.focus?.();
		context?.setSelection?.(index, 0, 'user');
		return true;
	}

	clearTableSelection(context) {
		const tableSelection = this.getTableSelectionModule(context);

		tableSelection?.setSelectedTds?.([]);
		tableSelection?.hide?.();
	}

	getTableRowSelectionRangeFromGutterEvent(event, context) {
		const table = context?.target?.element?.closest?.('table') || context?.target?.element;
		const clientY = Number(context?.lineHit?.point?.clientY ?? event?.clientY);

		if (!table || !Number.isFinite(clientY)) {
			return null;
		}

		const rows = Array.from(table.querySelectorAll('tr'));
		const row = rows.find((candidate) => {
			const rect = candidate.getBoundingClientRect?.();

			return rect && rect.height > 0 && rect.top <= clientY && clientY <= rect.bottom;
		});

		return row ? this.getTableRowSelectionRange(row, context) : null;
	}

	getTableRowSelectionRange(row, context) {
		const ranges = this.getTableCellSelectionRanges(row, context);

		if (!ranges.length) {
			return null;
		}

		const start = Math.min(...ranges.map((range) => range.index));
		const end = Math.max(...ranges.map((range) => range.index + range.length));

		return {
			cells: ranges.map((range) => range.blot),
			index: start,
			length: Math.max(end - start, 1),
			table: row.closest('table'),
		};
	}

	getTableColumnSelectionRangeFromPoint(clientX, clientY, context) {
		if (!Number.isFinite(Number(clientX)) || !Number.isFinite(Number(clientY))) {
			return null;
		}

		const tableRoot = context?.target?.element || context?.editorRoot;
		const tables = tableRoot?.matches?.(TABLE_SELECTOR)
			? [tableRoot]
			: Array.from(tableRoot?.querySelectorAll?.(TABLE_SELECTOR) || []);
		const table = tables.find((candidate) => {
			const rect = candidate.getBoundingClientRect?.();

			return rect
				&& rect.width > 0
				&& rect.height > 0
				&& rect.left <= clientX
				&& clientX <= rect.right
				&& rect.top - 10 <= clientY
				&& clientY <= rect.top + 18;
		});

		if (!table) {
			return null;
		}

		const columnCell = Array.from(table.querySelectorAll(TABLE_CELL_INNER_SELECTOR))
			.find((cell) => {
				const rect = cell.getBoundingClientRect?.();

				return rect
					&& rect.width > 0
					&& rect.left <= clientX
					&& clientX <= rect.right;
			});

		return columnCell ? this.getTableColumnSelectionRange(columnCell, context) : null;
	}

	getTableColumnSelectionRange(columnCell, context) {
		const table = columnCell.closest('table');
		const columnId = columnCell.dataset?.colId;
		const columnIdSelector = TABLE_CELL_INNER_SELECTOR.split(', ')
			.map((selector) => `${selector}[data-col-id="${cssEscape(columnId)}"]`)
			.join(', ');
		const columnCells = columnId
			? Array.from(table?.querySelectorAll(columnIdSelector) || [])
			: this.getTableColumnCellsByVisualIndex(columnCell);
		const ranges = columnCells
			.map((cell) => this.getTableCellSelectionRange(cell, context))
			.filter(Boolean);
		const columnIndex = this.getTableColumnVisualIndex(columnCell);

		if (!table || !ranges.length) {
			return null;
		}

		const start = Math.min(...ranges.map((range) => range.index));
		const end = Math.max(...ranges.map((range) => range.index + range.length));

		return {
			cells: ranges.map((range) => range.blot),
			columnIndex,
			index: start,
			length: Math.max(end - start, 1),
			table,
		};
	}

	getTableColumnCellsByVisualIndex(columnCell) {
		const row = columnCell.closest('tr');
		const table = columnCell.closest('table');
		const columnIndex = this.getTableColumnVisualIndex(columnCell);

		if (!row || !table || columnIndex < 0) {
			return [];
		}

		return Array.from(table.querySelectorAll('tr'))
			.map((tableRow) => Array.from(tableRow.querySelectorAll(TABLE_CELL_INNER_SELECTOR))[columnIndex])
			.filter(Boolean);
	}

	getTableColumnVisualIndex(columnCell) {
		const row = columnCell.closest('tr');
		const rowCells = Array.from(row?.querySelectorAll(TABLE_CELL_INNER_SELECTOR) || []);

		return rowCells.indexOf(columnCell);
	}

	getTableCellSelectionRanges(container, context) {
		const cells = Array.from(container.querySelectorAll(TABLE_CELL_INNER_SELECTOR));

		return cells
			.map((cell) => this.getTableCellSelectionRange(cell, context))
			.filter(Boolean);
	}

	getTableCellSelectionRange(cell, context) {
		const blot = context?.findBlot?.(cell, true);
		const index = blot ? context?.getIndex?.(blot) : null;
		const length = Number(blot?.length?.());

		if (!Number.isInteger(index)) {
			return null;
		}

		return {
			blot,
			index,
			length: Number.isFinite(length) && length > 0 ? length : 1,
		};
	}

	selectTableSelectionRanges(anchorRange, focusRange, context) {
		if (!anchorRange.table || !focusRange.table || anchorRange.table !== focusRange.table) {
			return false;
		}

		const tableSelection = this.getTableSelectionModule(context);
		const cells = this.getTableSelectionCells(anchorRange.table, anchorRange, focusRange, context);

		if (!tableSelection || !cells.length) {
			return false;
		}

		this.applyTableSelection(tableSelection, anchorRange.table, cells, context);
		context?.setSelection?.(null, 'api');
		return true;
	}

	getTableSelectionCells(table, anchorRange, focusRange, context) {
		if (Array.isArray(anchorRange.cells) && Array.isArray(focusRange.cells)) {
			const anchorColumnIndex = Number(anchorRange.columnIndex);
			const focusColumnIndex = Number(focusRange.columnIndex);

			if (Number.isInteger(anchorColumnIndex) && Number.isInteger(focusColumnIndex)) {
				const start = Math.min(anchorColumnIndex, focusColumnIndex);
				const end = Math.max(anchorColumnIndex, focusColumnIndex);

				return Array.from(table.querySelectorAll('tr'))
					.flatMap((row) => Array.from(row.querySelectorAll(TABLE_CELL_INNER_SELECTOR))
						.slice(start, end + 1)
						.map((cell) => this.getTableCellSelectionRange(cell, context)?.blot))
					.filter(Boolean);
			}

			return Array.from(new Set(anchorRange.cells.concat(focusRange.cells)));
		}

		const start = Math.min(anchorRange.index, focusRange.index);
		const end = Math.max(anchorRange.index + anchorRange.length, focusRange.index + focusRange.length);

		return this.getTableCellSelectionRanges(table, context)
			.filter((range) => range.index < end && range.index + range.length > start)
			.map((range) => range.blot);
	}

	applyTableSelection(tableSelection, table, cells, context) {
		tableSelection.setSelectionTable(table);
		tableSelection.setSelectedTds(cells);

		const boundary = this.getTableSelectionBoundary(cells, context);

		if (boundary) {
			tableSelection.boundary = boundary;
		}

		const editor = context?.editorRoot;
		const tableView = table.parentElement;

		tableSelection.selectedEditorScrollX = Number(editor?.scrollLeft) || 0;
		tableSelection.selectedEditorScrollY = Number(editor?.scrollTop) || 0;
		tableSelection.selectedTableScrollX = Number(tableView?.scrollLeft) || 0;
		tableSelection.selectedTableScrollY = Number(tableView?.scrollTop) || 0;
		tableSelection.show?.();
	}

	getTableSelectionBoundary(cells, context) {
		const rootRect = context?.editorRoot?.getBoundingClientRect?.();

		if (!rootRect) {
			return null;
		}

		const rects = cells
			.map((cell) => this.getTableCellBoundaryElement(cell)?.getBoundingClientRect?.())
			.filter((rect) => rect && rect.width > 0 && rect.height > 0);

		if (!rects.length) {
			return null;
		}

		const left = Math.min(...rects.map((rect) => rect.left));
		const top = Math.min(...rects.map((rect) => rect.top));
		const right = Math.max(...rects.map((rect) => rect.right));
		const bottom = Math.max(...rects.map((rect) => rect.bottom));

		return {
			height: bottom - top,
			width: right - left,
			x: left - rootRect.left,
			y: top - rootRect.top,
		};
	}

	getTableCellBoundaryElement(cell) {
		const cellNode = cell?.parent?.domNode || null;
		const innerNode = getRenderedTableCellInnerFromBlot(cell);

		return cellNode?.getBoundingClientRect
			? cellNode
			: innerNode?.parentElement || innerNode;
	}

	handleContextMenuCommand(commandId, context) {
		if (!this.performContextMenuCommand(commandId, context)) {
			return false;
		}

		this.lastContextMenuCommand = {
			commandId,
			context,
		};
		this.fire?.('context-menu-command', this.lastContextMenuCommand);
		return true;
	}

	performContextMenuCommand(commandId, context = {}) {
		const tableModule = context.tableModule;

		if (!tableModule) {
			return false;
		}

		if (commandId === 'fit-table-to-width') {
			return this.fitTableToAvailableWidth(context);
		}

		if (commandId === 'distribute-table-columns') {
			return this.distributeTableColumns(context);
		}

		const selectedCells = this.getCommandCells(context);

		if (!selectedCells.length) {
			return false;
		}

		const commandById = {
			'delete-column': ['removeCol', selectedCells],
			'delete-row': ['removeRow', selectedCells],
			'delete-table': ['deleteTable', selectedCells],
			'insert-column-left': ['appendCol', selectedCells, false],
			'insert-column-right': ['appendCol', selectedCells, true],
			'insert-row-above': ['appendRow', selectedCells, false],
			'insert-row-below': ['appendRow', selectedCells, true],
		};

		if (commandId === 'split-table-above') {
			return this.splitTableAtSelection(context, false);
		}

		if (commandId === 'split-table-below') {
			return this.splitTableAtSelection(context, true);
		}

		const [methodName, ...args] = commandById[commandId] || [];
		const command = tableModule[methodName];

		if (typeof command !== 'function') {
			return false;
		}

		command.apply(tableModule, args);
		return true;
	}

	fitTableToAvailableWidth(context = {}) {
		const table = context.table || context.cell?.closest?.('table') || null;
		const availableWidth = this.getAvailableTableWidth(table, context);

		if (!table || !Number.isFinite(availableWidth) || availableWidth <= 0) {
			return false;
		}

		const columns = this.getTableColumns(table);
		const columnWidths = this.getColumnWidths(columns);

		if (!columnWidths.length) {
			return false;
		}

		const currentWidth = columnWidths.reduce((total, width) => total + width, 0);
		const adjustment = (availableWidth - currentWidth) / columnWidths.length;
		const nextWidths = columnWidths.map((width) => width + adjustment);

		if (!this.applyTableColumnWidths(table, columns, nextWidths)) {
			return false;
		}

		context.quill?.update?.('user');
		return true;
	}

	distributeTableColumns(context = {}) {
		const table = context.table || context.cell?.closest?.('table') || null;
		const columns = this.getTableColumns(table);
		const columnWidths = this.getColumnWidths(columns);

		if (!table || !columnWidths.length) {
			return false;
		}

		const tableWidth = this.getTableWidth(table, columnWidths);
		const columnWidth = tableWidth / columns.length;

		if (!Number.isFinite(columnWidth) || columnWidth <= 0) {
			return false;
		}

		if (!this.applyTableColumnWidths(table, columns, columns.map(() => columnWidth))) {
			return false;
		}

		context.quill?.update?.('user');
		return true;
	}

	getAvailableTableWidth(table, context = {}) {
		const contentHost = table?.closest?.('.mn-document-content');
		const cssWidth = this.getCssPixelValue(contentHost, '--mn-content-width');

		if (Number.isFinite(cssWidth) && cssWidth > 0) {
			return cssWidth;
		}

		const editorRoot = context.editorRoot || context.quill?.root || null;
		const rootStyle = editorRoot?.getBoundingClientRect ? getComputedStyle(editorRoot) : null;
		const rootWidth = Number(editorRoot?.getBoundingClientRect?.().width) || Number(editorRoot?.clientWidth);
		const paddingLeft = Number.parseFloat(rootStyle?.paddingLeft || '0') || 0;
		const paddingRight = Number.parseFloat(rootStyle?.paddingRight || '0') || 0;
		const rootContentWidth = rootWidth - paddingLeft - paddingRight;

		if (Number.isFinite(rootContentWidth) && rootContentWidth > 0) {
			return rootContentWidth;
		}

		return this.getTableWidth(table, this.getColumnWidths(this.getTableColumns(table)));
	}

	getCssPixelValue(element, propertyName) {
		if (!element?.getBoundingClientRect) {
			return NaN;
		}

		const value = getComputedStyle(element).getPropertyValue(propertyName);
		const trimmedValue = String(value || '').trim();
		const number = Number.parseFloat(value);

		return trimmedValue.endsWith('px') && Number.isFinite(number) ? number : NaN;
	}

	getTableColumns(table) {
		return Array.from(table?.querySelectorAll?.('colgroup col') || []);
	}

	getColumnWidths(columns = []) {
		return columns
			.map((column) => {
				const width = Number.parseFloat(column.getAttribute('width') || '');

				if (Number.isFinite(width) && width > 0) {
					return width;
				}

				return Number(column.getBoundingClientRect?.().width) || 0;
			})
			.filter((width) => Number.isFinite(width) && width > 0);
	}

	getTableWidth(table, columnWidths = []) {
		const styleWidth = Number.parseFloat(table?.style?.width || '');

		if (Number.isFinite(styleWidth) && styleWidth > 0) {
			return styleWidth;
		}

		const rectWidth = Number(table?.getBoundingClientRect?.().width);

		if (Number.isFinite(rectWidth) && rectWidth > 0) {
			return rectWidth;
		}

		return columnWidths.reduce((total, width) => total + width, 0);
	}

	applyTableColumnWidths(table, columns = [], widths = []) {
		if (!table || !columns.length || columns.length !== widths.length) {
			return false;
		}

		const roundedWidths = this.roundColumnWidths(widths);
		const tableWidth = roundedWidths.reduce((total, width) => total + width, 0);

		columns.forEach((column, index) => {
			const width = `${roundedWidths[index]}px`;

			column.removeAttribute('data-full');
			column.setAttribute('width', width);
		});
		const colgroup = columns[0]?.closest?.('colgroup');

		colgroup?.removeAttribute?.('data-full');
		table.removeAttribute?.('data-full');
		table.style.width = `${tableWidth}px`;
		return true;
	}

	roundColumnWidths(widths = []) {
		const rounded = widths.map((width) => Math.max(1, Math.round(width)));
		const target = Math.max(1, Math.round(widths.reduce((total, width) => total + width, 0)));
		const delta = target - rounded.reduce((total, width) => total + width, 0);

		if (rounded.length) {
			rounded[rounded.length - 1] = Math.max(1, rounded[rounded.length - 1] + delta);
		}
		return rounded;
	}

	splitTableAtSelection(context = {}, below = false) {
		const selectedCells = this.getCommandCells(context);
		const rows = this.getSelectedTableRows(selectedCells);
		const tableBlot = this.getTableBlotFromRows(rows);
		const tableRows = tableBlot?.getRows?.() || [];

		if (!tableBlot || !rows.length || !tableRows.length) {
			return false;
		}

		const selectedIndexes = rows
			.map((row) => tableRows.indexOf(row))
			.filter((index) => index >= 0);

		if (!selectedIndexes.length) {
			return false;
		}

		const firstIndex = Math.min(...selectedIndexes);
		const lastIndex = Math.max(...selectedIndexes);
		const splitIndex = below ? lastIndex + 1 : firstIndex;
		const tableWrapper = this.getTableWrapperFromTableBlot(tableBlot);
		const splitRow = tableRows[splitIndex];

		if (!splitRow || !tableWrapper || splitIndex <= 0 || splitIndex >= tableRows.length) {
			return false;
		}

		const newTableBlot = tableBlot.split(splitRow.offset(tableBlot));

		if (!newTableBlot || newTableBlot === tableBlot) {
			return false;
		}

		this.copyColumnGroupToSplitTable(tableBlot, newTableBlot);
		const newTableWrapper = tableWrapper.split(newTableBlot.offset(tableWrapper));

		if (!newTableWrapper || newTableWrapper === tableWrapper) {
			return false;
		}

		this.assignNewTableId(newTableWrapper);
		this.insertBlockBetweenTables(tableWrapper, newTableWrapper);
		context.quill?.update?.('user');
		return true;
	}

	getSelectedTableRows(selectedCells = []) {
		return Array.from(new Set(
			selectedCells
				.map((cell) => cell?.getTableRow?.())
				.filter(Boolean),
		));
	}

	getTableBlotFromRows(rows = []) {
		const row = rows[0];
		let parent = row?.parent || null;

		while (parent) {
			if (typeof parent.getRows === 'function') {
				return parent;
			}

			parent = parent.parent || null;
		}

		return null;
	}

	getTableWrapperFromTableBlot(tableBlot) {
		let parent = tableBlot?.parent || null;

		while (parent) {
			if (parent.domNode?.classList?.contains('ql-table-wrapper')) {
				return parent;
			}

			parent = parent.parent || null;
		}

		return null;
	}

	assignNewTableId(tableWrapper) {
		const tableId = createTableId();
		const nodes = [tableWrapper?.domNode]
			.concat(Array.from(tableWrapper?.domNode?.querySelectorAll?.('[data-table-id]') || []))
			.filter(Boolean);

		nodes.forEach((node) => {
			node.dataset.tableId = tableId;
		});
		return tableId;
	}

	copyColumnGroupToSplitTable(sourceTableBlot, targetTableBlot) {
		const sourceColgroup = this.getFirstChildBlot(sourceTableBlot, (child) => (
			child?.domNode?.tagName?.toLowerCase?.() === 'colgroup'
		));
		const targetColgroup = this.getFirstChildBlot(targetTableBlot, (child) => (
			child?.domNode?.tagName?.toLowerCase?.() === 'colgroup'
		));

		if (!sourceColgroup || !targetTableBlot || targetColgroup) {
			return false;
		}

		targetTableBlot.insertBefore(this.cloneBlotTree(sourceColgroup), targetTableBlot.children?.head || null);
		return true;
	}

	getFirstChildBlot(parent, predicate) {
		let result = null;

		parent?.children?.forEach?.((child) => {
			if (!result && predicate(child)) {
				result = child;
			}
		});
		return result;
	}

	cloneBlotTree(blot) {
		const clone = blot.clone();

		blot.children?.forEach?.((child) => {
			clone.appendChild(this.cloneBlotTree(child));
		});
		return clone;
	}

	insertBlockBetweenTables(tableWrapper, newTableWrapper) {
		if (!tableWrapper?.parent || !newTableWrapper || tableWrapper.next !== newTableWrapper) {
			return false;
		}

		const block = tableWrapper.scroll?.create?.('block');

		if (!block) {
			return false;
		}

		tableWrapper.parent.insertBefore(block, newTableWrapper);
		return true;
	}

	getCommandCells(context = {}) {
		const cells = Array.isArray(context.cells) ? context.cells : [];

		if (cells.length) {
			return cells;
		}

		return context.cellBlot ? [context.cellBlot] : [];
	}

	onMenuItemSelected(event) {
		if (event?.item?.id !== INSERT_TABLE_ITEM_ID) {
			return;
		}

		this.insertTable();
	}

	onMainMenuItemAdded(event) {
		if (event?.item?.id === 'insert') {
			this.registerMenuItems();
		}
	}
}

function cssEscape(value) {
	if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
		return CSS.escape(value);
	}

	return String(value).replace(/["\\]/g, '\\$&');
}

function getElementFromNode(node) {
	if (!node) {
		return null;
	}

	if (node.nodeType === getNodeType('ELEMENT_NODE')) {
		return node;
	}

	return node.parentElement || null;
}

function getNodeType(name) {
	if (typeof Node !== 'undefined') {
		return Node[name];
	}

	return {
		ELEMENT_NODE: 1,
		TEXT_NODE: 3,
	}[name];
}

function createTableId() {
	return `table-${Math.random().toString(36).slice(2)}`;
}

new TableController();
