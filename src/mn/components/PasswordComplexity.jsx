/// <reference path="./types/PasswordInput.d.ts" />
/// <reference path="../common/types.d.ts" />

import React, { Component } from 'react';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';

import MusicNotebookContext from '../common/MusicNotebookContext.js';
import { getLocalizedText } from '../common/localized-text.js';

/** Renders password-complexity rule status. */
export default class PasswordComplexity extends Component {
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
	 * Renders one rule status.
	 *
	 * @param {PasswordComplexityRule} rule - Supplies the rule description.
	 * @returns {React.ReactElement}
	 */
	renderRule(rule) {
		const passed = this.props.passed?.[rule.name] === true;
		const className = passed ? 'valid' : 'invalid';
		const Icon = passed ? CheckCircleIcon : CancelIcon;
		const label = this.getLocalizedText(rule.label, rule.fallback || rule.name);

		return (
			<li
				aria-invalid={passed ? undefined : 'true'}
				className={`mn-password-complexity__rule mn-password-complexity__rule-${className}`}
				key={rule.name}
			>
				<Icon
					aria-hidden="true"
					className={`mn-password-complexity__icon mn-password-complexity__icon-${className}`}
					fontSize="small"
				/>
				<span>{label}</span>
			</li>
		);
	}

	/**
	 * Renders the password-complexity rule list.
	 *
	 * @returns {React.ReactElement | null}
	 */
	render() {
		const rules = this.props.rules || [];

		if (!rules.length) {
			return null;
		}

		return (
			<ul className="mn-password-complexity" aria-live="polite">
				{rules.map((rule) => this.renderRule(rule))}
			</ul>
		);
	}
}
