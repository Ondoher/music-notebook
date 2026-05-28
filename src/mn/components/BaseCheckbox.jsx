/// <reference path="../common/types.d.ts" />

import React, { Component } from 'react';
import Checkbox from '@mui/material/Checkbox';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormHelperText from '@mui/material/FormHelperText';

import MusicNotebookContext from '../common/MusicNotebookContext.js';
import { getLocalizedText } from './localized-text.js';

let baseCheckboxId = 0;

/**
 * Renders a localized MUI checkbox with helper text and normalized change output.
 *
 * @extends {Component<BaseCheckboxProps>}
 */
export default class BaseCheckbox extends Component {
	static contextType = MusicNotebookContext;

	/**
	 * Creates a stable fallback id for label and helper text wiring.
	 *
	 * @param {BaseCheckboxProps} props
	 */
	constructor(props) {
		super(props);
		baseCheckboxId += 1;
		this.fallbackId = `base-checkbox-${baseCheckboxId}`;
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
	 * Renders the wrapped MUI checkbox input.
	 *
	 * @param {string} checkboxId
	 * @param {string | undefined} helperId
	 * @param {string} resolvedAriaLabel
	 * @returns {React.ReactElement}
	 */
	renderCheckbox(checkboxId, helperId, resolvedAriaLabel) {
		const {
			checked = false,
			checkboxProps = {},
			onChange,
			size,
		} = this.props;

		return (
			<Checkbox
				{...checkboxProps}
				checked={checked}
				id={checkboxId}
				slotProps={{
					...checkboxProps.slotProps,
					input: {
						...(checkboxProps.slotProps?.input || {}),
						'aria-describedby': helperId,
						'aria-label': resolvedAriaLabel,
					},
				}}
				onChange={(event) => onChange?.(event.target.checked, event)}
				size={size}
			/>
		);
	}

	/**
	 * Renders the full checkbox form control.
	 *
	 * @returns {React.ReactElement}
	 */
	render() {
		const {
			ariaLabel,
			checkboxProps,
			className,
			error = false,
			helperText,
			id,
			label,
			labelFallback = '',
			onChange,
			size,
			variant,
			...formControlProps
		} = this.props;
		const checkboxId = id || this.fallbackId;
		const helperId = helperText ? `${checkboxId}-helper` : undefined;
		const resolvedLabel = this.getLocalizedText(label, labelFallback);
		const resolvedAriaLabel = this.getLocalizedText(ariaLabel, resolvedLabel);
		const resolvedHelperText = this.getLocalizedText(helperText);

		return (
			<FormControl
				{...formControlProps}
				className={className ? `base-checkbox ${className}` : 'base-checkbox'}
				error={Boolean(error)}
				fullWidth={formControlProps.fullWidth ?? true}
				size={size}
				variant={variant}
			>
				<FormControlLabel
					control={this.renderCheckbox(checkboxId, helperId, resolvedAriaLabel)}
					label={resolvedLabel}
				/>
				{resolvedHelperText ? (
					<FormHelperText id={helperId}>{resolvedHelperText}</FormHelperText>
				) : null}
			</FormControl>
		);
	}
}
