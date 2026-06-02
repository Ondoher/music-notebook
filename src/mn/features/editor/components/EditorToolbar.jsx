import React from 'react';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import MusicNotebookContext from '../../../common/MusicNotebookContext.js';
import BaseSelect from '../../../components/BaseSelect.jsx';
import FontSizePicker from '../../../components/FontSizePicker.jsx';
import LocaleString from '../../../components/LocaleString.jsx';

/**
 * Renders the editor command toolbar from the editor-toolbar service.
 *
 * @extends {React.Component<EditorToolbarProps, EditorToolbarState>}
 */
export default class EditorToolbar extends React.Component {
	static contextType = MusicNotebookContext;

	constructor(props) {
		super(props);

		this.state = {
			toolbar: props.editorToolbar?.getToolbar?.() || [],
			iconVersion: 0,
		};
	}

	componentDidMount() {
		this.subscribeToToolbar();
		this.subscribeToIconRegistry();
		this.syncFromToolbar();
	}

	componentDidUpdate(prevProps) {
		if (prevProps.editorToolbar !== this.props.editorToolbar) {
			this.unsubscribeFromToolbar(prevProps.editorToolbar);
			this.subscribeToToolbar();
			this.syncFromToolbar();
		}

		if (prevProps.iconRegistry !== this.props.iconRegistry) {
			this.unsubscribeFromIconRegistry(prevProps.iconRegistry);
			this.subscribeToIconRegistry();
			this.setState((state) => ({ iconVersion: state.iconVersion + 1 }));
		}
	}

	componentWillUnmount() {
		this.unsubscribeFromToolbar();
		this.unsubscribeFromIconRegistry();
	}

	subscribeToToolbar() {
		if (!this.props.editorToolbar?.listen) {
			return;
		}

		this.toolbarListeners = [
			['item-added', this.props.editorToolbar.listen('item-added', this.onToolbarUpdated.bind(this))],
			['item-updated', this.props.editorToolbar.listen('item-updated', this.onToolbarUpdated.bind(this))],
			['item-removed', this.props.editorToolbar.listen('item-removed', this.onToolbarUpdated.bind(this))],
		];
	}

	unsubscribeFromToolbar(editorToolbar = this.props.editorToolbar) {
		if (!editorToolbar?.unlisten || !this.toolbarListeners) {
			this.toolbarListeners = null;
			return;
		}

		this.toolbarListeners.forEach(([eventName, listener]) => {
			editorToolbar.unlisten(eventName, listener);
		});
		this.toolbarListeners = null;
	}

	subscribeToIconRegistry() {
		if (!this.props.iconRegistry?.listen) {
			return;
		}

		this.iconListeners = [
			['icon-registered', this.props.iconRegistry.listen('icon-registered', this.onIconsUpdated.bind(this))],
			['icon-hover-text-updated', this.props.iconRegistry.listen('icon-hover-text-updated', this.onIconsUpdated.bind(this))],
			['icon-removed', this.props.iconRegistry.listen('icon-removed', this.onIconsUpdated.bind(this))],
		];
	}

	unsubscribeFromIconRegistry(iconRegistry = this.props.iconRegistry) {
		if (!iconRegistry?.unlisten || !this.iconListeners) {
			this.iconListeners = null;
			return;
		}

		this.iconListeners.forEach(([eventName, listener]) => {
			iconRegistry.unlisten(eventName, listener);
		});
		this.iconListeners = null;
	}

	onToolbarUpdated(event) {
		this.setState({
			toolbar: event?.toolbar || this.props.editorToolbar?.getToolbar?.() || [],
		});
	}

	onIconsUpdated() {
		this.setState((state) => ({ iconVersion: state.iconVersion + 1 }));
	}

	syncFromToolbar() {
		this.setState({
			toolbar: this.props.editorToolbar?.getToolbar?.() || [],
		});
	}

	selectItem(item) {
		this.props.editorToolbar?.selectItem?.(item.id);
	}

	selectItemWithPayload(item, commandPayload) {
		this.props.editorToolbar?.selectItem?.(item.id, commandPayload);
	}

	getIcon(item) {
		const iconState = item.pressed ? 'pressed' : 'default';
		const Icon = this.props.iconRegistry?.getIcon?.(item.iconId, iconState);

		if (!Icon) {
			return <span className="mn-editor-toolbar__fallback-icon">{item.stringId}</span>;
		}

		return <Icon aria-hidden="true" fontSize="small" size={18} stroke={1.8} />;
	}

	getIconState(item) {
		return item.pressed ? 'pressed' : 'default';
	}

	getTooltipPhrase(item) {
		return item.tooltipStringId
			|| this.props.iconRegistry?.getIconHoverTextStringId?.(item.iconId, this.getIconState(item))
			|| item.stringId;
	}

	getLabel(item) {
		const phrase = this.getTooltipPhrase(item);
		const label = this.context?.localize?.translate?.(phrase);

		return label || phrase;
	}

	renderItem(item) {
		if (item.controlType === 'font-size') {
			return this.renderFontSizeControl(item);
		}

		if (item.controlType === 'select') {
			return this.renderSelectControl(item);
		}

		const labelText = this.getLabel(item);
		const label = <LocaleString phrase={this.getTooltipPhrase(item)} />;

		return (
			<Tooltip key={item.id} title={label} describeChild>
				<IconButton
					className="mn-editor-toolbar__button"
					aria-label={labelText}
					aria-disabled={item.enabled ? undefined : 'true'}
					aria-pressed={item.pressed === undefined ? undefined : String(item.pressed)}
					data-toolbar-item-id={item.id}
					onClick={() => this.selectItem(item)}
					size="small"
					type="button"
				>
					{this.getIcon(item)}
				</IconButton>
			</Tooltip>
		);
	}

	renderFontSizeControl(item) {
		return (
			<span
				className="mn-editor-toolbar__control mn-editor-toolbar__font-size"
				data-toolbar-item-id={item.id}
				key={item.id}
			>
				<FontSizePicker
					decrementLabel="editor.toolbar.font_size.decrease"
					incrementLabel="editor.toolbar.font_size.increase"
					label="editor.toolbar.font_size"
					labelFallback="Font size"
					onChange={(fontSize) => this.selectItemWithPayload(item, fontSize)}
					size="small"
					value={Number.isFinite(Number(item.value)) ? Number(item.value) : 12}
				/>
			</span>
		);
	}

	renderSelectControl(item) {
		return (
			<span
				className="mn-editor-toolbar__control mn-editor-toolbar__select"
				data-toolbar-item-id={item.id}
				key={item.id}
			>
				<BaseSelect
					label={item.stringId}
					labelFallback={item.stringId}
					onChange={(value) => this.selectItemWithPayload(item, value)}
					options={item.options || []}
					size="small"
					value={item.value || ''}
				/>
			</span>
		);
	}

	renderSection(section, index) {
		return (
			<React.Fragment key={section.sectionNumber}>
				{index > 0 ? <Divider className="mn-editor-toolbar__divider" flexItem orientation="vertical" /> : null}
				<span className="mn-editor-toolbar__section">
					{section.items.map((item) => this.renderItem(item))}
				</span>
			</React.Fragment>
		);
	}

	render() {
		return (
			<nav className="mn-editor-toolbar" aria-label={this.props.label || 'Editor toolbar'}>
				{this.state.toolbar.map((section, index) => this.renderSection(section, index))}
			</nav>
		);
	}
}
