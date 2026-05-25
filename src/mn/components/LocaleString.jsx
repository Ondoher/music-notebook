import React, { Component } from 'react';
import parse from 'html-react-parser';
import MusicNotebookContext from '../common/MusicNotebookContext.js';

export default class LocaleString extends Component {
	static contextType = MusicNotebookContext;

	constructor(props) {
		super(props);

		this.state = {
			updated: 0,
		};
	}

	newLocale(locale) {
		if (locale !== this.locale) {
			this.setState({ locale });
		}
	}

	updated() {
		this.setState({ updated: this.state.updated + 1 });
	}

	setupLocaleService() {
		if (this.localize) {
			return;
		}

		this.registry = this.context.registry;
		this.localize = this.context.localize || this.registry?.subscribe?.('localize');

		if (!this.localize) {
			return;
		}

		this.localeListener = this.localize.listen?.('changeLocale', this.newLocale.bind(this));
		this.updatedListener = this.localize.listen?.('updated', this.updated.bind(this));
		this.locale = this.localize.getLocale?.();
	}

	componentWillUnmount() {
		if (this.localize && this.localeListener) {
			this.localize.unlisten('changeLocale', this.localeListener);
		}

		if (this.localize && this.updatedListener) {
			this.localize.unlisten('updated', this.updatedListener);
		}
	}

	getTranslation() {
		this.setupLocaleService();

		if (!this.localize) {
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

		return this.props.locale
			? this.localize.t_locale(this.props.locale, phrase, replacements, cardinal)
			: this.localize.t(phrase, replacements, cardinal);
	}

	render() {
		const {
			className,
			div = false,
			fallback = '',
			hideEmpty,
			html,
			id,
		} = this.props;
		const translation = this.getTranslation() || fallback;

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
