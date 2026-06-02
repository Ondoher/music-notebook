import React from 'react';
import { Previewer } from 'pagedjs';

/**
 * Renders a disposable Paged.js preview from editor HTML.
 *
 * This is a spike component: it intentionally accepts rendered Quill HTML
 * instead of a durable read-view model so we can test paged CSS quickly.
 *
 * @extends {React.Component<PagedViewPreviewProps, PagedViewPreviewState>}
 */
export default class PagedViewPreview extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			error: '',
			pageCount: 0,
			rendering: false,
		};
		this.previewRef = React.createRef();
		this.renderTimer = null;
		this.renderVersion = 0;
	}

	componentDidMount() {
		this.scheduleRender();
	}

	componentDidUpdate(prevProps) {
		if (
			prevProps.contentHtml !== this.props.contentHtml
			|| prevProps.styleRules !== this.props.styleRules
			|| prevProps.pageCss !== this.props.pageCss
		) {
			this.scheduleRender();
		}
	}

	componentWillUnmount() {
		window.clearTimeout(this.renderTimer);
		this.renderVersion += 1;
	}

	scheduleRender() {
		window.clearTimeout(this.renderTimer);
		this.renderTimer = window.setTimeout(() => this.renderPreview(), 250);
	}

	async renderPreview() {
		const target = this.previewRef.current;

		if (!target) {
			return;
		}

		const version = this.renderVersion + 1;

		this.renderVersion = version;
		target.innerHTML = '';
		this.setState({
			error: '',
			pageCount: 0,
			rendering: true,
		});

		try {
			const previewer = new Previewer();
			const content = this.createPreviewContent();
			const flow = await previewer.preview(
				content,
				[{ [window.location.href]: this.getPreviewCss() }],
				target,
			);

			if (this.renderVersion !== version) {
				return;
			}

			this.setState({
				error: '',
				pageCount: flow?.total || flow?.pages?.length || 0,
				rendering: false,
			});
		} catch (error) {
			if (this.renderVersion !== version) {
				return;
			}

			target.innerHTML = '';
			this.setState({
				error: error?.message || String(error),
				pageCount: 0,
				rendering: false,
			});
		}
	}

	createPreviewContent() {
		const fragment = document.createDocumentFragment();
		const content = document.createElement('main');
		const editor = this.createFallbackEditorContent();

		content.className = 'mn-paged-preview-document mn-document-content';
		editor.classList.add('ql-editor');
		content.appendChild(editor);
		fragment.appendChild(content);
		return fragment;
	}

	createFallbackEditorContent() {
		if (this.props.contentRoot?.cloneNode) {
			const clone = this.props.contentRoot.cloneNode(true);

			clone.classList.add('ql-editor');
			return clone;
		}

		const template = document.createElement('template');

		template.innerHTML = `<div class="ql-editor">${this.props.contentHtml || '<p><br></p>'}</div>`;
		return template.content.firstElementChild || document.createElement('div');
	}

	getPreviewCss() {
		return [
			this.props.pageCss || '',
			this.props.styleRules || '',
			`
			.mn-paged-preview-document {
				width: auto;
				min-width: 0;
				max-width: 100%;
				min-height: 0;
				font-family: var(--mn-font-notebook);
				font-size: var(--mn-document-font-size, 12px);
				line-height: 1.58;
			}

			.mn-paged-preview-document .ql-editor {
				width: 100%;
				min-width: 0;
				max-width: 100%;
				height: auto;
				min-height: 0;
				padding: 0;
				font-family: inherit;
				font-size: inherit;
				line-height: inherit;
				overflow: visible;
				overflow-wrap: break-word;
			}

			.mn-paged-preview-document .ql-paragraph-keep-with-next-true {
				break-after: avoid;
				page-break-after: avoid;
			}

			.mn-paged-preview-document .ql-paragraph-start-continuous {
				clear: none;
				break-before: auto;
				page-break-before: auto;
			}

			.mn-paged-preview-document .ql-paragraph-start-full-line {
				clear: both;
			}

			.mn-paged-preview-document .ql-paragraph-start-next-page {
				clear: both;
				break-before: page;
				page-break-before: always;
			}

			.mn-paged-preview-document .music-embed-toolbar,
			.mn-paged-preview-document .music-embed-resize-handle {
				display: none !important;
			}

			.mn-paged-preview-document figure {
				max-width: 100%;
				break-inside: avoid;
				page-break-inside: avoid;
			}

			.mn-paged-preview-document table {
				break-inside: avoid;
				page-break-inside: avoid;
			}

			.mn-paged-preview-document .ql-table-wrapper {
				display: inline-block;
				width: max-content;
				min-width: 100%;
				max-width: none;
				overflow: visible;
			}

			.pagedjs_pages {
				display: flex;
				flex-direction: column;
				align-items: center;
				gap: 24px;
				box-sizing: border-box;
				padding: 24px;
			}

			.pagedjs_page {
				position: relative;
				box-shadow: 0 3px 16px rgba(0, 0, 0, 0.24);
				background: #ffffff;
				overflow: hidden !important;
			}

			.pagedjs_page::before {
				position: absolute;
				z-index: 20;
				top: var(--mn-paged-margin-top, 72pt);
				right: var(--mn-paged-margin-right, 72pt);
				bottom: var(--mn-paged-margin-bottom, 72pt);
				left: var(--mn-paged-margin-left, 72pt);
				display: block;
				box-sizing: border-box;
				border: 1px dotted rgba(32, 36, 44, 0.22);
				content: "";
				pointer-events: none;
			}
			`,
		].join('\n');
	}

	renderStatus() {
		if (this.state.error) {
			return <div className="mn-paged-preview__status">Paged preview failed: {this.state.error}</div>;
		}

		if (this.state.rendering) {
			return <div className="mn-paged-preview__status">Rendering paged preview...</div>;
		}

		if (this.state.pageCount > 0) {
			return <div className="mn-paged-preview__status">{this.state.pageCount} page{this.state.pageCount === 1 ? '' : 's'}</div>;
		}

		return null;
	}

	render() {
		return (
			<aside
				className="mn-paged-preview"
				aria-label="Paged preview"
				data-mn-view-mode-service="fallback"
				data-mn-view-mode-source={this.props.contentRoot?.cloneNode ? 'live-root' : 'html'}
			>
				{this.renderStatus()}
				<div ref={this.previewRef} className="mn-paged-preview__output" />
			</aside>
		);
	}
}
