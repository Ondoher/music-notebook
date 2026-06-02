import React, { Component } from 'react';
import FormControl from '@mui/material/FormControl';
import FormLabel from '@mui/material/FormLabel';

import { buildKeyboardScalePayload } from '../shared/scale-builder.js';
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
			keyMode: props.initialKeyMode || 'major',
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
			(
				previousProps.selectedKey !== this.props.selectedKey
				|| previousProps.selectedKeyMode !== this.props.selectedKeyMode
			)
			&& (
				this.props.selectedKey !== undefined
				|| this.props.selectedKeyMode !== undefined
			)
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
	 * Gets the active key quality.
	 *
	 * @returns {KeyMode}
	 */
	getKeyMode() {
		return this.props.selectedKeyMode ?? this.state.keyMode;
	}

	/**
	 * Gets the resolved scale builder result.
	 *
	 * @returns {MusicBuildResult}
	 */
	getResult() {
		return buildKeyboardScalePayload({
			key: this.getKey(),
			keyMode: this.getKeyMode(),
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
	 * Handles key quality changes from the shared key picker.
	 *
	 * @param {KeyMode} keyMode
	 * @returns {void}
	 */
	handleKeyModeChange = (keyMode) => {
		if (this.props.selectedKeyMode !== undefined) {
			return;
		}

		this.setState({ keyMode }, () => this.reportResult());
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
				mode={this.getKeyMode()}
				modeFieldClassName={fieldClassName}
				onKeyChange={this.handleKeyChange}
				onModeChange={this.handleKeyModeChange}
				showMode
				size={size}
				value={this.getKey()}
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
