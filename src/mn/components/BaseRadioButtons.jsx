/// <reference path="../common/types.d.ts" />

import React, { Component } from 'react';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormHelperText from '@mui/material/FormHelperText';
import FormLabel from '@mui/material/FormLabel';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';

import MusicNotebookContext from '../common/MusicNotebookContext.js';
import { getLocalizedText } from './localized-text.js';

let baseRadioButtonsId = 0;

/**
 * Renders a localized MUI radio group with helper text and normalized changes.
 *
 * @extends {Component<BaseRadioButtonsProps>}
 */
export default class BaseRadioButtons extends Component {
	static contextType = MusicNotebookContext;

	/**
	 * Creates a stable fallback id for group label and helper text wiring.
	 *
	 * @param {BaseRadioButtonsProps} props
	 */
	constructor(props) {
		super(props);
		baseRadioButtonsId += 1;
		this.fallbackId = `base-radio-buttons-${baseRadioButtonsId}`;
	}

	/**
	 * Gets the typed Music Notebook context value.
	 *
	 * @returns {MusicNotebookContextValue}
	 */
	getMusicNotebookContext() {
		return /** @type {MusicNotebookContextValue} */ (this.context);
	}

	/**
	 * Resolves localized text through the current localization service.
	 *
	 * @param {LocalizedText} value
	 * @param {string} [fallback]
	 * @returns {string}
	 */
	getLocalizedText(value, fallback = '') {
		return getLocalizedText(this.getMusicNotebookContext().localize, value, fallback);
	}

	/**
	 * Renders one radio option.
	 *
	 * @param {BaseRadioButtonOption} option
	 * @returns {React.ReactElement}
	 */
	renderOption(option) {
		const { radioProps = {} } = this.props;

		return (
			<FormControlLabel
				control={<Radio {...radioProps} />}
				disabled={option.disabled}
				key={option.value}
				label={this.getLocalizedText(option.label, option.fallback)}
				value={option.value}
			/>
		);
	}

	/**
	 * Renders the full radio group form control.
	 *
	 * @returns {React.ReactElement}
	 */
	render() {
		const {
			className,
			error = false,
			helperText,
			id,
			label,
			labelFallback = '',
			onChange,
			options = [],
			radioProps,
			row = false,
			value,
			variant,
			...formControlProps
		} = this.props;
		const groupId = id || this.fallbackId;
		const helperId = helperText ? `${groupId}-helper` : undefined;
		const resolvedLabel = this.getLocalizedText(label, labelFallback);
		const resolvedHelperText = this.getLocalizedText(helperText);

		return (
			<FormControl
				{...formControlProps}
				className={className ? `base-radio-buttons ${className}` : 'base-radio-buttons'}
				error={Boolean(error)}
				variant={variant}
			>
				<FormLabel id={groupId}>{resolvedLabel}</FormLabel>
				<RadioGroup
					aria-describedby={helperId}
					aria-labelledby={groupId}
					onChange={(event) => onChange?.(event.target.value, event)}
					row={row}
					value={value}
				>
					{options.map((option) => this.renderOption(option))}
				</RadioGroup>
				{resolvedHelperText ? (
					<FormHelperText id={helperId}>{resolvedHelperText}</FormHelperText>
				) : null}
			</FormControl>
		);
	}
}
