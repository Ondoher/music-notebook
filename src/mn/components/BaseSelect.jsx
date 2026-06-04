/// <reference path="../common/types.d.ts" />

import React, { Component } from 'react';
import FormControl from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';

import MusicNotebookContext from '../common/MusicNotebookContext.js';
import { getLocalizedText } from '../common/localized-text.js';

let baseSelectId = 0;

/**
 * Renders a localized MUI select with stable label and helper-text wiring.
 *
 * @extends {Component<BaseSelectProps>}
 */
export default class BaseSelect extends Component {
	static contextType = MusicNotebookContext;

	/**
	 * Creates a stable fallback id for label and helper text wiring.
	 *
	 * @param {BaseSelectProps} props
	 */
	constructor(props) {
		super(props);
		baseSelectId += 1;
		this.fallbackId = `base-select-${baseSelectId}`;
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
	 * Renders one select menu option.
	 *
	 * @param {SelectOption} option
	 * @param {boolean} localizeOptions
	 * @returns {React.ReactElement}
	 */
	renderOption(option, localizeOptions) {
		const optionLabel = localizeOptions
			? this.getLocalizedText(option.label, option.fallback)
			: option.label;
		const ariaLabel = this.getLocalizedText(option.ariaLabel, optionLabel);
		const optionProps = {
			...option.props,
		};

		if (option.dividerBefore) {
			optionProps.sx = {
				...(optionProps.sx || {}),
				borderTop: '1px solid',
				borderColor: 'divider',
				mt: 0.5,
				pt: 1,
			};
		}

		return (
			<MenuItem
				{...optionProps}
				aria-label={ariaLabel}
				key={option.value ?? 'empty'}
				value={option.value}
			>
				{optionLabel}
			</MenuItem>
		);
	}

	/**
	 * Renders one native select option.
	 *
	 * @param {SelectOption} option
	 * @param {boolean} localizeOptions
	 * @returns {React.ReactElement}
	 */
	renderNativeOption(option, localizeOptions) {
		const optionLabel = localizeOptions
			? this.getLocalizedText(option.label, option.fallback)
			: option.label;

		return (
			<option
				{...option.props}
				aria-label={this.getLocalizedText(option.ariaLabel, optionLabel)}
				key={option.value ?? 'empty'}
				value={option.value}
			>
				{optionLabel}
			</option>
		);
	}

	/**
	 * Renders the full select form control.
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
			localizeOptions = true,
			onChange,
			options = [],
			selectProps = {},
			size,
			value,
			variant = 'outlined',
			...formControlProps
		} = this.props;
		const selectId = id || this.fallbackId;
		const labelId = `${selectId}-label`;
		const helperId = helperText ? `${selectId}-helper` : undefined;
		const resolvedLabel = this.getLocalizedText(label, labelFallback);
		const resolvedHelperText = this.getLocalizedText(helperText);

		return (
			<FormControl
				{...formControlProps}
				className={className ? `base-select ${className}` : 'base-select'}
				error={Boolean(error)}
				fullWidth={formControlProps.fullWidth ?? true}
				size={size}
				variant={variant}
			>
				<InputLabel id={labelId}>{resolvedLabel}</InputLabel>
				<Select
					{...selectProps}
					aria-describedby={helperId}
					id={selectId}
					label={resolvedLabel}
					labelId={labelId}
					onChange={(event, child) => onChange?.(event.target.value, event, child)}
					value={value}
				>
					{options.map((option) => (
						selectProps.native
							? this.renderNativeOption(option, localizeOptions)
							: this.renderOption(option, localizeOptions)
					))}
				</Select>
				{resolvedHelperText ? (
					<FormHelperText id={helperId}>{resolvedHelperText}</FormHelperText>
				) : null}
			</FormControl>
		);
	}
}
