import React, { Component } from 'react';
import FormControl from '@mui/material/FormControl';
import FormLabel from '@mui/material/FormLabel';

import {
	MODE_OPTIONS,
	SCALE_TYPE_OPTIONS,
	buildKeyboardScalePayload,
} from '../shared/scale-builder.js';
import BaseSelect from './BaseSelect.jsx';
import HelperText from './HelperText.jsx';
import KeyPicker from './KeyPicker.jsx';
import LocaleString from './LocaleString.jsx';

let scaleInputId = 0;

/**
 * Renders the grouped scale editor shared by scale type and mode entry.
 *
 * @extends {Component<ScaleInputProps>}
 */
export default class ScaleInput extends Component {
	/**
	 * Creates the initial local editor state.
	 *
	 * @param {ScaleInputProps} props
	 */
	constructor(props) {
		super(props);
		scaleInputId += 1;
		this.helperId = `mn-scale-input-${scaleInputId}-helper`;
		this.state = {
			key: props.initialKey || 'C',
			mode: props.initialMode || 'ionian',
			scaleType: props.initialScaleType || 'major',
			touched: false,
		};
	}

	/**
	 * Reports externally driven key changes after mount.
	 *
	 * @param {ScaleInputProps} previousProps
	 * @returns {void}
	 */
	componentDidUpdate(previousProps) {
		if (
			previousProps.selectedKey !== this.props.selectedKey
			&& this.props.selectedKey !== undefined
		) {
			this.props.onResultChange?.(this.getResult());
		}
	}

	/**
	 * Gets the active scale key.
	 *
	 * @returns {string}
	 */
	getKey() {
		return this.props.selectedKey ?? this.state.key;
	}

	/**
	 * Gets the resolved scale builder result.
	 *
	 * @returns {MusicBuildResult}
	 */
	getResult() {
		return buildKeyboardScalePayload({
			key: this.getKey(),
			mode: this.state.mode,
			scaleType: this.state.scaleType,
		});
	}

	/**
	 * Gets helper text for the grouped scale editor.
	 *
	 * @returns {string}
	 */
	getHelperText() {
		const result = this.getResult();

		return result.error || result.scale?.name || '';
	}

	/**
	 * Gets helper text status for the grouped scale editor.
	 *
	 * @returns {HelperTextStatus}
	 */
	getHelperStatus() {
		const result = this.getResult();

		if (!result.error) {
			return 'default';
		}

		return this.state.touched ? 'error' : 'warning';
	}

	/**
	 * Renders a literal or localized scale input label.
	 *
	 * @param {LocalizedText} label
	 * @returns {React.ReactNode}
	 */
	renderLabel(label) {
		return typeof label === 'object'
			? <LocaleString {...label} />
			: label;
	}

	/**
	 * Reports the current scale result.
	 *
	 * @returns {void}
	 */
	reportResult() {
		this.props.onResultChange?.(this.getResult());
	}

	/**
	 * Handles key changes from the shared key picker.
	 *
	 * @param {string} key
	 * @returns {void}
	 */
	handleKeyChange = (key) => {
		if (this.props.selectedKey !== undefined) {
			return;
		}

		this.setState({ key }, () => this.reportResult());
	};

	/**
	 * Handles scale type selection changes.
	 *
	 * @param {ScaleTypeValue} scaleType
	 * @returns {void}
	 */
	handleScaleTypeChange = (scaleType) => {
		this.setState({ scaleType }, () => this.reportResult());
	};

	/**
	 * Handles modal scale mode selection changes.
	 *
	 * @param {ScaleModeValue} mode
	 * @returns {void}
	 */
	handleModeChange = (mode) => {
		this.setState({ mode }, () => this.reportResult());
	};

	/**
	 * Marks the input as touched for validation status.
	 *
	 * @returns {void}
	 */
	handleBlur = () => {
		this.setState({ touched: true });
	};

	/**
	 * Stops editor-level keyboard and pointer handlers from seeing input events.
	 *
	 * @param {React.SyntheticEvent} event
	 * @returns {void}
	 */
	stopEditorEvent(event) {
		event.stopPropagation();
	}

	/**
	 * Renders optional key-context controls.
	 *
	 * @returns {React.ReactElement | null}
	 */
	renderKeyPicker() {
		const {
			fieldClassName = 'mn-scale-input-field',
			size,
			showKey = true,
		} = this.props;

		if (!showKey) {
			return null;
		}

		return (
			<KeyPicker
				className="mn-scale-input-key-picker"
				keyFieldClassName={fieldClassName}
				onKeyChange={this.handleKeyChange}
				size={size}
				value={this.getKey()}
			/>
		);
	}

	/**
	 * Renders the scale type selector.
	 *
	 * @returns {React.ReactElement}
	 */
	renderScaleTypeSelect() {
		const { fieldClassName = 'mn-scale-input-field', size } = this.props;

		return (
			<BaseSelect
				className={fieldClassName}
				label="music.controls.type"
				labelFallback="Type"
				onBlur={this.handleBlur}
				onChange={this.handleScaleTypeChange}
				options={SCALE_TYPE_OPTIONS.map((option) => ({
					fallback: option.label,
					label: option.phrase,
					value: option.value,
				}))}
				size={size}
				value={this.state.scaleType}
			/>
		);
	}

	/**
	 * Renders the modal scale mode selector.
	 *
	 * @returns {React.ReactElement | null}
	 */
	renderModeSelect() {
		const { fieldClassName = 'mn-scale-input-field', size } = this.props;

		if (this.state.scaleType !== 'mode') {
			return null;
		}

		return (
			<BaseSelect
				className={fieldClassName}
				label="music.controls.mode"
				labelFallback="Mode"
				onBlur={this.handleBlur}
				onChange={this.handleModeChange}
				options={MODE_OPTIONS.map((option) => ({
					fallback: option.label,
					label: option.phrase,
					value: option.value,
				}))}
				size={size}
				value={this.state.mode}
			/>
		);
	}

	/**
	 * Renders the grouped scale input.
	 *
	 * @returns {React.ReactElement}
	 */
	render() {
		const {
			helperClassName = 'mn-scale-input-helper',
			label = { fallback: 'Scale', phrase: 'music.edit_mode.scale' },
			labelClassName = 'mn-scale-input-label',
			rootClassName = 'mn-scale-input',
		} = this.props;
		const helperText = this.getHelperText();
		const helperStatus = this.getHelperStatus();
		const className = helperStatus === 'error'
			? `${rootClassName} invalid`
			: rootClassName;
		const controlsClassName = `${rootClassName}-controls`;

		return (
			<FormControl
				className={className}
				component="fieldset"
				error={helperStatus === 'error'}
				onClick={this.stopEditorEvent}
				onKeyDown={this.stopEditorEvent}
				onMouseDown={this.stopEditorEvent}
				onPointerDown={this.stopEditorEvent}
			>
				<FormLabel component="legend" className={labelClassName}>
					{this.renderLabel(label)}
				</FormLabel>
				<div className={controlsClassName}>
					{this.renderKeyPicker()}
					{this.renderScaleTypeSelect()}
					{this.renderModeSelect()}
				</div>
				<HelperText
					className={helperClassName}
					helperText={helperText}
					id={this.helperId}
					localize={false}
					status={helperStatus}
				/>
			</FormControl>
		);
	}
}
