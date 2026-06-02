import { Service } from '@polylith/core';
import {
	getRenderedTableCellInnerFromBlot,
	getTableSelectionShape,
} from './table-selection.js';
import { TABLE_CONTEXT_MENU_VIEW } from './table-context-menu-view.js';

const INSERT_TABLE_ITEM_ID = 'table.menu.insert';

/** Registers table commands and routes them to the active editor surface. */
export default class TableController extends Service {
	constructor(registry) {
		super('table-controller', registry);
		this.implement([
			'ready',
			'registerMenuItems',
			'insertTable',
			'handleEditorInteraction',
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
			events: ['contextmenu', 'keydown'],
			handle: this.handleEditorInteraction.bind(this),
			id: 'table.context-menu',
			priority: 100,
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

	handleEditorInteraction(event, context) {
		if (context?.eventName === 'contextmenu') {
			return this.handleTableContextMenu(event, context);
		}

		if (context?.eventName === 'keydown') {
			return this.handleTableContextMenuKeyDown(event, context);
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

		const cell = context.getCurrentTableCellInner?.();
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
			interactionContext?.selectTableCell?.(commandContext.cell);
		}
	}

	getTableCellInnerFromNode(node) {
		return node?.closest?.('.ql-table-cell-inner, .table-up-cell-inner') || null;
	}

	getTableFromNode(node) {
		return node?.closest?.('table') || null;
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
			selectionShape: selectedCells.length ? getTableSelectionShape(table, selectedCells) : 'cell',
			table,
			tableModule: context.getTableModule?.() || null,
		};
	}

	getActiveTableSelectionCells(table, context) {
		const tableSelection = context.getTableSelectionModule?.();
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
		const selectedCells = this.getCommandCells(context);

		if (!tableModule || !selectedCells.length) {
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

new TableController();
