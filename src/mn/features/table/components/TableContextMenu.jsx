import React from 'react';
import Divider from '@mui/material/Divider';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';

export const TABLE_CONTEXT_MENU_SECTIONS = [
	[
		{ id: 'insert-row-above', label: 'Insert row above', target: 'row' },
		{ id: 'insert-row-below', label: 'Insert row below', target: 'row' },
	],
	[
		{ id: 'insert-column-left', label: 'Insert column left', target: 'column' },
		{ id: 'insert-column-right', label: 'Insert column right', target: 'column' },
	],
	[
		{ id: 'split-table-above', label: 'Split table above', target: 'row' },
		{ id: 'split-table-below', label: 'Split table below', target: 'row' },
	],
	[
		{ id: 'fit-table-to-width', label: 'Fit to width', target: 'table' },
		{ id: 'distribute-table-columns', label: 'Distribute columns', target: 'table' },
	],
	[
		{ id: 'delete-row', label: 'Delete row', target: 'row' },
		{ id: 'delete-column', label: 'Delete column', target: 'column' },
		{ id: 'delete-table', label: 'Delete table', target: 'table' },
	],
];

/**
 * Renders the accessible context menu for table commands.
 *
 * @extends {React.Component<TableContextMenuProps>}
 */
export default class TableContextMenu extends React.Component {
	handleItemClick(commandId) {
		this.props.onSelect?.(commandId, this.props.context);
	}

	getVisibleSections() {
		const selectionShape = this.props.context?.selectionShape || 'cell';

		return TABLE_CONTEXT_MENU_SECTIONS
			.map((section) => section.filter((item) => this.isItemVisible(item, selectionShape)))
			.filter((section) => section.length > 0);
	}

	isItemVisible(item, selectionShape) {
		if (item.target === 'table' || selectionShape === 'cell') {
			return true;
		}

		return item.target === selectionShape;
	}

	renderItem(item) {
		return (
			<MenuItem
				key={item.id}
				onClick={() => this.handleItemClick(item.id)}
			>
				{item.label}
			</MenuItem>
		);
	}

	renderSection(section, index) {
		return (
			<React.Fragment key={section[0]?.id || index}>
				{index > 0 ? <Divider /> : null}
				{section.map((item) => this.renderItem(item))}
			</React.Fragment>
		);
	}

	render() {
		const anchorPosition = this.props.anchorPosition || { left: 0, top: 0 };
		const sections = this.getVisibleSections();

		return (
			<Menu
				id="mn-table-context-menu"
				anchorReference="anchorPosition"
				anchorPosition={anchorPosition}
				open={this.props.open === true}
				onClose={this.props.onClose}
				MenuListProps={{
					'aria-label': 'Table commands',
				}}
			>
				{sections.map((section, index) => this.renderSection(section, index))}
			</Menu>
		);
	}
}
