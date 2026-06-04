/// <reference path="./types/ParagraphFormatDialog.d.ts" />

import React from 'react';
import FormatAlignCenterIcon from '@mui/icons-material/FormatAlignCenter';
import FormatAlignJustifyIcon from '@mui/icons-material/FormatAlignJustify';
import FormatAlignLeftIcon from '@mui/icons-material/FormatAlignLeft';
import FormatAlignRightIcon from '@mui/icons-material/FormatAlignRight';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatUnderlinedIcon from '@mui/icons-material/FormatUnderlined';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import BaseCheckbox from '../../../components/BaseCheckbox.jsx';
import BaseDialog from '../../../components/BaseDialog.jsx';
import BaseSelect from '../../../components/BaseSelect.jsx';
import FontSizePicker from '../../../components/FontSizePicker.jsx';
import LocaleString from '../../../components/LocaleString.jsx';
import MusicNotebookContext from '../../../common/MusicNotebookContext.js';
import { getLocalizedText } from '../../../common/localized-text.js';

/**
 * Renders the paragraph-format dialog.
 *
 * @extends {React.Component<ParagraphFormatDialogProps, ParagraphFormatDialogState>}
 */
export default class ParagraphFormatDialog extends React.Component {
	static contextType = MusicNotebookContext;

	constructor(props) {
		super(props);
		this.state = this.stateFromService(props);
	}

	componentDidMount() {
		this.subscribeToParagraphFormat();
	}

	componentDidUpdate(prevProps) {
		if (prevProps.paragraphFormat === this.props.paragraphFormat) {
			return;
		}

		this.unsubscribeFromParagraphFormat(prevProps.paragraphFormat);
		this.subscribeToParagraphFormat();
		this.setState(this.stateFromService(this.props));
	}

	componentWillUnmount() {
		this.unsubscribeFromParagraphFormat();
	}

	subscribeToParagraphFormat() {
		if (!this.props.paragraphFormat?.listen) {
			return;
		}

		this.dialogChangedListener = this.props.paragraphFormat.listen(
			'dialog-changed',
			this.onDialogChanged.bind(this),
		);
	}

	unsubscribeFromParagraphFormat(paragraphFormat = this.props.paragraphFormat) {
		if (paragraphFormat?.unlisten && this.dialogChangedListener) {
			paragraphFormat.unlisten('dialog-changed', this.dialogChangedListener);
		}

		this.dialogChangedListener = null;
	}

	stateFromService(props) {
		const dialogState = props.paragraphFormat?.getDialogState?.() || {
			open: false,
			format: {
				alignment: 'left',
				bold: false,
				fontSize: 12,
				italic: false,
				overrides: {
					alignment: false,
					bold: false,
					fontSize: false,
					italic: false,
					keepWithNext: false,
					paddingAfter: false,
					paddingBefore: false,
					start: false,
					underline: false,
				},
				keepWithNext: false,
				paddingAfter: 0,
				paddingBefore: 0,
				start: 'continuous',
				styleId: 'normal',
				underline: false,
			},
		};

		return {
			open: dialogState.open === true,
			alignment: dialogState.format.alignment || 'left',
			bold: dialogState.format.bold === true,
			fontSize: Number.isFinite(Number(dialogState.format.fontSize))
				? Number(dialogState.format.fontSize)
				: 12,
			italic: dialogState.format.italic === true,
			overrides: dialogState.format.overrides || {
				alignment: false,
				bold: false,
				fontSize: false,
				italic: false,
				keepWithNext: false,
				paddingAfter: false,
				paddingBefore: false,
				start: false,
				underline: false,
			},
			keepWithNext: dialogState.format.keepWithNext === true,
			paddingAfter: Number.isFinite(Number(dialogState.format.paddingAfter))
				? Number(dialogState.format.paddingAfter)
				: 0,
			paddingBefore: Number.isFinite(Number(dialogState.format.paddingBefore))
				? Number(dialogState.format.paddingBefore)
				: 0,
			start: dialogState.format.start || 'continuous',
			styleId: dialogState.format.styleId || 'normal',
			underline: dialogState.format.underline === true,
			dirtyFields: [],
		};
	}

	onDialogChanged() {
		this.setState(this.stateFromService(this.props));
	}

	handleAction(buttonId) {
		if (buttonId === 'apply') {
			this.props.paragraphFormat?.applyFormat?.(this.getFormatPatch());
			return;
		}

		if (buttonId === 'reset') {
			this.props.paragraphFormat?.resetFormat?.(this.state.styleId);
			return;
		}

		if (buttonId === 'cancel' || buttonId === 'close') {
			this.props.paragraphFormat?.closeDialog?.();
		}
	}

	getLocalizedText(value, fallback = '') {
		return getLocalizedText(this.context?.localize, value, fallback);
	}

	getFormatPatch() {
		const fields = new Set(this.state.dirtyFields || []);
		const patch = {};

		[
			'alignment',
			'bold',
			'fontSize',
			'keepWithNext',
			'italic',
			'paddingAfter',
			'paddingBefore',
			'start',
			'styleId',
			'underline',
		].forEach((field) => {
			if (fields.has(field)) {
				patch[field] = this.state[field];
			}
		});

		return patch;
	}

	markDirty(field, patch) {
		this.setState((state) => ({
			...patch,
			dirtyFields: Array.from(new Set([...(state.dirtyFields || []), field])),
		}));
	}

	handleStyleChange = (styleId) => {
		const effectiveFormat = this.props.paragraphFormat?.getEffectiveStyleFormat?.(styleId) || {};

		this.markDirty('styleId', {
			alignment: effectiveFormat.alignment || 'left',
			bold: effectiveFormat.bold === true,
			fontSize: Number.isFinite(Number(effectiveFormat.fontSize)) ? Number(effectiveFormat.fontSize) : 12,
			italic: effectiveFormat.italic === true,
			keepWithNext: effectiveFormat.keepWithNext === true,
			paddingAfter: Number.isFinite(Number(effectiveFormat.paddingAfter)) ? Number(effectiveFormat.paddingAfter) : 0,
			paddingBefore: Number.isFinite(Number(effectiveFormat.paddingBefore)) ? Number(effectiveFormat.paddingBefore) : 0,
			start: effectiveFormat.start || 'continuous',
			styleId,
			underline: effectiveFormat.underline === true,
		});
	};

	renderToggleButton({ className, fallback, icon, label, onClick, pressed }) {
		const labelText = this.getLocalizedText(label, fallback);

		return (
			<Tooltip title={<LocaleString phrase={label} />} describeChild>
				<IconButton
					aria-label={labelText}
					aria-pressed={String(pressed)}
					className={className}
					onClick={onClick}
					size="small"
					type="button"
				>
					{icon}
				</IconButton>
			</Tooltip>
		);
	}

	renderFontStyles() {
		return (
			<fieldset className="paragraph-format-dialog__group paragraph-format-dialog__font-styles">
				<legend><LocaleString phrase="paragraph_format.font_style" /></legend>
				<div className="paragraph-format-dialog__button-row">
					{this.renderToggleButton({
						className: 'paragraph-format-dialog__toggle',
						fallback: 'Bold',
						icon: <FormatBoldIcon aria-hidden="true" fontSize="small" />,
						label: 'paragraph_format.font_style.bold',
						onClick: () => this.markDirty('bold', { bold: !this.state.bold }),
						pressed: this.state.bold,
					})}
					{this.renderToggleButton({
						className: 'paragraph-format-dialog__toggle',
						fallback: 'Italic',
						icon: <FormatItalicIcon aria-hidden="true" fontSize="small" />,
						label: 'paragraph_format.font_style.italic',
						onClick: () => this.markDirty('italic', { italic: !this.state.italic }),
						pressed: this.state.italic,
					})}
					{this.renderToggleButton({
						className: 'paragraph-format-dialog__toggle',
						fallback: 'Underline',
						icon: <FormatUnderlinedIcon aria-hidden="true" fontSize="small" />,
						label: 'paragraph_format.font_style.underline',
						onClick: () => this.markDirty('underline', { underline: !this.state.underline }),
						pressed: this.state.underline,
					})}
				</div>
			</fieldset>
		);
	}

	renderAlignmentOptions() {
		const options = [
			{
				fallback: 'Left',
				icon: <FormatAlignLeftIcon aria-hidden="true" fontSize="small" />,
				label: 'paragraph_format.alignment.left',
				value: 'left',
			},
			{
				fallback: 'Center',
				icon: <FormatAlignCenterIcon aria-hidden="true" fontSize="small" />,
				label: 'paragraph_format.alignment.center',
				value: 'center',
			},
			{
				fallback: 'Right',
				icon: <FormatAlignRightIcon aria-hidden="true" fontSize="small" />,
				label: 'paragraph_format.alignment.right',
				value: 'right',
			},
			{
				fallback: 'Justify',
				icon: <FormatAlignJustifyIcon aria-hidden="true" fontSize="small" />,
				label: 'paragraph_format.alignment.justify',
				value: 'justify',
			},
		];

		return (
			<fieldset className="paragraph-format-dialog__group paragraph-format-dialog__alignment">
				<legend><LocaleString phrase="paragraph_format.alignment" /></legend>
				<div className="paragraph-format-dialog__button-row">
					{options.map((option) => (
						<React.Fragment key={option.value}>
							{this.renderToggleButton({
								className: 'paragraph-format-dialog__toggle',
								fallback: option.fallback,
								icon: option.icon,
								label: option.label,
								onClick: () => this.markDirty('alignment', { alignment: option.value }),
								pressed: this.state.alignment === option.value,
							})}
						</React.Fragment>
					))}
				</div>
			</fieldset>
		);
	}

	renderBody() {
		return (
			<div className="paragraph-format-dialog__body">
				<BaseSelect
					label="paragraph_format.style"
					labelFallback="Style"
					onChange={this.handleStyleChange}
					options={this.props.paragraphFormat?.getStyleOptions?.() || [
						{ fallback: 'Normal', label: '', value: 'normal' },
					]}
					size="small"
					value={this.state.styleId}
				/>
				<FontSizePicker
					className="paragraph-format-dialog__font-size"
					label="paragraph_format.font_size"
					labelFallback="Font size"
					onChange={(fontSize) => this.markDirty('fontSize', { fontSize })}
					value={this.state.fontSize}
				/>
				<div className="paragraph-format-dialog__spacing">
					<FontSizePicker
						className="paragraph-format-dialog__spacing-field"
						decrementLabel="paragraph_format.padding_before.decrease"
						incrementLabel="paragraph_format.padding_before.increase"
						label="paragraph_format.padding_before"
						labelFallback="Padding before"
						max={240}
						min={0}
						onChange={(paddingBefore) => this.markDirty('paddingBefore', { paddingBefore })}
						value={this.state.paddingBefore}
					/>
					<FontSizePicker
						className="paragraph-format-dialog__spacing-field"
						decrementLabel="paragraph_format.padding_after.decrease"
						incrementLabel="paragraph_format.padding_after.increase"
						label="paragraph_format.padding_after"
						labelFallback="Padding after"
						max={240}
						min={0}
						onChange={(paddingAfter) => this.markDirty('paddingAfter', { paddingAfter })}
						value={this.state.paddingAfter}
					/>
				</div>
				{this.renderFontStyles()}
				<BaseCheckbox
					checked={this.state.keepWithNext}
					label="paragraph_format.keep_with_next"
					labelFallback="Keep with next"
					onChange={(keepWithNext) => this.markDirty('keepWithNext', { keepWithNext })}
					size="small"
				/>
				<BaseSelect
					label="paragraph_format.start"
					labelFallback="Start"
					onChange={(start) => this.markDirty('start', { start })}
					options={[
						{ fallback: 'Continuous', label: 'paragraph_format.start.continuous', value: 'continuous' },
						{ fallback: 'Full line', label: 'paragraph_format.start.full_line', value: 'full-line' },
						{ fallback: 'Next page', label: 'paragraph_format.start.next_page', value: 'next-page' },
					]}
					size="small"
					value={this.state.start}
				/>
				{this.renderAlignmentOptions()}
			</div>
		);
	}

	render() {
		return (
			<BaseDialog
				buttons={[
					{
						id: 'cancel',
						labelKey: 'common.cancel',
						priority: 'secondary',
					},
					{
						id: 'reset',
						labelKey: 'paragraph_format.reset',
						priority: 'secondary',
					},
					{
						id: 'apply',
						labelKey: 'paragraph_format.apply',
						priority: 'primary',
					},
				]}
				className="paragraph-format-dialog"
				maxWidth="xs"
				onButtonPress={this.handleAction.bind(this)}
				open={this.state.open}
				showClose
				titleKey="paragraph_format.dialog.title"
				descriptionKey="paragraph_format.dialog.description"
			>
				{this.renderBody()}
			</BaseDialog>
		);
	}
}
