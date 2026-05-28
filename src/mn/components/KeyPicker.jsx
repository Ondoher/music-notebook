import React, { Component } from 'react';
import BaseCheckbox from './BaseCheckbox.jsx';
import BaseSelect from './BaseSelect.jsx';
import BaseTextInput from './BaseTextInput.jsx';
import { KEY_OPTIONS } from '../shared/key-options.js';

let keyPickerId = 0;
const KEY_MODE_OPTIONS = Object.freeze([
	{ fallback: 'Major', label: 'music.key_mode.major', value: 'major' },
	{ fallback: 'Minor', label: 'music.key_mode.minor', value: 'minor' },
]);
const ACCIDENTAL_DISPLAY = Object.freeze({
	'#': '♯',
	'##': '𝄪',
	b: '♭',
	bb: '𝄫',
});

/**
 * Renders a localized key picker with a datalist of common music keys.
 *
 * @extends {Component<KeyPickerProps>}
 */
export default class KeyPicker extends Component {
	/**
	 * Creates a stable fallback id for the datalist.
	 *
	 * @param {KeyPickerProps} props
	 */
	constructor(props) {
		super(props);
		keyPickerId += 1;
		this.fallbackId = `mn-key-picker-options-${keyPickerId}`;
	}

	/**
	 * Reports a changed key value.
	 *
	 * @param {React.ChangeEvent<HTMLInputElement>} event
	 * @returns {void}
	 */
	handleKeyChange = (event) => {
		this.props.onKeyChange?.(event.target.value);
	};

	/**
	 * Reports a changed key mode value.
	 *
	 * @param {KeyMode} keyMode
	 * @returns {void}
	 */
	handleModeChange = (keyMode) => {
		this.props.onModeChange?.(keyMode);
	};

	/**
	 * Reports a changed enharmonic key preference.
	 *
	 * @param {boolean} useEnharmonicKey
	 * @returns {void}
	 */
	handleUseEnharmonicKeyChange = (useEnharmonicKey) => {
		this.props.onUseEnharmonicKeyChange?.(useEnharmonicKey);
	};

	/**
	 * Gets the normalized key mode value for the mode selector.
	 *
	 * @returns {KeyMode}
	 */
	getModeValue() {
		return this.props.mode === 'minor' ? 'minor' : 'major';
	}

	/**
	 * Renders the key name input field.
	 *
	 * @returns {React.ReactElement}
	 */
	renderKeyField() {
		const {
			keyFieldClassName,
			label = { fallback: 'Key', phrase: 'music.controls.key' },
			options = KEY_OPTIONS,
			size,
			value,
		} = this.props;

		return (
			<>
				<BaseTextInput
					className={keyFieldClassName || 'mn-key-picker-key-field'}
					label={label}
					onChange={this.handleKeyChange}
					slotProps={{
						htmlInput: {
							list: this.fallbackId,
						},
					}}
					size={size}
					value={value}
				/>
				<datalist id={this.fallbackId}>
					{options.map((option) => (
						<option key={option} value={option} />
					))}
				</datalist>
			</>
		);
	}

	/**
	 * Renders the optional major/minor mode selector.
	 *
	 * @returns {React.ReactElement | null}
	 */
	renderModeField() {
		const {
			modeFieldClassName,
			modeLabel = { fallback: 'Mode', phrase: 'music.controls.key_mode' },
			size,
			showMode = false,
		} = this.props;

		if (!showMode) {
			return null;
		}

		return (
			<BaseSelect
				className={modeFieldClassName || 'mn-key-picker-mode-field'}
				label={modeLabel}
				onChange={this.handleModeChange}
				options={KEY_MODE_OPTIONS}
				size={size}
				value={this.getModeValue()}
			/>
		);
	}

	/**
	 * Renders the optional enharmonic key preference.
	 *
	 * @returns {React.ReactElement | null}
	 */
	renderEnharmonicField() {
		const {
			enharmonicFieldClassName,
			enharmonicKey,
			size,
			useEnharmonicKey = true,
		} = this.props;

		if (!enharmonicKey) {
			return null;
		}

		const enharmonicKeyLabel = formatKeyLabel(enharmonicKey);

		return (
			<BaseCheckbox
				checked={useEnharmonicKey}
				className={enharmonicFieldClassName || 'mn-key-picker-enharmonic-field'}
				label={{
					fallback: `Use ${enharmonicKeyLabel}`,
					phrase: 'music.controls.use_enharmonic_key',
					replacements: { key: enharmonicKeyLabel },
				}}
				onChange={this.handleUseEnharmonicKeyChange}
				size={size}
			/>
		);
	}

	/**
	 * Renders the key input and datalist options.
	 *
	 * @returns {React.ReactElement}
	 */
	render() {
		const {
			className,
		} = this.props;

		return (
			<div className={className || 'mn-key-picker'}>
				{this.renderKeyField()}
				{this.renderModeField()}
				{this.renderEnharmonicField()}
			</div>
		);
	}
}

function formatKeyLabel(key) {
	return String(key || '').replace(/(##|bb|#|b)/g, (accidental) => ACCIDENTAL_DISPLAY[accidental] || accidental);
}
