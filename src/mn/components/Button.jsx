/// <reference path="../common/types.d.ts" />

import React, { Component } from 'react';
import MuiButton from '@mui/material/Button';

import MusicNotebookContext from '../common/MusicNotebookContext.js';
import { getLocalizedText } from './localized-text.js';

/**
 * Renders a localized Music Notebook button using the shared button palette.
 *
 * @extends {Component<ButtonProps>}
 */
export default class Button extends Component {
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
	 * Gets the CSS class list for the button state.
	 *
	 * @returns {string}
	 */
	getClassName() {
		const {
			className,
			selected = false,
			size = 'small',
			variant = 'secondary',
		} = this.props;
		const classes = [
			'mn-button',
			`mn-button-${variant}`,
			`mn-button-${size}`,
			selected ? 'mn-button-selected' : '',
			className || '',
		];

		return classes.filter(Boolean).join(' ');
	}

	/**
	 * Gets the MUI button variant mapped from the Music Notebook variant.
	 *
	 * @returns {'contained' | 'outlined'}
	 */
	getMuiVariant() {
		return this.props.variant === 'primary' ? 'contained' : 'outlined';
	}

	/**
	 * Gets the MUI button size mapped from the Music Notebook size.
	 *
	 * @returns {'small' | 'large'}
	 */
	getMuiSize() {
		return this.props.size === 'large' ? 'large' : 'small';
	}

	/**
	 * Renders localized button content.
	 *
	 * @returns {React.ReactNode}
	 */
	renderContent() {
		const {
			children,
			label,
			labelFallback = '',
		} = this.props;

		if (children !== undefined) {
			return children;
		}

		return this.getLocalizedText(label, labelFallback);
	}

	/**
	 * Renders the button.
	 *
	 * @returns {React.ReactElement}
	 */
	render() {
		const {
			ariaLabel,
			disabled = false,
			id,
			onClick,
			selected = false,
			type = 'button',
		} = this.props;
		const resolvedAriaLabel = ariaLabel
			? this.getLocalizedText(ariaLabel)
			: undefined;

		return (
			<MuiButton
				aria-label={resolvedAriaLabel}
				aria-pressed={selected ? 'true' : undefined}
				className={this.getClassName()}
				disabled={disabled}
				id={id}
				onClick={onClick}
				size={this.getMuiSize()}
				type={type}
				variant={this.getMuiVariant()}
			>
				{this.renderContent()}
			</MuiButton>
		);
	}
}
