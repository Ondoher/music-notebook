/**
 * Classifies selected table cells as full rows, full columns, or ordinary cells.
 *
 * @param {HTMLTableElement} table
 * @param {unknown[]} selectedCells
 * @returns {'row' | 'column' | 'cell'}
 */
export function getTableSelectionShape(table, selectedCells) {
	const selectedInners = new Set(
		selectedCells
			.map((cell) => getRenderedTableCellInnerFromBlot(cell))
			.filter(Boolean),
	);
	const rows = Array.from(table.querySelectorAll('tr'));
	const rowCells = rows
		.map((row) => Array.from(row.querySelectorAll('.ql-table-cell-inner, .table-up-cell-inner')))
		.filter((cells) => cells.length > 0);

	if (!selectedInners.size || !rowCells.length) {
		return 'cell';
	}

	const selectedRowCount = rowCells.filter((cells) => (
		cells.length > 0 && cells.every((cell) => selectedInners.has(cell))
	)).length;
	const columnCount = Math.max(...rowCells.map((cells) => cells.length));
	let selectedColumnCount = 0;

	for (let index = 0; index < columnCount; index += 1) {
		const columnCells = rowCells.map((cells) => cells[index]).filter(Boolean);

		if (columnCells.length > 0 && columnCells.every((cell) => selectedInners.has(cell))) {
			selectedColumnCount += 1;
		}
	}

	const isRowSelection = selectedRowCount > 0 && selectedInners.size === selectedRowCount * columnCount;
	const isColumnSelection = selectedColumnCount > 0 && selectedInners.size === selectedColumnCount * rowCells.length;

	if (isColumnSelection && !isRowSelection) {
		return 'column';
	}

	if (isRowSelection && !isColumnSelection) {
		return 'row';
	}

	return 'cell';
}

/**
 * Gets the rendered TableUp cell-inner element represented by a cell blot.
 *
 * @param {unknown} cell
 * @returns {HTMLElement | null}
 */
export function getRenderedTableCellInnerFromBlot(cell) {
	const domNode = cell?.domNode || cell?.parent?.domNode || null;

	if (!domNode?.closest) {
		return null;
	}

	if (domNode.matches?.('.ql-table-cell-inner, .table-up-cell-inner')) {
		return domNode;
	}

	return domNode.querySelector?.('.ql-table-cell-inner, .table-up-cell-inner')
		|| domNode.closest('.ql-table-cell-inner, .table-up-cell-inner')
		|| null;
}
