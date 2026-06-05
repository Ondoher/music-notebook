/// <reference path="./types/Markdown.d.ts" />

import React, { Component } from 'react';
import { marked } from 'marked';
import parse from 'html-react-parser';

import MusicNotebookContext from '../common/MusicNotebookContext.js';

/**
 * Renders localized markdown content through the localization service.
 *
 * @extends {Component<MarkdownProps, MarkdownState>}
 */
export default class Markdown extends Component {
	static contextType = MusicNotebookContext;

	constructor(props) {
		super(props);
		this.state = {
			content: '',
			loadedName: '',
		};
		this.localize = null;
		this.locale = '';
	}

	componentWillMount() {
		this.localize = this.context?.localize || null;
		this.locale = this.getContextLocale();
	}

	componentDidMount() {
		this.loadMarkdown();
	}

	componentDidUpdate(prevProps) {
		const nextLocalize = this.context?.localize || null;
		const nextLocale = this.getContextLocale(nextLocalize);
		const localizeChanged = nextLocalize !== this.localize;
		const localeChanged = nextLocale !== this.locale;

		if (localizeChanged) {
			this.localize = nextLocalize;
		}

		if (
			prevProps.name !== this.props.name
			|| prevProps.replacements !== this.props.replacements
			|| localizeChanged
			|| localeChanged
		) {
			this.locale = nextLocale;
			this.loadMarkdown();
		}
	}

	getContextLocale(localize = this.localize) {
		return this.context?.locale || localize?.getLocale?.() || '';
	}

	async loadMarkdown() {
		const localize = this.localize;

		if (!this.props.name || !localize?.translateMarkdown) {
			this.setState({
				content: '',
				loadedName: this.props.name || '',
			});
			return;
		}

		const markdown = await localize.translateMarkdown(
			this.props.name,
			this.props.replacements || {},
		);

		if (this.props.name) {
			this.setState({
				content: marked.parse(markdown || '', {gfm: true}),
				loadedName: this.props.name,
			});
		}
	}

	render() {
		const className = this.props.className
			? `${this.props.className} markdown`
			: 'markdown';

		return (
			<div className={className}>
				{this.state.content ? parse(this.state.content) : null}
			</div>
		);
	}
}
