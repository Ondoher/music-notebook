import { Service } from '@polylith/core';
import Quill from 'quill';
import TableUp, { blotName, randomId, TableResizeLine, TableSelection } from 'quill-table-up';
import {
	getRenderedTableCellInnerFromBlot,
	getTableSelectionShape,
} from './table-selection.js';
import { TABLE_CONTEXT_MENU_VIEW } from './table-context-menu-view.js';

const INSERT_TABLE_ITEM_ID = 'table.menu.insert';
const TABLE_SELECTOR = '.ql-table, .table-up-table, table';
const TABLE_CELL_INNER_SELECTOR = '.ql-table-cell-inner, .table-up-cell-inner';
const TABLE_CELL_FOCUS_CLASS = 'mn-table-cell-focus';
const TABLE_COLUMN_CURSOR_CLASS = 'mn-table-column-selection-cursor';
const TABLE_WIDE_CONTENT_SELECTOR = '.ql-table-wrapper, .table-up, .ql-table';
const Delta = Quill.import('delta');

/** Registers table commands and routes them to the active editor surface. */
export default class TableController extends Service {
	constructor(registry) {
		super('table-controller', registry);
		this.implement([
			'ready',
			'registerMenuItems',
			'insertTable',
			'handleEditorReady',
			'handleEditorEvent',
			'handleContextMenuCommand',
		]);
		this.lastContextMenuCommand = null;
		this.focusedTableCell = null;
		this.focusedTableCellBoundary = null;
		this.documentFormat = null;
		this.tableSelectionMouseDownGate = null;
		this.unregisterEditorLayout = null;
	}

	ready() {
		this.editorSurface = this.registry.subscribe('editor-surface');
		this.editorInteractions = this.registry.subscribe('editor-interactions');
		this.editorLayout = this.registry.subscribe('editor-layout');
		this.editorViews = this.registry.subscribe('editor-views');
		this.documentFormat = this.registry.subscribe('document-format');
		this.mainMenu = this.registry.subscribe('main-menu');
		this.menuSelectedListener = this.mainMenu.listen(
			'item-selected',
			this.onMenuItemSelected.bind(this),
		);
		this.mainItemAddedListener = this.mainMenu.listen(
			'main-item-added',
			this.onMainMenuItemAdded.bind(this),
		);
		this.surfaceAttachedListener = null;
		this.surfaceDetachedListener = null;
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
				'selection-change',
			],
			editorReady: true,
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
		this.unregisterEditorLayout = this.editorLayout?.registerWideContentContributor?.({
			id: 'table.wide-content',
			padding: 24,
			selector: TABLE_WIDE_CONTENT_SELECTOR,
		});
		this.attachTableSelectionMouseDownGate();
		this.registerMenuItems();
	}

	handleEditorReady(context = {}) {
		context.registerQuillModule?.(`modules/${TableUp.moduleName}`, TableUp, true);
		context.addQuillModuleOptions?.(TableUp.moduleName, {
			modules: [
				{
					module: TableSelection,
					options: {
						selectColor: 'var(--mn-selection-color)',
					},
				},
				{ module: TableResizeLine },
			],
		});
		return true;
	}

	attachTableSelectionMouseDownGate() {
		const tableSelection = this.getActiveTableSelectionModule();
		const root = this.editorSurface?.getEditorRoot?.();
		const original = tableSelection?.tableSelectMouseDownHandler;

		if (!tableSelection || !root || typeof original !== 'function') {
			return false;
		}

		if (
			this.tableSelectionMouseDownGate?.tableSelection === tableSelection
			&& this.tableSelectionMouseDownGate?.root === root
		) {
			return true;
		}

		this.detachTableSelectionMouseDownGate();
		const gated = function(event) {
			if (event?.mnSuppressNativeSelection === true) {
				return;
			}

			return original.call(tableSelection, event);
		};

		tableSelection.tableSelectMouseDownHandler = gated;
		root.removeEventListener?.('mousedown', original);
		root.addEventListener?.('mousedown', gated);
		this.tableSelectionMouseDownGate = {
			gated,
			original,
			root,
			tableSelection,
		};
		return true;
	}

	detachTableSelectionMouseDownGate() {
		this.clearFocusedTableCell();
		const gate = this.tableSelectionMouseDownGate;

		if (!gate) {
			return false;
		}

		if (gate.tableSelection?.tableSelectMouseDownHandler === gate.gated) {
			gate.tableSelection.tableSelectMouseDownHandler = gate.original;
		}

		gate.root?.removeEventListener?.('mousedown', gate.gated);
		gate.root?.addEventListener?.('mousedown', gate.original);
		this.tableSelectionMouseDownGate = null;
		return true;
	}

	getActiveTableSelectionModule() {
		const tableModule = this.editorSurface?.getQuillModule?.(TableUp.moduleName);

		return tableModule?.getModule?.(TableSelection.moduleName) || null;
	}

	registerMenuItems() {
		if (!this.mainMenu.getMenu().some((item) => item.id === 'insert')) {
			return false;
		}

		this.mainMenu.addItem('insert', 30, 100, INSERT_TABLE_ITEM_ID);
		return true;
	}

	insertTable() {
		const tableModule = this.editorSurface?.getQuillModule?.(TableUp.moduleName);

		if (typeof tableModule?.insertTable !== 'function') {
			return false;
		}

		tableModule.insertTable(1, 2, 'user');
		this.editorSurface?.update?.('user');
		return true;
	}

	handleEditorEvent(eventName, event, context) {
		if (eventName === 'contextmenu') {
			return this.handleTableContextMenu(event, context);
		}

		if (eventName === 'keydown') {
			return this.handleTableKeyDown(event, context);
		}

		if (eventName === 'mousedown-capture') {
			return this.handleTableMouseDownCapture(event, context);
		}

		if (eventName === 'selection-change') {
			return this.handleEditorSelectionChange(context);
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

	handleTableKeyDown(event, context) {
		return this.handleTableNavigationKeyDown(event, context)
			|| this.handleTableContextMenuKeyDown(event, context);
	}

	handleTableNavigationKeyDown(event, context) {
		if (event.mnLeadingKeyboardBinding !== true) {
			return false;
		}

		if (event?.key !== 'Tab' || !this.navigateTableCell(event.shiftKey === true, context)) {
			return false;
		}

		event.preventDefault?.();
		event.stopPropagation?.();
		return {
			handled: true,
			result: {
				preventDefault: true,
				stopPropagation: true,
			},
		};
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
				suppressNativeSelection: true,
			};
		}

		if (!this.isPlainTableCellClick(event, context)) {
			return false;
		}

		this.clearTableSelection(context);
		const focusedCell = this.getTableCellInnerFromNode(event?.target);

		this.setFocusedTableCell(focusedCell);
		this.scheduleFocusedTableCellScroll(focusedCell);
		this.scheduleBlankTableCellFocus(event, context);
		return {
			handled: true,
			suppressNativeSelection: true,
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

		const currentCell = this.getTableCellInnerAtIndex(context, range.index);

		if (currentCell || range.length) {
			return currentCell;
		}

		return this.getTableCellInnerAtIndex(context, range.index - 1);
	}

	getTableCellInnerAtIndex(context, index) {
		if (!Number.isInteger(index) || index < 0) {
			return null;
		}

		const [line] = context.getLine?.(index) || [];
		const lineNode = line?.domNode;
		const leafNode = context.getLeaf?.(index)?.[0]?.domNode;
		const nodes = [leafNode, lineNode].filter(Boolean);

		for (const node of nodes) {
			const cell = this.getTableCellInnerFromNode(node);

			if (cell) {
				return cell;
			}
		}
		return null;
	}

	getFirstTableCellAfterCurrentLine(context) {
		const range = context?.getSelection?.();

		if (!range || range.length) {
			return null;
		}

		const [line] = context.getLine?.(range.index) || [];
		const lineElement = getElementFromNode(line?.domNode);

		if (!lineElement || lineElement.closest?.(TABLE_SELECTOR)) {
			return null;
		}

		const nextElement = lineElement.nextElementSibling;
		const table = nextElement?.matches?.(TABLE_SELECTOR)
			? nextElement
			: nextElement?.querySelector?.(TABLE_SELECTOR) || null;

		return table?.querySelector?.(TABLE_CELL_INNER_SELECTOR) || null;
	}

	navigateTableCell(backwards = false, context) {
		const currentCell = this.getCurrentTableCellInner(context);
		const table = currentCell?.closest?.('table');

		if (!currentCell || !table) {
			return false;
		}

		const cells = Array.from(table.querySelectorAll(TABLE_CELL_INNER_SELECTOR));
		const currentIndex = cells.indexOf(currentCell);
		const nextIndex = currentIndex + (backwards ? -1 : 1);
		const targetCell = cells[nextIndex];

		if (targetCell) {
			this.selectTableCell(targetCell, context);
			return true;
		}

		if (!backwards && this.appendTableRowAfterCell(currentCell, context)) {
			const updatedCells = Array.from(table.querySelectorAll(TABLE_CELL_INNER_SELECTOR));
			const appendedTargetCell = updatedCells[currentIndex + 1];

			if (appendedTargetCell) {
				this.selectTableCell(appendedTargetCell, context);
			}
		}

		return true;
	}

	appendTableRowAfterCell(cell, context) {
		const blot = context?.findBlot?.(cell, true);
		const tableModule = this.getTableModule(context);

		if (!blot || !tableModule?.appendRow) {
			return false;
		}

		tableModule.appendRow([blot], true);
		context?.quill?.update?.('user');
		return true;
	}

	selectTableCell(cell, context) {
		const blot = context?.findBlot?.(cell, true);
		const index = blot ? context?.getIndex?.(blot) : null;

		if (!Number.isInteger(index)) {
			return false;
		}

		this.getTableSelectionModule(context)?.hide?.();
		this.setFocusedTableCell(cell);
		if (typeof context?.setSelectionWithoutScroll === 'function') {
			context.setSelectionWithoutScroll(index, 0, 'user', cell);
			this.scheduleFocusedTableCellScroll(cell);
		} else {
			context?.quill?.focus?.({ preventScroll: true });
			context?.setSelection?.(index, 0, 'user');
			this.scrollTableCellIntoViewIfNeeded(cell);
		}
		return true;
	}

	scheduleBlankTableCellFocus(event, context) {
		const target = getElementFromNode(event?.target);
		const cell = this.getTableCellInnerFromNode(target);
		const musicEmbed = this.getMusicEmbedFromNode(target);

		if (!cell || this.isTableTextCursorTarget(event?.target)) {
			return false;
		}

		this.schedulePostMouseGestureTask(() => {
			if (!cell.isConnected) {
				return;
			}

			if (musicEmbed?.isConnected && this.selectAfterMusicEmbed(musicEmbed, context)) {
				return;
			}

			if (this.isQuillSelectionInTableCell(cell, context)) {
				return;
			}

			this.selectTableCell(cell, context);
		});
		return true;
	}

	schedulePostMouseGestureTask(task) {
		window.setTimeout(() => {
			if (typeof window.requestAnimationFrame === 'function') {
				window.requestAnimationFrame(task);
				return;
			}

			window.setTimeout(task, 0);
		}, 0);
	}

	getMusicEmbedFromNode(node) {
		const element = getElementFromNode(node);

		return element?.closest?.('.music-keyboard-embed') || null;
	}

	selectAfterMusicEmbed(embed, context) {
		const blot = embed ? (context?.findBlot?.(embed, false) || context?.findBlot?.(embed, true)) : null;

		if (!blot) {
			return false;
		}

		const index = context?.getIndex?.(blot);
		const length = Number(blot.length?.());

		if (!Number.isInteger(index)) {
			return false;
		}

		this.getTableSelectionModule(context)?.hide?.();
		const cell = embed.closest?.(TABLE_CELL_INNER_SELECTOR);

		this.setFocusedTableCell(cell);
		if (typeof context?.setSelectionWithoutScroll === 'function') {
			context.setSelectionWithoutScroll(
				index + (Number.isFinite(length) && length > 0 ? length : 1),
				0,
				'user',
				embed,
			);
			this.scheduleFocusedTableCellScroll(cell);
		} else {
			context?.quill?.focus?.({ preventScroll: true });
			context?.setSelection?.(
				index + (Number.isFinite(length) && length > 0 ? length : 1),
				0,
				'user',
			);
			this.scrollTableCellIntoViewIfNeeded(cell);
		}
		return true;
	}

	isTableTextCursorTarget(target) {
		const element = getElementFromNode(target);

		if (element?.closest?.('.music-keyboard-embed, [contenteditable="false"]')) {
			return false;
		}

		if (target?.nodeType === getNodeType('TEXT_NODE')) {
			return true;
		}

		if (!element) {
			return false;
		}

		const textBlock = element.closest?.('p, li, h1, h2, h3, h4, h5, h6, blockquote');

		return Boolean(textBlock && element !== textBlock);
	}

	isQuillSelectionInTableCell(cell, context) {
		const currentCell = this.getCurrentTableCellInner(context);

		return currentCell === cell || Boolean(currentCell && cell.contains(currentCell));
	}

	handleEditorSelectionChange(context) {
		const currentCell = this.getCurrentTableCellInner(context);

		if (currentCell) {
			this.setFocusedTableCell(currentCell);
			return false;
		}

		this.clearFocusedTableCell();
		return false;
	}

	setFocusedTableCell(cell) {
		const nextCell = cell?.matches?.(TABLE_CELL_INNER_SELECTOR) ? cell : null;

		if (this.focusedTableCell === nextCell) {
			return Boolean(nextCell);
		}

		this.clearFocusedTableCell();
		this.focusedTableCell = nextCell;
		this.focusedTableCell?.classList?.add(TABLE_CELL_FOCUS_CLASS);
		this.focusedTableCellBoundary = this.getTableCellFocusBoundary(this.focusedTableCell);
		this.focusedTableCellBoundary?.classList?.add(TABLE_CELL_FOCUS_CLASS);
		return Boolean(this.focusedTableCell);
	}

	getTableCellFocusBoundary(cell) {
		return cell?.closest?.('td, th') || cell || null;
	}

	clearFocusedTableCell() {
		this.focusedTableCell?.classList?.remove(TABLE_CELL_FOCUS_CLASS);
		this.focusedTableCellBoundary?.classList?.remove(TABLE_CELL_FOCUS_CLASS);
		this.focusedTableCell = null;
		this.focusedTableCellBoundary = null;
		return true;
	}

	scheduleFocusedTableCellScroll(cell) {
		this.schedulePostMouseGestureTask(() => this.scrollTableCellIntoViewIfNeeded(cell));
		return Boolean(cell);
	}

	scrollTableCellIntoViewIfNeeded(cell) {
		const boundary = this.getTableCellFocusBoundary(cell);

		if (!boundary || this.isElementFullyVisible(boundary)) {
			return false;
		}

		boundary.scrollIntoView?.({
			block: 'nearest',
			inline: 'nearest',
		});
		return true;
	}

	isElementFullyVisible(element) {
		const rect = element?.getBoundingClientRect?.();

		if (!rect) {
			return true;
		}

		const ownerWindow = element.ownerDocument?.defaultView || window;
		const viewport = {
			bottom: ownerWindow.innerHeight ?? Number.POSITIVE_INFINITY,
			left: 0,
			right: ownerWindow.innerWidth ?? Number.POSITIVE_INFINITY,
			top: 0,
		};

		return this.isRectInside(rect, viewport)
			&& this.getScrollAncestors(element).every((ancestor) => (
				this.isRectInside(rect, ancestor.getBoundingClientRect())
			));
	}

	getScrollAncestors(element) {
		const ancestors = [];
		let current = element?.parentElement || null;

		while (current) {
			if (this.canScroll(current)) {
				ancestors.push(current);
			}
			current = current.parentElement;
		}
		return ancestors;
	}

	canScroll(element) {
		return Boolean(element
			&& (element.scrollHeight > element.clientHeight || element.scrollWidth > element.clientWidth));
	}

	isRectInside(inner, outer) {
		return inner.top >= outer.top
			&& inner.left >= outer.left
			&& inner.bottom <= outer.bottom
			&& inner.right <= outer.right;
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
		this.clearFocusedTableCell();
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

		if (commandId === 'split-table-above' || commandId === 'split-table-below') {
			return this.splitTable(commandId, context);
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

	splitTable(commandId, context = {}) {
		const quill = context.quill;
		const table = context.table || context.cell?.closest?.('table') || null;
		const splitRowIndex = this.getTableSplitRowIndex(table, context);
		const tableId = this.getTableId(table, context);

		if (!quill || !tableId || splitRowIndex < 0) {
			return false;
		}

		const tableDelta = this.getTableDeltaParts(quill, tableId);

		if (!tableDelta || !tableDelta.columns.length || tableDelta.rows.length < 2) {
			return false;
		}

		const splitIndex = commandId === 'split-table-above'
			? splitRowIndex
			: splitRowIndex + 1;

		if (splitIndex <= 0 || splitIndex >= tableDelta.rows.length) {
			return false;
		}

		if (!this.canSplitRowsAt(tableDelta.rows, splitIndex)) {
			return false;
		}

		const replacement = new Delta()
			.concat(this.createTableDelta(tableDelta.columns, tableDelta.rows.slice(0, splitIndex)))
			.insert('\n')
			.concat(this.createTableDelta(tableDelta.columns, tableDelta.rows.slice(splitIndex)));
		const change = new Delta()
			.retain(tableDelta.index)
			.delete(tableDelta.length)
			.concat(replacement);

		quill.updateContents(change, 'user');
		quill.update?.('user');
		return true;
	}

	getAvailableTableWidth(table, context = {}) {
		const documentWidth = Number(this.documentFormat?.getContentWidth?.());

		if (Number.isFinite(documentWidth) && documentWidth > 0) {
			return documentWidth;
		}
		return null;
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

	getTableSplitRowIndex(table, context = {}) {
		const cell = context.cell || getRenderedTableCellInnerFromBlot(context.cellBlot) || null;
		const row = cell?.closest?.('tr') || null;
		const rows = Array.from(table?.querySelectorAll?.('tr') || []);

		return row ? rows.indexOf(row) : -1;
	}

	getTableId(table, context = {}) {
		return table?.dataset?.tableId
			|| context.cell?.dataset?.tableId
			|| getRenderedTableCellInnerFromBlot(context.cellBlot)?.dataset?.tableId
			|| context.cellBlot?.formats?.()?.[blotName.tableCellInner]?.tableId
			|| null;
	}

	getTableDeltaParts(quill, tableId) {
		const ops = quill.getContents?.()?.ops || [];
		let index = 0;
		let tableIndex = null;
		let tableLength = 0;
		const columns = [];
		const rows = [];
		let currentRowId = null;
		let currentRow = [];
		let currentCell = [];
		let inTable = false;

		for (let opIndex = 0; opIndex < ops.length; opIndex++) {
			const op = ops[opIndex];
			const length = this.getDeltaOpLength(op);
			const columnValue = op.insert?.[blotName.tableCol];
			const cellValue = op.attributes?.[blotName.tableCellInner];
			const isTableColumn = columnValue?.tableId === tableId;
			const isTableCellEnd = cellValue?.tableId === tableId;

			if (!inTable && (isTableColumn || isTableCellEnd)) {
				inTable = true;
				tableIndex = index;
			}

			if (
				inTable
				&& !isTableColumn
				&& !isTableCellEnd
				&& currentCell.length === 0
				&& rows.length > 0
				&& !this.hasUpcomingTableCellEnd(ops, opIndex + 1, tableId)
			) {
				break;
			}

			if (inTable) {
				tableLength += length;
			}

			if (isTableColumn) {
				columns.push(this.cloneDeltaOp(op));
			}
			else if (inTable) {
				currentCell.push(this.cloneDeltaOp(op));

				if (isTableCellEnd) {
					if (currentRowId !== null && cellValue.rowId !== currentRowId) {
						rows.push(currentRow);
						currentRow = [];
					}
					currentRowId = cellValue.rowId;
					currentRow.push(currentCell);
					currentCell = [];
				}
			}

			index += length;
		}

		if (currentRow.length) {
			rows.push(currentRow);
		}

		if (tableIndex === null || currentCell.length) {
			return null;
		}

		return {
			columns,
			index: tableIndex,
			length: tableLength,
			rows,
		};
	}

	hasUpcomingTableCellEnd(ops, startIndex, tableId) {
		return ops.slice(startIndex).some((op) => (
			op.attributes?.[blotName.tableCellInner]?.tableId === tableId
		));
	}

	canSplitRowsAt(rows, splitIndex) {
		return rows.every((row, rowIndex) => row.every((cell) => {
			const value = this.getCellValueFromSegment(cell);
			const rowspan = Number(value?.rowspan) || 1;

			return rowIndex >= splitIndex || rowIndex + rowspan <= splitIndex;
		}));
	}

	createTableDelta(columns, rows) {
		const tableId = randomId();
		const columnIdMap = new Map();
		const rowIdMap = new Map();
		const delta = new Delta();

		columns.forEach((column) => {
			const value = column.insert?.[blotName.tableCol] || {};
			const colId = value.colId || randomId();

			if (!columnIdMap.has(colId)) {
				columnIdMap.set(colId, randomId());
			}
			delta.push(this.rewriteTableOp(column, tableId, rowIdMap, columnIdMap));
		});

		rows.forEach((row) => {
			row.forEach((cell) => {
				cell.forEach((op) => {
					delta.push(this.rewriteTableOp(op, tableId, rowIdMap, columnIdMap));
				});
			});
		});

		return delta;
	}

	rewriteTableOp(op, tableId, rowIdMap, columnIdMap) {
		const next = this.cloneDeltaOp(op);
		const columnValue = next.insert?.[blotName.tableCol];
		const cellValue = next.attributes?.[blotName.tableCellInner];

		if (columnValue) {
			const colId = columnValue.colId || randomId();

			if (!columnIdMap.has(colId)) {
				columnIdMap.set(colId, randomId());
			}
			next.insert[blotName.tableCol] = {
				...columnValue,
				colId: columnIdMap.get(colId),
				tableId,
			};
		}

		if (cellValue) {
			const rowId = cellValue.rowId || randomId();
			const colId = cellValue.colId || randomId();

			if (!rowIdMap.has(rowId)) {
				rowIdMap.set(rowId, randomId());
			}
			if (!columnIdMap.has(colId)) {
				columnIdMap.set(colId, randomId());
			}
			next.attributes[blotName.tableCellInner] = {
				...cellValue,
				colId: columnIdMap.get(colId),
				rowId: rowIdMap.get(rowId),
				tableId,
			};
		}

		return next;
	}

	getCellValueFromSegment(segment) {
		return segment.find((op) => op.attributes?.[blotName.tableCellInner])
			?.attributes?.[blotName.tableCellInner]
			|| null;
	}

	cloneDeltaOp(op) {
		return JSON.parse(JSON.stringify(op));
	}

	getDeltaOpLength(op) {
		if (typeof op.insert === 'string') {
			return op.insert.length;
		}

		return op.insert ? 1 : Number(op.retain || op.delete || 0);
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

new TableController();
