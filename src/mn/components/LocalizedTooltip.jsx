/// <reference path="../common/types.d.ts" />

import React, { Component, cloneElement, isValidElement } from 'react';
import Tooltip from '@mui/material/Tooltip';
import MusicNotebookContext from '../common/MusicNotebookContext.js';

/**
 * Renders a MUI tooltip whose visible and accessible text comes from localization.
 *
 * @extends {Component<LocalizedTooltipProps>}
 */
export default class LocalizedTooltip extends Component {
	static contextType = MusicNotebookContext;

	/**
	 * Gets the typed Music Notebook context value.
	 *
	 * @returns {MusicNotebookContextValue}
	 */
	getMusicNotebookContext() {
		return /** @type {MusicNotebookContextValue} */ (this.context || {});
	}

	/**
	 * Resolves the current translated tooltip string.
	 *
	 * @returns {string}
	 */
	getTranslation() {
		const localize = this.getMusicNotebookContext().localize;

		if (!localize) {
			console.error('LocalizedTooltip cannot render without a localize service.');
			return '';
		}

		let {
			phrase,
			replacements,
			cardinal,
		} = this.props;

		if (typeof phrase === 'object') {
			replacements = phrase.replacements;
			cardinal = phrase.cardinal;
			phrase = phrase.phrase;
		}

		const translation = this.props.locale
			? localize.translateLocale(this.props.locale, phrase, replacements, cardinal)
			: localize.translate(phrase, replacements, cardinal);

		if (!translation && !this.props.hideEmpty) {
			console.error(`Missing translation for phrase "${phrase}".`);
			return String(phrase || '');
		}

		return translation;
	}

	/**
	 * Applies the localized label to the child element when requested.
	 *
	 * @param {string} translation
	 * @returns {React.ReactElement}
	 */
	getChild(translation) {
		const { children, labelChild = false } = this.props;

		if (!labelChild || !isValidElement(children)) {
			return children;
		}

		return cloneElement(children, {
			'aria-label': translation,
		});
	}

	/**
	 * Renders the localized tooltip around the supplied child.
	 *
	 * @returns {React.ReactElement}
	 */
	render() {
		const {
			children,
			describeChild = true,
			hideEmpty,
			labelChild,
			locale,
			phrase,
			replacements,
			cardinal,
			...tooltipProps
		} = this.props;
		const translation = this.getTranslation();

		if (hideEmpty && !translation) {
			return children;
		}

		return (
			<Tooltip {...tooltipProps} title={translation} describeChild={describeChild}>
				{this.getChild(translation)}
			</Tooltip>
		);
	}
}
