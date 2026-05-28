import React, { Component } from 'react';
import FormControl from '@mui/material/FormControl';
import FormLabel from '@mui/material/FormLabel';

import {
	getChordInversionOptions,
	getChordSymbolForInversion,
} from '../shared/chord-builder.js';
import BaseCheckbox from './BaseCheckbox.jsx';
import BaseSelect from './BaseSelect.jsx';
import ChordText from './ChordText.jsx';
import HelperText from './HelperText.jsx';
import KeyPicker from './KeyPicker.jsx';
import LocaleString from './LocaleString.jsx';

let chordInputId = 0;

/**
 * Renders the grouped chord editor shared by chord-name and degree entry.
 *
 * @extends {Component<ChordInputProps>}
 */
export default class ChordInput extends Component {
	/**
	 * Creates the initial local editor state.
	 *
	 * @param {ChordInputProps} props
	 */
	constructor(props) {
		super(props);
		chordInputId += 1;
		this.helperId = `mn-chord-input-${chordInputId}-helper`;
		this.state = {
			arpeggiate: props.initialArpeggiate === true,
			chordText: props.initialValue || 'C',
			inputKind: 'empty',
			inversion: props.initialInversion || 0,
			key: props.initialKey || 'C',
			keyMode: props.initialKeyMode || 'major',
			result: null,
			touched: false,
		};
		this.hasResolvedOnce = false;
	}

	/**
	 * Gets the active chord text value.
	 *
	 * @returns {string}
	 */
	getChordText() {
		return this.props.value === undefined
			? this.state.chordText
			: this.props.value;
	}

	/**
	 * Gets the active key value.
	 *
	 * @returns {string}
	 */
	getKey() {
		return this.props.selectedKey ?? this.state.key;
	}

	/**
	 * Gets the active key mode value.
	 *
	 * @returns {KeyMode}
	 */
	getKeyMode() {
		return this.props.selectedKeyMode ?? this.state.keyMode;
	}

	/**
	 * Gets resolve options for the chord text field.
	 *
	 * @returns {ChordTextResolveOptions}
	 */
	getResolveOptions() {
		return {
			arpeggiate: this.state.arpeggiate,
			inversion: this.state.inversion,
		};
	}

	/**
	 * Gets helper text for the grouped chord editor.
	 *
	 * @returns {string}
	 */
	getHelperText() {
		const { result } = this.state;

		if (!result) {
			return '';
		}

		return result.error || result.chord?.name || '';
	}

	/**
	 * Gets helper text status for the grouped chord editor.
	 *
	 * @returns {HelperTextStatus}
	 */
	getHelperStatus() {
		const { result, touched } = this.state;

		if (!result?.error) {
			return 'default';
		}

		return touched ? 'error' : 'warning';
	}

	/**
	 * Gets available inversion options for the resolved chord.
	 *
	 * @returns {InversionOption[]}
	 */
	getInversionOptions() {
		const noteCount = this.state.result?.chord?.notes.length || 1;

		return getChordInversionOptions(noteCount);
	}

	/**
	 * Renders a literal or localized chord input label.
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
	 * Handles key changes from the shared key picker.
	 *
	 * @param {string} key
	 * @returns {void}
	 */
	handleKeyChange = (key) => {
		if (this.props.selectedKey === undefined) {
			this.setState({ key });
		}
	};

	/**
	 * Handles key mode changes from the shared key picker.
	 *
	 * @param {KeyMode} keyMode
	 * @returns {void}
	 */
	handleKeyModeChange = (keyMode) => {
		if (this.props.selectedKeyMode === undefined) {
			this.setState({ keyMode });
		}
	};

	/**
	 * Handles chord text changes from the resolving chord text field.
	 *
	 * @param {ChordTextChange} change
	 * @returns {void}
	 */
	handleChordTextChange = (change) => {
		const nextState = {
			inputKind: change.inputKind,
			inversion: this.getResolvedInversion(change),
			result: change.result,
		};

		if (this.props.value === undefined) {
			nextState.chordText = change.value;
		}

		this.setState(nextState);
		this.props.onChordInputChange?.(change);
		this.props.onResultChange?.(change.result);
	};

	/**
	 * Handles resolved chord text changes caused by external context updates.
	 *
	 * @param {ChordTextChange} change
	 * @returns {void}
	 */
	handleChordTextResolve = (change) => {
		this.setState({
			inputKind: change.inputKind,
			inversion: this.getResolvedInversion(change),
			result: change.result,
		});

		if (!this.hasResolvedOnce) {
			this.hasResolvedOnce = true;
			return;
		}

		this.props.onChordInputChange?.(change);
		this.props.onResultChange?.(change.result);
	};

	/**
	 * Handles inversion selection changes.
	 *
	 * @param {number} inversion
	 * @returns {void}
	 */
	handleInversionChange = (inversion) => {
		const nextInversion = Number(inversion);
		const nextState = { inversion: nextInversion };
		const nextChordText = this.getChordTextForInversion(nextInversion);

		if (nextChordText !== null && this.props.value === undefined) {
			nextState.chordText = nextChordText;
		}

		this.setState(nextState);
	};

	/**
	 * Gets the inversion represented by a resolved chord change.
	 *
	 * @param {ChordTextChange} change - Resolved chord text change.
	 * @returns {number}
	 */
	getResolvedInversion(change) {
		return Number.isInteger(change.result?.payload?.inversion)
			? change.result.payload.inversion
			: this.state.inversion;
	}

	/**
	 * Gets the direct chord text that corresponds to an inversion selection.
	 *
	 * @param {number} inversion - Selected inversion.
	 * @returns {string | null}
	 */
	getChordTextForInversion(inversion) {
		if (this.state.inputKind !== 'chordName' || !this.state.result?.isValid) {
			return null;
		}

		return getChordSymbolForInversion(this.getChordText(), inversion);
	}

	/**
	 * Handles arpeggiation toggle changes.
	 *
	 * @param {boolean} arpeggiate
	 * @returns {void}
	 */
	handleArpeggiateChange = (arpeggiate) => {
		this.setState({ arpeggiate });
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
			fieldClassName = 'mn-chord-input-field',
			size,
			showKey = false,
			showKeyMode = true,
		} = this.props;

		if (!showKey) {
			return null;
		}

		return (
			<KeyPicker
				className="mn-chord-input-key-picker"
				keyFieldClassName={fieldClassName}
				mode={this.getKeyMode()}
				modeFieldClassName={fieldClassName}
				onKeyChange={this.handleKeyChange}
				onModeChange={this.handleKeyModeChange}
				size={size}
				showMode={showKeyMode}
				value={this.getKey()}
			/>
		);
	}

	/**
	 * Renders the resolving chord text field.
	 *
	 * @returns {React.ReactElement}
	 */
	renderChordText() {
		const {
			fieldClassName = 'mn-chord-input-field',
			label = { fallback: 'Chord', phrase: 'music.controls.chord' },
			size,
		} = this.props;

		return (
			<ChordText
				ariaDescribedBy={this.helperId}
				className={fieldClassName}
				keyName={this.getKey()}
				keyMode={this.getKeyMode()}
				label={label}
				onBlur={this.handleBlur}
				onChange={this.handleChordTextChange}
				onResolve={this.handleChordTextResolve}
				resolveOptions={this.getResolveOptions()}
				size={size}
				value={this.getChordText()}
			/>
		);
	}

	/**
	 * Renders the inversion selector.
	 *
	 * @returns {React.ReactElement}
	 */
	renderInversionSelect() {
		const { fieldClassName = 'mn-chord-input-field', size } = this.props;

		return (
			<BaseSelect
				className={fieldClassName}
				label="music.controls.inversion"
				labelFallback="Inversion"
				onChange={this.handleInversionChange}
				options={this.getInversionOptions().map((option) => ({
					label: option.phrase,
					fallback: option.label,
					value: String(option.value),
				}))}
				size={size}
				value={String(this.state.result?.payload?.inversion ?? this.state.inversion)}
			/>
		);
	}

	/**
	 * Renders the arpeggiation checkbox.
	 *
	 * @returns {React.ReactElement}
	 */
	renderArpeggiateCheckbox() {
		const {
			checkboxClassName,
			fieldClassName = 'mn-chord-input-field',
			size,
		} = this.props;

		return (
			<BaseCheckbox
				checked={this.state.arpeggiate}
				className={checkboxClassName || `${fieldClassName} mn-chord-input-checkbox music-display-options-field-checkbox`}
				label="music.controls.arpeggiate"
				labelFallback="Arpeggiate"
				onChange={this.handleArpeggiateChange}
				size={size}
			/>
		);
	}

	/**
	 * Renders the grouped chord input.
	 *
	 * @returns {React.ReactElement}
	 */
	render() {
		const {
			helperClassName = 'mn-chord-input-helper',
			label = { fallback: 'Chord', phrase: 'music.controls.chord' },
			labelClassName = 'mn-chord-input-label',
			rootClassName = 'mn-chord-input',
		} = this.props;
		const helperText = this.getHelperText();
		const helperStatus = this.getHelperStatus();
		const className = helperStatus === 'error'
			? `${rootClassName} invalid`
			: rootClassName;

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
				{this.renderKeyPicker()}
				{this.renderChordText()}
				{this.renderInversionSelect()}
				{this.renderArpeggiateCheckbox()}
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
