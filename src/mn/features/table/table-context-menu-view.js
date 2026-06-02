import React from 'react';
import { Service } from '@polylith/core';
import TableContextMenu from './components/TableContextMenu.jsx';

export const TABLE_CONTEXT_MENU_VIEW = 'table.context-menu';

/**
 * Feature-owned editor view for table context menu rendering.
 */
export default class TableContextMenuView extends Service {
	constructor(registry) {
		super('table-context-menu-view', registry);
		this.implement(['ready', 'getComponent']);
	}

	ready() {
		this.editorViews = this.registry.subscribe('editor-views');
		this.unregisterEditorView = this.editorViews?.registerView?.(TABLE_CONTEXT_MENU_VIEW, this);
	}

	getComponent(props = {}) {
		return (
			<TableContextMenu
				anchorPosition={props.anchorPosition}
				context={props.context}
				open={props.open !== false}
				onClose={props.onClose}
				onSelect={props.onSelect}
			/>
		);
	}
}

new TableContextMenuView();
