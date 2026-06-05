/// <reference path="./types/DocumentTabs.d.ts" />

import React from 'react';
import AddIcon from '@mui/icons-material/Add';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import IconButton from '@mui/material/IconButton';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import {
	closestCenter,
	DndContext,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
} from '@dnd-kit/core';
import {
	horizontalListSortingStrategy,
	SortableContext,
	sortableKeyboardCoordinates,
	useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import LocaleString from '../../../components/LocaleString.jsx';
import MusicNotebookContext from '../../../common/MusicNotebookContext.js';

/**
 * Renders one sortable document tab.
 *
 * @param {SortableDocumentTabProps} props
 * @returns {React.ReactElement}
 */
function SortableDocumentTab(props) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: props.tab.id });
	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		zIndex: isDragging ? 2 : undefined,
	};

	return (
		<Tab
			ref={setNodeRef}
			{...attributes}
			{...listeners}
			className="mn-document-tabs__tab"
			data-tab-id={props.tab.id}
			fullWidth={props.fullWidth}
			label={props.label}
			onChange={props.onChange}
			onDoubleClick={(event) => props.onEdit(props.tab, event.currentTarget)}
			selected={props.selected}
			textColor={props.textColor}
			style={style}
			value={props.value}
		/>
	);
}

/**
 * Supplies dnd-kit sensors around MUI tabs.
 *
 * @param {SortableDocumentTabsRegionProps} props
 * @returns {React.ReactElement}
 */
function SortableDocumentTabsRegion(props) {
	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: {
				distance: 6,
			},
		}),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);
	const tabIds = props.tabs.map((tab) => tab.id);
	const activeIndex = props.tabs.findIndex((tab) => tab.id === props.activeTabId);

	return (
		<DndContext
			collisionDetection={closestCenter}
			onDragEnd={props.onDragEnd}
			sensors={sensors}
		>
			<SortableContext items={tabIds} strategy={horizontalListSortingStrategy}>
				<Tabs
					className="mn-document-tabs__tabs"
					onChange={props.onSelectTab}
					scrollButtons={false}
					value={activeIndex === -1 ? false : activeIndex}
					variant="scrollable"
				>
					{props.tabs.map((tab, index) => (
						<SortableDocumentTab
							key={tab.id}
							label={props.getTabLabel(tab, index)}
							onEdit={props.onEdit}
							tab={tab}
						/>
					))}
				</Tabs>
			</SortableContext>
		</DndContext>
	);
}

/**
 * Renders persisted notebook tabs and emits tab interaction callbacks.
 *
 * @extends {React.Component<DocumentTabsProps, DocumentTabsState>}
 */
export default class DocumentTabs extends React.Component {
	static contextType = MusicNotebookContext;

	constructor(props) {
		super(props);

		this.state = {
			editingTabId: '',
			editingTitle: '',
			editorStyle: null,
		};
		this.rootRef = React.createRef();
		this.inputRef = React.createRef();
	}

	componentDidUpdate(prevProps, prevState) {
		this.focusEditor(prevState);
	}

	componentWillUnmount() {
		if (this.focusEditorTimeout) {
			window.clearTimeout(this.focusEditorTimeout);
			this.focusEditorTimeout = null;
		}

	}

	focusEditor(prevState = {}) {
		if (
			!this.state.editingTabId ||
			prevState.editingTabId === this.state.editingTabId ||
			!this.inputRef.current
		) {
			return;
		}

		this.focusEditorTimeout = window.setTimeout(() => {
			this.focusEditorTimeout = null;

			if (!this.inputRef.current) {
				return;
			}

			this.inputRef.current.focus();
			this.inputRef.current.select();
		}, 0);
	}

	getLocalize() {
		return this.context?.localize || null;
	}

	translate(phrase, replacements = {}, fallback = '') {
		return this.getLocalize()?.translate?.(phrase, replacements) || fallback;
	}

	getTabLabel(tab, index) {
		const title = String(tab.title || '').trim();

		return title || this.translate('app.tabs.untitled', { number: index + 1 }, `Tab ${index + 1}`);
	}

	getActiveTabIndex() {
		return this.getTabs().findIndex((tab) => tab.id === this.getActiveTabId());
	}

	getTabs() {
		return Array.isArray(this.props.tabs) ? this.props.tabs : [];
	}

	getActiveTabId() {
		return this.props.activeTabId || '';
	}

	selectTab(tabId) {
		this.props.onSelectTab?.(tabId);
	}

	beginEditTab(tab, tabElement) {
		this.selectTab(tab.id);

		const rootRect = this.rootRef.current?.getBoundingClientRect?.();
		const tabRect = tabElement?.getBoundingClientRect?.();

		if (!rootRect || !tabRect) {
			return;
		}

		this.setState({
			editingTabId: tab.id,
			editingTitle: tab.title || '',
			editorStyle: {
				left: `${tabRect.left - rootRect.left}px`,
				top: `${tabRect.top - rootRect.top}px`,
				width: `${tabRect.width}px`,
				height: `${tabRect.height}px`,
			},
		});
	}

	handleTabStripDoubleClick(event) {
		const tabElement = event.target?.closest?.('[data-tab-id]');
		const tabId = tabElement?.getAttribute?.('data-tab-id');
		const tab = this.getTabs().find((candidate) => candidate.id === tabId);

		if (!tab) {
			return;
		}

		this.beginEditTab(tab, tabElement);
	}

	setEditingTitle(title) {
		this.setState({ editingTitle: title });
	}

	handleEditorInput(event) {
		this.setEditingTitle(event.target.value);
	}

	commitEditTab() {
		if (!this.state.editingTabId) {
			return;
		}

		const title = this.inputRef.current
			? this.inputRef.current.value
			: this.state.editingTitle;

		this.props.onRenameTab?.(this.state.editingTabId, title);
		this.setState({
			editingTabId: '',
			editingTitle: '',
			editorStyle: null,
		});
	}

	cancelEditTab() {
		this.setState({
			editingTabId: '',
			editingTitle: '',
			editorStyle: null,
		});
	}

	handleEditorKeyDown(event) {
		if (event.key === 'Enter') {
			event.preventDefault();
			this.commitEditTab();
		}

		if (event.key === 'Escape') {
			event.preventDefault();
			this.cancelEditTab();
		}
	}

	addTab() {
		this.props.onAddTab?.(this.getActiveTabId());
	}

	moveActiveTab(offset) {
		const activeIndex = this.getActiveTabIndex();
		const nextIndex = activeIndex + offset;

		if (activeIndex === -1 || nextIndex < 0 || nextIndex >= this.getTabs().length) {
			return;
		}

		this.props.onMoveTab?.(this.getActiveTabId(), nextIndex);
	}

	handleDragEnd(event) {
		const activeId = event?.active?.id;
		const overId = event?.over?.id;

		if (!activeId || !overId || activeId === overId) {
			return;
		}

		const nextIndex = this.getTabs().findIndex((tab) => tab.id === overId);

		if (nextIndex === -1) {
			return;
		}

		this.props.onMoveTab?.(activeId, nextIndex);
	}

	render() {
		const tabs = this.getTabs();
		const activeTabId = this.getActiveTabId();
		const activeIndex = this.getActiveTabIndex();
		const canMoveLeft = activeIndex > 0;
		const canMoveRight = activeIndex !== -1 && activeIndex < tabs.length - 1;

		if (!tabs.length) {
			return null;
		}

		return (
			<nav
				ref={this.rootRef}
				className="mn-document-tabs"
				aria-label={this.translate('app.tabs.label', {}, 'Document tabs')}
				onDoubleClickCapture={(event) => this.handleTabStripDoubleClick(event)}
			>
				<div className="mn-document-tabs__track">
					<SortableDocumentTabsRegion
						activeTabId={activeTabId}
						getTabLabel={this.getTabLabel.bind(this)}
						onDragEnd={this.handleDragEnd.bind(this)}
						onEdit={(tab, tabElement) => this.beginEditTab(tab, tabElement)}
						onSelectTab={(event, tabIndex) => {
							const tab = tabs[tabIndex];

							if (tab) {
								this.selectTab(tab.id);
							}
						}}
						tabs={tabs}
					/>
				</div>
				<div className="mn-document-tabs__actions">
					<IconButton
						aria-label={this.translate('app.tabs.move_left', {}, 'Move tab left')}
						className="mn-document-tabs__action"
						disabled={!canMoveLeft}
						onClick={() => this.moveActiveTab(-1)}
						size="small"
					>
						<ChevronLeftIcon fontSize="small" />
					</IconButton>
					<IconButton
						aria-label={this.translate('app.tabs.move_right', {}, 'Move tab right')}
						className="mn-document-tabs__action"
						disabled={!canMoveRight}
						onClick={() => this.moveActiveTab(1)}
						size="small"
					>
						<ChevronRightIcon fontSize="small" />
					</IconButton>
					<IconButton
						aria-label={this.translate('app.tabs.add', {}, 'Add tab')}
						className="mn-document-tabs__action"
						onClick={() => this.addTab()}
						size="small"
					>
						<AddIcon fontSize="small" />
					</IconButton>
				</div>
				<span className="mn-document-tabs__sr-label">
					<LocaleString phrase="app.tabs.drag_hint" />
				</span>
				{this.state.editingTabId ? (
					<input
						ref={this.inputRef}
						aria-label={this.translate('app.tabs.rename', {}, 'Rename tab')}
						className="mn-document-tabs__editor"
						onBlur={() => this.commitEditTab()}
						onChange={(event) => this.handleEditorInput(event)}
						onInput={(event) => this.handleEditorInput(event)}
						onKeyDown={(event) => this.handleEditorKeyDown(event)}
						style={this.state.editorStyle || undefined}
						value={this.state.editingTitle}
					/>
				) : null}
			</nav>
		);
	}
}
