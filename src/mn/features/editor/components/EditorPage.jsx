import React from 'react';
import Quill from 'quill';
import { renderToStaticMarkup } from 'react-dom/server';
import { IconClefStaff, IconPiano } from '@tabler/icons-react';
import '@fontsource/comic-neue/400';
import '@fontsource/comic-neue/400-italic';
import '@fontsource/comic-neue/700';
import '@fontsource/comic-neue/700-italic';
import 'quill/dist/quill.snow.css';
import { DEFAULT_KEYBOARD_PAYLOAD, KEYBOARD_EMBED_BLOT, registerKeyboardEmbed } from '../quill/keyboard-embed.js';

registerKeyboardEmbed();

export default class EditorPage extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			...(props.pageView?.getState?.() || {}),
			documentJson: '',
		};
		this.editorSurfaceRef = React.createRef();
		this.editorRef = React.createRef();
		this.handleKeyboardChange = this.updateDocumentJson.bind(this);
		this.quill = null;
	}

	componentDidMount() {
		this.updatedListener = this.props.pageView?.listen?.(
			'updated',
			(state) => this.setState(state),
		);
		this.mountEditor();
	}

	componentWillUnmount() {
		if (this.props.pageView && this.updatedListener) {
			this.props.pageView.unlisten('updated', this.updatedListener);
		}

		this.quill = null;
		this.cleanupEditorDom();
	}

	mountEditor() {
		if (this.quill || !this.editorRef.current) {
			return;
		}

		this.cleanupEditorDom();

		this.quill = new Quill(this.editorRef.current, {
			modules: {
				toolbar: {
					container: [
						[{ header: [1, 2, false] }],
						['bold', 'italic', 'underline'],
						[{ list: 'ordered' }, { list: 'bullet' }],
						['musicKeyboard', 'musicStaff'],
						['clean'],
					],
					handlers: {
						musicKeyboard: () => this.insertMusicEmbed('keyboard'),
						musicStaff: () => this.insertMusicEmbed('staff'),
					},
				},
			},
			placeholder: this.state.placeholder || '',
			theme: 'snow',
		});

		this.configureMusicToolbarButtons();

		if (this.state.document) {
			this.quill.setContents(this.state.document);
		}

		this.quill.on('text-change', this.updateDocumentJson.bind(this));
		this.editorRef.current.addEventListener('music-keyboard-change', this.handleKeyboardChange);
		this.updateDocumentJson();
	}

	cleanupEditorDom() {
		const surface = this.editorSurfaceRef.current;
		const editor = this.editorRef.current;

		if (!surface || !editor) {
			return;
		}

		editor.removeEventListener('music-keyboard-change', this.handleKeyboardChange);
		surface.querySelectorAll(':scope > .ql-toolbar').forEach((toolbar) => toolbar.remove());
		editor.className = 'editor-quill';
		editor.innerHTML = '';
	}

	insertMusicEmbed(displayMode = 'keyboard') {
		if (!this.quill) {
			return;
		}

		const selection = this.quill.getSelection(true);
		const index = selection?.index ?? this.quill.getLength();
		const payload = {
			...DEFAULT_KEYBOARD_PAYLOAD,
			displayMode,
			id: `keyboard-${Date.now()}`,
			openEditor: true,
		};

		this.quill.insertEmbed(index, KEYBOARD_EMBED_BLOT, payload, 'user');
		this.quill.insertText(index + 1, '\n', 'user');
		this.quill.setSelection(index + 2, 0, 'silent');
		this.updateDocumentJson();
	}

	configureMusicToolbarButtons() {
		const toolbar = this.editorSurfaceRef.current?.querySelector(':scope > .ql-toolbar');

		if (!toolbar) {
			return;
		}

		this.configureMusicToolbarButton(
			toolbar.querySelector('.ql-musicKeyboard'),
			this.state.insertKeyboardObjectLabel || 'Insert keyboard object',
			<IconPiano aria-hidden="true" size={18} stroke={1.8} />,
		);
		this.configureMusicToolbarButton(
			toolbar.querySelector('.ql-musicStaff'),
			this.state.insertStaffObjectLabel || 'Insert staff object',
			<IconClefStaff aria-hidden="true" size={18} stroke={1.8} />,
		);
	}

	configureMusicToolbarButton(button, label, icon) {
		if (!button) {
			return;
		}

		button.innerHTML = renderToStaticMarkup(icon);
		button.setAttribute('aria-label', label);
		button.setAttribute('title', label);
		button.setAttribute('type', 'button');
	}

	updateDocumentJson() {
		if (!this.quill) {
			return;
		}

		this.setState({
			documentJson: JSON.stringify(this.quill.getContents(), null, 2),
		});
	}

	render() {
		return (
			<section className="editor-page">
				<div className="editor-page-meta">
					<div>
						<h2>{this.state.title}</h2>
						<span>{this.state.status}</span>
					</div>
				</div>
				<div ref={this.editorSurfaceRef} className="editor-page-surface">
					<div ref={this.editorRef} className="editor-quill" />
				</div>
				<details className="editor-debug-document">
					<summary>{this.state.debugDocumentLabel}</summary>
					<pre>{this.state.documentJson}</pre>
				</details>
			</section>
		);
	}
}
