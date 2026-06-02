/* global describe it expect */

import { getTableSelectionShape } from '../table-selection.js';

function buildTwoByTwoTable() {
	const table = document.createElement('table');
	const firstRow = document.createElement('tr');
	const secondRow = document.createElement('tr');
	const cells = Array.from({ length: 4 }, () => document.createElement('div'));

	cells.forEach((cell) => {
		cell.className = 'ql-table-cell-inner';
	});
	firstRow.appendChild(cells[0]);
	firstRow.appendChild(cells[1]);
	secondRow.appendChild(cells[2]);
	secondRow.appendChild(cells[3]);
	table.appendChild(firstRow);
	table.appendChild(secondRow);

	return {
		cells,
		table,
	};
}

describe('TableSelection', function() {
	it('classifies full table column selections for context menu filtering', function() {
		const { cells, table } = buildTwoByTwoTable();

		expect(getTableSelectionShape(table, [
			{ domNode: cells[0] },
			{ domNode: cells[2] },
		])).toBe('column');
	});

	it('classifies full table row selections for context menu filtering', function() {
		const { cells, table } = buildTwoByTwoTable();

		expect(getTableSelectionShape(table, [
			{ domNode: cells[2] },
			{ domNode: cells[3] },
		])).toBe('row');
	});
});
