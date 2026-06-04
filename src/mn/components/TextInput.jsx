/// <reference path="../common/types.d.ts" />

import React, { Component } from 'react';
import TextField from '@mui/material/TextField';

import MusicNotebookContext from '../common/MusicNotebookContext.js';
import { getLocalizedText } from '../common/localized-text.js';

/**
 * Renders a localized MUI text field with helper text and accessible labeling.
 *
 * @extends {Component<TextInputProps>}
 */
export default class TextInput extends Component {
	static contextType = MusicNotebookContext;

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
	 * Renders the localized MUI text field.
	 *
	 * @returns {React.ReactElement}
	 */
	render() {
		const {
			ariaLabel,
			autoComplete,
			autocomplete,
			className,
			helperText,
			label,
			labelFallback = '',
			localizeHelperText = true,
			slotProps,
			variant,
			...textFieldProps
		} = this.props;
		const resolvedLabel = this.getLocalizedText(label, labelFallback);
		const resolvedAriaLabel = ariaLabel
			? this.getLocalizedText(ariaLabel, resolvedLabel)
			: undefined;
		const resolvedHelperText = localizeHelperText
			? this.getLocalizedText(helperText)
			: helperText;
		const inputSlotProps = {
			...(slotProps?.htmlInput || {}),
			...(resolvedAriaLabel ? { 'aria-label': resolvedAriaLabel } : {}),
			...(autoComplete || autocomplete ? { autoComplete: autoComplete || autocomplete } : {}),
		};

		return (
			<TextField
				{...textFieldProps}
				className={className ? `text-input ${className}` : 'text-input'}
				fullWidth={textFieldProps.fullWidth ?? true}
				helperText={resolvedHelperText || undefined}
				label={resolvedLabel}
				slotProps={{
					...slotProps,
					htmlInput: inputSlotProps,
				}}
				variant={variant || 'outlined'}
			/>
		);
	}
}
