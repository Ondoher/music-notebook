/// <reference path="./types/MusicEmbedFormatDialog.d.ts" />

import React from 'react';
import FormatAlignCenterIcon from '@mui/icons-material/FormatAlignCenter';
import FormatAlignLeftIcon from '@mui/icons-material/FormatAlignLeft';
import FormatAlignRightIcon from '@mui/icons-material/FormatAlignRight';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatUnderlinedIcon from '@mui/icons-material/FormatUnderlined';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import BaseDialog from '../../../components/BaseDialog.jsx';
import BaseSelect from '../../../components/BaseSelect.jsx';
import FontSizePicker from '../../../components/FontSizePicker.jsx';
import LocaleString from '../../../components/LocaleString.jsx';
import MusicNotebookContext from '../../../common/MusicNotebookContext.js';
import { getLocalizedText } from '../../../common/localized-text.js';

/**
 * Renders formatting controls for a music object embed.
 *
 * @extends {React.Component<MusicEmbedFormatDialogProps>}
 */
export default class MusicEmbedFormatDialog extends React.Component {
	static contextType = MusicNotebookContext;

	getFormat() {
		return normalizeMusicEmbedFormat(this.props.format);
	}

	getLocalizedText(value, fallback = '') {
		return getLocalizedText(this.context?.localize, value, fallback);
	}

	handleButtonPress(buttonId) {
		if (buttonId === 'done') {
			this.props.onCommit?.();
			return;
		}

		if (buttonId === 'close') {
			this.props.onCancel?.();
		}
	}

	updateFormat(patch = {}) {
		this.props.onChange?.({
			...this.getFormat(),
			...patch,
		});
	}

	updateCaption(patch = {}) {
		const format = this.getFormat();

		this.updateFormat({
			caption: {
				...format.caption,
				...patch,
			},
		});
	}

	getCaptionStyleOptions() {
		return this.getDocumentStyles().map((style) => ({
			fallback: style.name,
			label: '',
			value: style.id,
		}));
	}

	getEffectiveCaptionStyleFormat(styleId = 'normal') {
		const normalizedStyleId = this.normalizeStyleId(styleId);
		const styleFormat = this.resolveStyleFormat(normalizedStyleId);

		return {
			alignment: ['left', 'center', 'right'].includes(styleFormat.alignment) ? styleFormat.alignment : 'center',
			bold: styleFormat.bold === true,
			fontSize: Number.isFinite(Number(styleFormat.fontSize)) ? Number(styleFormat.fontSize) : 12,
			italic: styleFormat.italic === true,
			styleId: normalizedStyleId,
			underline: styleFormat.underline === true,
		};
	}

	handleCaptionStyleChange = (styleId) => {
		this.updateCaption(this.getEffectiveCaptionStyleFormat(styleId));
	};

	getDocumentStyles() {
		const documentModel = this.context?.registry?.subscribe?.('document-model');
		const settings = documentModel?.getSettings?.() || {};
		const styles = Array.isArray(settings.styles) && settings.styles.length
			? settings.styles
			: [{ id: 'normal', name: 'Normal', parentStyleId: '', format: {} }];

		return styles;
	}

	resolveStyleFormat(styleId, visited = new Set()) {
		const styles = this.getDocumentStyles();
		const normalizedStyleId = this.normalizeStyleId(styleId);
		const style = styles.find((candidate) => candidate.id === normalizedStyleId);

		if (!style || visited.has(style.id)) {
			return {};
		}

		visited.add(style.id);

		return {
			...this.resolveStyleFormat(style.parentStyleId, visited),
			...(style.format || {}),
		};
	}

	normalizeStyleId(value) {
		const normalized = String(value || '')
			.trim()
			.toLowerCase()
			.replace(/[^a-z0-9_-]+/g, '-')
			.replace(/^-+|-+$/g, '');
		const styles = this.getDocumentStyles();

		return styles.some((style) => style.id === normalized)
			? normalized
			: styles[0]?.id || 'normal';
	}

	renderToggleButton({ fallback, icon, label, onClick, pressed }) {
		const labelText = this.getLocalizedText(label, fallback);

		return (
			<Tooltip title={<LocaleString phrase={label} />} describeChild>
				<IconButton
					aria-label={labelText}
					aria-pressed={String(pressed)}
					className="music-embed-format-dialog__toggle"
					onClick={onClick}
					size="small"
					type="button"
				>
					{icon}
				</IconButton>
			</Tooltip>
		);
	}

	renderAlignmentButtons() {
		const format = this.getFormat();
		const options = [
			{
				fallback: 'Left',
				icon: <FormatAlignLeftIcon aria-hidden="true" fontSize="small" />,
				label: 'music.format.alignment.left',
				value: 'left',
			},
			{
				fallback: 'Center',
				icon: <FormatAlignCenterIcon aria-hidden="true" fontSize="small" />,
				label: 'music.format.alignment.center',
				value: 'center',
			},
			{
				fallback: 'Right',
				icon: <FormatAlignRightIcon aria-hidden="true" fontSize="small" />,
				label: 'music.format.alignment.right',
				value: 'right',
			},
		];

		return (
			<fieldset className="music-embed-format-dialog__group">
				<legend><LocaleString phrase="music.format.alignment" /></legend>
				<div className="music-embed-format-dialog__button-row">
					{options.map((option) => (
						<React.Fragment key={option.value}>
							{this.renderToggleButton({
								fallback: option.fallback,
								icon: option.icon,
								label: option.label,
								onClick: () => this.updateFormat({ alignment: option.value }),
								pressed: format.alignment === option.value,
							})}
						</React.Fragment>
					))}
				</div>
			</fieldset>
		);
	}

	renderCaptionStyles() {
		const caption = this.getFormat().caption;
		const alignmentOptions = [
			{
				fallback: 'Align caption left',
				icon: <FormatAlignLeftIcon aria-hidden="true" fontSize="small" />,
				label: 'music.format.caption.alignment.left',
				value: 'left',
			},
			{
				fallback: 'Align caption center',
				icon: <FormatAlignCenterIcon aria-hidden="true" fontSize="small" />,
				label: 'music.format.caption.alignment.center',
				value: 'center',
			},
			{
				fallback: 'Align caption right',
				icon: <FormatAlignRightIcon aria-hidden="true" fontSize="small" />,
				label: 'music.format.caption.alignment.right',
				value: 'right',
			},
		];

		return (
			<fieldset className="music-embed-format-dialog__group">
				<legend><LocaleString phrase="music.format.caption_style" /></legend>
				<BaseSelect
					className="music-embed-format-dialog__caption-style"
					label="music.format.caption_style_select"
					labelFallback="Style"
					onChange={this.handleCaptionStyleChange}
					options={this.getCaptionStyleOptions()}
					size="small"
					value={this.normalizeStyleId(caption.styleId || 'normal')}
				/>
				<FontSizePicker
					className="music-embed-format-dialog__font-size"
					label="music.format.caption_font_size"
					labelFallback="Caption size"
					onChange={(fontSize) => this.updateCaption({ fontSize })}
					value={caption.fontSize}
				/>
				<div className="music-embed-format-dialog__button-row">
					{alignmentOptions.map((option) => (
						<React.Fragment key={option.value}>
							{this.renderToggleButton({
								fallback: option.fallback,
								icon: option.icon,
								label: option.label,
								onClick: () => this.updateCaption({ alignment: option.value }),
								pressed: caption.alignment === option.value,
							})}
						</React.Fragment>
					))}
				</div>
				<div className="music-embed-format-dialog__button-row">
					{this.renderToggleButton({
						fallback: 'Bold',
						icon: <FormatBoldIcon aria-hidden="true" fontSize="small" />,
						label: 'music.format.caption.bold',
						onClick: () => this.updateCaption({ bold: !caption.bold }),
						pressed: caption.bold,
					})}
					{this.renderToggleButton({
						fallback: 'Italic',
						icon: <FormatItalicIcon aria-hidden="true" fontSize="small" />,
						label: 'music.format.caption.italic',
						onClick: () => this.updateCaption({ italic: !caption.italic }),
						pressed: caption.italic,
					})}
					{this.renderToggleButton({
						fallback: 'Underline',
						icon: <FormatUnderlinedIcon aria-hidden="true" fontSize="small" />,
						label: 'music.format.caption.underline',
						onClick: () => this.updateCaption({ underline: !caption.underline }),
						pressed: caption.underline,
					})}
				</div>
			</fieldset>
		);
	}

	renderBody() {
		return (
			<div className="music-embed-format-dialog__body">
				{this.renderAlignmentButtons()}
				{this.renderCaptionStyles()}
			</div>
		);
	}

	render() {
		return (
			<BaseDialog
				buttons={[
					{
						id: 'done',
						labelKey: 'music.controls.done',
						priority: 'primary',
					},
				]}
				className="music-embed-format-dialog"
				maxWidth="xs"
				onButtonPress={this.handleButtonPress.bind(this)}
				open={this.props.open}
				showClose
				titleKey="music.format.dialog.title"
				descriptionKey="music.format.dialog.description"
			>
				{this.renderBody()}
			</BaseDialog>
		);
	}
}

export function normalizeMusicEmbedFormat(format = {}) {
	const caption = format.caption || {};
	const fontSize = Number(caption.fontSize);
	const normalizedCaption = {
		alignment: ['left', 'center', 'right'].includes(caption.alignment) ? caption.alignment : 'center',
		bold: caption.bold === true,
		fontSize: Number.isFinite(fontSize) ? Math.min(Math.max(Math.round(fontSize), 6), 144) : 12,
		italic: caption.italic === true,
		underline: caption.underline === true,
	};
	const styleId = String(caption.styleId || '').trim();

	if (styleId && styleId !== 'normal') {
		normalizedCaption.styleId = styleId;
	}

	return {
		alignment: ['left', 'center', 'right'].includes(format.alignment) ? format.alignment : 'left',
		caption: normalizedCaption,
	};
}
