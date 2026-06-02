/* global describe it expect */

import TableContextMenu from '../TableContextMenu.jsx';

describe('TableContextMenu', function() {
	it('hides row commands for column table context menu selections', function() {
		const menu = new TableContextMenu({
			context: {
				selectionShape: 'column',
			},
		});
		const itemIds = menu.getVisibleSections().flatMap((section) => section.map((item) => item.id));

		expect(itemIds).toEqual([
			'insert-column-left',
			'insert-column-right',
			'delete-column',
			'delete-table',
		]);
	});

	it('hides column commands for row table context menu selections', function() {
		const menu = new TableContextMenu({
			context: {
				selectionShape: 'row',
			},
		});
		const itemIds = menu.getVisibleSections().flatMap((section) => section.map((item) => item.id));

		expect(itemIds).toEqual([
			'insert-row-above',
			'insert-row-below',
			'delete-row',
			'delete-table',
		]);
	});
});
