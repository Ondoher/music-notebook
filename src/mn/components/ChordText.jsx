import React, { Component } from 'react';

import { buildKeyboardChordPayload } from '../shared/chord-builder.js';
import {
	buildKeyboardProgressionPayload,
	normalizeRomanNumeralAliases,
} from '../shared/progression-builder.js';
import TextInput from './TextInput.jsx';

const ROMAN_NUMERAL_PATTERN = /^[ivIV]+(?:\u00b0|\u00f8|o|\+|aug|maj7|M7|\^7|m|sus\d*|add\d*)?\d*$/u;
const NUMERIC_DEGREE_PATTERN = /^[1-7]$/;

/**
 * Renders a chord text input that auto-detects and resolves the entered value.
 *
 * @extends {Component<ChordTextProps>}
 */
export default class ChordText extends Component {
	/**
	 * Reports the initial resolved value after mount.
	 *
	 * @returns {void}
	 */
	componentDidMount() {
		this.reportResolvedValue();
	}

	/**
	 * Reports a new resolved value when parent-owned context changes.
	 *
	 * @param {ChordTextProps} previousProps
	 * @returns {void}
	 */
	componentDidUpdate(previousProps) {
		if (
			previousProps.keyName !== this.props.keyName
			|| previousProps.keyMode !== this.props.keyMode
			|| previousProps.value !== this.props.value
			|| previousProps.resolveOptions?.arpeggiate !== this.props.resolveOptions?.arpeggiate
			|| previousProps.resolveOptions?.inversion !== this.props.resolveOptions?.inversion
		) {
			this.reportResolvedValue();
		}
	}

	/**
	 * Resolves current props and reports them to the parent.
	 *
	 * @returns {void}
	 */
	reportResolvedValue() {
		this.props.onResolve?.(this.resolveValue(this.props.value));
	}

	/**
	 * Handles text-field changes and emits the resolved chord text state.
	 *
	 * @param {React.ChangeEvent<HTMLInputElement>} event
	 * @returns {void}
	 */
	handleChange = (event) => {
		const change = this.resolveValue(normalizeChordTextAliases(event.target.value));

		this.props.onChange?.(change, event);
	};

	/**
	 * Detects the chord input kind for a raw text value.
	 *
	 * @param {string} value
	 * @returns {ChordTextInputKind}
	 */
	getInputKind(value) {
		const input = String(value || '').trim();

		if (!input) {
			return 'empty';
		}

		if (NUMERIC_DEGREE_PATTERN.test(input)) {
			return 'numberDegree';
		}

		if (ROMAN_NUMERAL_PATTERN.test(input)) {
			return 'romanDegree';
		}

		return 'chordName';
	}

	/**
	 * Resolves a raw text value into a music build result.
	 *
	 * @param {string} value
	 * @returns {ChordTextChange}
	 */
	resolveValue(value) {
		const normalizedValue = normalizeChordTextAliases(value);
		const inputKind = this.getInputKind(normalizedValue);
		const result = this.resolveResult(normalizedValue, inputKind);

		return {
			inputKind,
			result,
			value: normalizedValue,
		};
	}

	/**
	 * Resolves a value using the builder that matches its detected kind.
	 *
	 * @param {string} value
	 * @param {ChordTextInputKind} inputKind
	 * @returns {MusicBuildResult}
	 */
	resolveResult(value, inputKind) {
		const {
			keyName = 'C',
			keyMode = 'major',
			resolveOptions = {},
		} = this.props;

		if (inputKind === 'empty') {
			return buildKeyboardChordPayload('', resolveOptions);
		}

		if (inputKind === 'romanDegree' || inputKind === 'numberDegree') {
			return buildKeyboardProgressionPayload({
				key: keyName,
				keyMode,
				romanNumeral: value,
			}, resolveOptions);
		}

		return buildKeyboardChordPayload(value, resolveOptions);
	}

	/**
	 * Renders the localized base text input.
	 *
	 * @returns {React.ReactElement}
	 */
	render() {
		const {
			ariaDescribedBy,
			className,
			label = { fallback: 'Chord', phrase: 'music.controls.chord' },
			onBlur,
			onFocus,
			size,
			value,
		} = this.props;

		return (
			<TextInput
				className={className || 'mn-chord-text'}
				label={label}
				onBlur={onBlur}
				onChange={this.handleChange}
				onFocus={onFocus}
				size={size}
				slotProps={{
					htmlInput: {
						'aria-describedby': ariaDescribedBy,
					},
				}}
				value={value}
			/>
		);
	}
}

function normalizeChordTextAliases(value) {
	return normalizeChordAliasesForDisplay(normalizeRomanNumeralAliases(value));
}

function normalizeChordAliasesForDisplay(value) {
	return String(value || '')
		.replace(/^(\s*)([A-Ga-g])(#|b)?(?:dim|diminished)(\d*)\s*$/iu, (_match, leading, root, accidental = '', extension = '') => (
			`${leading}${root.toUpperCase()}${accidental}\u00b0${extension}`
		))
		.replace(/^(\s*)([A-Ga-g])(#|b)?(?:aug|augmented)(\d*)\s*$/iu, (_match, leading, root, accidental = '', extension = '') => (
			`${leading}${root.toUpperCase()}${accidental}+${extension}`
		))
		.replace(/^(\s*)([A-Ga-g])(#|b)?\s+(?:diminished)(\d*)\s*$/iu, (_match, leading, root, accidental = '', extension = '') => (
			`${leading}${root.toUpperCase()}${accidental}\u00b0${extension}`
		))
		.replace(/^(\s*)([A-Ga-g])(#|b)?\s+(?:augmented)(\d*)\s*$/iu, (_match, leading, root, accidental = '', extension = '') => (
			`${leading}${root.toUpperCase()}${accidental}+${extension}`
		));
}
