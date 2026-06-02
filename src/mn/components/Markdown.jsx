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
	}

	componentDidMount() {
		this.subscribeToLocale();
		this.loadMarkdown();
	}

	componentDidUpdate(prevProps) {
		if (
			prevProps.name !== this.props.name
			|| prevProps.replacements !== this.props.replacements
		) {
			this.loadMarkdown();
		}
	}

	componentWillUnmount() {
		this.unsubscribeFromLocale();
	}

	getLocalize() {
		return this.context?.localize || this.context?.registry?.subscribe?.('localize') || null;
	}

	subscribeToLocale() {
		const localize = this.getLocalize();

		if (!localize?.listen) {
			return;
		}

		this.localeListener = localize.listen('changeLocale', this.loadMarkdown.bind(this));
		this.updatedListener = localize.listen('updated', this.loadMarkdown.bind(this));
	}

	unsubscribeFromLocale() {
		const localize = this.getLocalize();

		if (localize?.unlisten && this.localeListener) {
			localize.unlisten('changeLocale', this.localeListener);
		}

		if (localize?.unlisten && this.updatedListener) {
			localize.unlisten('updated', this.updatedListener);
		}

		this.localeListener = null;
		this.updatedListener = null;
	}

	async loadMarkdown() {
		const localize = this.getLocalize();

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
