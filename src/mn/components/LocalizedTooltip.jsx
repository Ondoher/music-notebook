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
	 * Initializes refresh state for locale updates.
	 *
	 * @param {LocalizedTooltipProps} props
	 */
	constructor(props) {
		super(props);

		this.state = {
			updated: 0,
		};
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
	 * Handles locale service changes.
	 *
	 * @param {string} locale
	 * @returns {void}
	 */
	newLocale(locale) {
		if (locale !== this.locale) {
			this.setState({ locale });
		}
	}

	/**
	 * Forces a refresh when translation content updates.
	 *
	 * @returns {void}
	 */
	updated() {
		this.setState({ updated: this.state.updated + 1 });
	}

	/**
	 * Lazily connects to the localization service.
	 *
	 * @returns {void}
	 */
	setupLocaleService() {
		if (this.localize) {
			return;
		}

		const context = this.getMusicNotebookContext();

		this.registry = context.registry;
		this.localize = context.localize || this.registry?.subscribe?.('localize');

		if (!this.localize) {
			return;
		}

		this.localeListener = this.localize.listen?.('changeLocale', this.newLocale.bind(this));
		this.updatedListener = this.localize.listen?.('updated', this.updated.bind(this));
		this.locale = this.localize.getLocale?.();
	}

	/**
	 * Removes localization service listeners before unmount.
	 *
	 * @returns {void}
	 */
	componentWillUnmount() {
		if (this.localize && this.localeListener) {
			this.localize.unlisten('changeLocale', this.localeListener);
		}

		if (this.localize && this.updatedListener) {
			this.localize.unlisten('updated', this.updatedListener);
		}
	}

	/**
	 * Resolves the current translated tooltip string.
	 *
	 * @returns {string}
	 */
	getTranslation() {
		this.setupLocaleService();

		if (!this.localize) {
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
			? this.localize.translateLocale(this.props.locale, phrase, replacements, cardinal)
			: this.localize.translate(phrase, replacements, cardinal);

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
