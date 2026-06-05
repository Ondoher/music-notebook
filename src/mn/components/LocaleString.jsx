/// <reference path="../common/types.d.ts" />

import React, { Component } from 'react';
import parse from 'html-react-parser';
import MusicNotebookContext from '../common/MusicNotebookContext.js';

/**
 * Renders localized text from the current Music Notebook context.
 *
 * @extends {Component<LocaleStringProps>}
 */
export default class LocaleString extends Component {
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
	 * Resolves the current translated string.
	 *
	 * @returns {string}
	 */
	getTranslation() {
		const localize = this.getMusicNotebookContext().localize;

		if (!localize) {
			console.error('LocaleString cannot render without a localize service.');
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
	 * Renders the translated string as text or parsed HTML.
	 *
	 * @returns {React.ReactElement | string | null}
	 */
	render() {
		const {
			className,
			div = false,
			hideEmpty,
			html,
			id,
		} = this.props;
		const translation = this.getTranslation();

		if (hideEmpty && !translation) {
			return '';
		}

		const Element = div ? 'div' : 'span';

		if (html) {
			return (
				<Element className={className} id={id}>
					{parse(translation)}
				</Element>
			);
		}

		if (className || id || div) {
			return (
				<Element className={className} id={id}>
					{translation}
				</Element>
			);
		}

		return translation;
	}
}
