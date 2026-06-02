/// <reference path="./types/DocumentFormatDialog.d.ts" />

import React from 'react';
import BaseDialog from '../../../components/BaseDialog.jsx';
import BaseSelect from '../../../components/BaseSelect.jsx';
import TextInput from '../../../components/TextInput.jsx';
import FontSizePicker from '../../../components/FontSizePicker.jsx';
import LocaleString from '../../../components/LocaleString.jsx';

const POINTS_PER_INCH = 72;

/**
 * Renders the document-format dialog.
 *
 * @extends {React.Component<DocumentFormatDialogProps, DocumentFormatDialogState>}
 */
export default class DocumentFormatDialog extends React.Component {
	constructor(props) {
		super(props);
		this.state = this.stateFromService(props);
	}

	componentDidMount() {
		this.subscribeToDocumentFormat();
	}

	componentDidUpdate(prevProps) {
		if (prevProps.documentFormat === this.props.documentFormat) {
			return;
		}

		this.unsubscribeFromDocumentFormat(prevProps.documentFormat);
		this.subscribeToDocumentFormat();
		this.setState(this.stateFromService(this.props));
	}

	componentWillUnmount() {
		this.unsubscribeFromDocumentFormat();
	}

	subscribeToDocumentFormat() {
		if (!this.props.documentFormat?.listen) {
			return;
		}

		this.dialogChangedListener = this.props.documentFormat.listen(
			'dialog-changed',
			this.onDialogChanged.bind(this),
		);
	}

	unsubscribeFromDocumentFormat(documentFormat = this.props.documentFormat) {
		if (documentFormat?.unlisten && this.dialogChangedListener) {
			documentFormat.unlisten('dialog-changed', this.dialogChangedListener);
		}

		this.dialogChangedListener = null;
	}

	pointsToInches(value) {
		const inches = Number(value || 0) / POINTS_PER_INCH;

		return Number.isInteger(inches) ? String(inches) : String(Number(inches.toFixed(2)));
	}

	inchesToPoints(value) {
		const inches = Number(value);

		if (!Number.isFinite(inches)) {
			return POINTS_PER_INCH;
		}

		return Math.max(0, Math.round(inches * POINTS_PER_INCH));
	}

	stateFromService(props) {
		const dialogState = props.documentFormat?.getDialogState?.() || {
			open: false,
			format: {
				size: 'letter',
				orientation: 'portrait',
				margins: {
					top: POINTS_PER_INCH,
					right: POINTS_PER_INCH,
					bottom: POINTS_PER_INCH,
					left: POINTS_PER_INCH,
				},
				fontSize: 12,
			},
		};

		return {
			open: dialogState.open === true,
			size: dialogState.format.size,
			orientation: dialogState.format.orientation,
			fontSize: Number.isFinite(Number(dialogState.format.fontSize))
				? Number(dialogState.format.fontSize)
				: 12,
			margins: {
				top: this.pointsToInches(dialogState.format.margins.top),
				right: this.pointsToInches(dialogState.format.margins.right),
				bottom: this.pointsToInches(dialogState.format.margins.bottom),
				left: this.pointsToInches(dialogState.format.margins.left),
			},
		};
	}

	onDialogChanged() {
		this.setState(this.stateFromService(this.props));
	}

	handleAction(buttonId) {
		if (buttonId === 'apply') {
			this.props.documentFormat?.applyFormat?.({
				size: this.state.size,
				orientation: this.state.orientation,
				fontSize: this.state.fontSize,
				margins: {
					top: this.inchesToPoints(this.state.margins.top),
					right: this.inchesToPoints(this.state.margins.right),
					bottom: this.inchesToPoints(this.state.margins.bottom),
					left: this.inchesToPoints(this.state.margins.left),
				},
			});
			return;
		}

		if (buttonId === 'cancel' || buttonId === 'close') {
			this.props.documentFormat?.closeDialog?.();
		}
	}

	updateMargin(edge, value) {
		this.setState((state) => ({
			margins: {
				...state.margins,
				[edge]: value,
			},
		}));
	}

	renderMargins() {
		return (
			<fieldset className="document-format-dialog__margins">
				<legend><LocaleString phrase="document_format.margins" /></legend>
				<TextInput
					label="document_format.margin.top"
					labelFallback="Top"
					onChange={(event) => this.updateMargin('top', event.target.value)}
					size="small"
					slotProps={{ htmlInput: { min: 0, step: 0.125 } }}
					type="number"
					value={this.state.margins.top}
				/>
				<TextInput
					label="document_format.margin.right"
					labelFallback="Right"
					onChange={(event) => this.updateMargin('right', event.target.value)}
					size="small"
					slotProps={{ htmlInput: { min: 0, step: 0.125 } }}
					type="number"
					value={this.state.margins.right}
				/>
				<TextInput
					label="document_format.margin.bottom"
					labelFallback="Bottom"
					onChange={(event) => this.updateMargin('bottom', event.target.value)}
					size="small"
					slotProps={{ htmlInput: { min: 0, step: 0.125 } }}
					type="number"
					value={this.state.margins.bottom}
				/>
				<TextInput
					label="document_format.margin.left"
					labelFallback="Left"
					onChange={(event) => this.updateMargin('left', event.target.value)}
					size="small"
					slotProps={{ htmlInput: { min: 0, step: 0.125 } }}
					type="number"
					value={this.state.margins.left}
				/>
			</fieldset>
		);
	}

	renderBody() {
		return (
			<div className="document-format-dialog__body">
				<div className="document-format-dialog__row">
					<BaseSelect
						label="document_format.size"
						labelFallback="Page size"
						onChange={(size) => this.setState({ size })}
						options={[
							{ fallback: 'Letter (8.5 x 11 in)', label: 'document_format.size.letter', value: 'letter' },
							{ fallback: 'Legal (8.5 x 14 in)', label: 'document_format.size.legal', value: 'legal' },
							{ fallback: 'A4 (210 x 297 mm)', label: 'document_format.size.a4', value: 'a4' },
							{ fallback: 'A5 (148 x 210 mm)', label: 'document_format.size.a5', value: 'a5' },
						]}
						size="small"
						value={this.state.size}
					/>
					<BaseSelect
						label="document_format.orientation"
						labelFallback="Orientation"
						onChange={(orientation) => this.setState({ orientation })}
						options={[
							{ fallback: 'Portrait', label: 'document_format.orientation.portrait', value: 'portrait' },
							{ fallback: 'Landscape', label: 'document_format.orientation.landscape', value: 'landscape' },
						]}
						size="small"
						value={this.state.orientation}
					/>
				</div>
				<FontSizePicker
					className="document-format-dialog__font-size"
					label="document_format.font_size"
					labelFallback="Font size"
					onChange={(fontSize) => this.setState({ fontSize })}
					value={this.state.fontSize}
				/>
				{this.renderMargins()}
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
						id: 'apply',
						labelKey: 'document_format.apply',
						priority: 'primary',
					},
				]}
				className="document-format-dialog"
				maxWidth="sm"
				onButtonPress={this.handleAction.bind(this)}
				open={this.state.open}
				showClose
				titleKey="document_format.dialog.title"
				descriptionKey="document_format.dialog.description"
			>
				{this.renderBody()}
			</BaseDialog>
		);
	}
}
