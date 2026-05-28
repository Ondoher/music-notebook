import React from 'react';
import Quill from 'quill';
import { renderToStaticMarkup } from 'react-dom/server';
import { IconClefStaff, IconPiano } from '@tabler/icons-react';
import MusicNotebookContext from '../../../common/MusicNotebookContext.js';
import 'quill/dist/quill.snow.css';
import {
	configureKeyboardEmbedContext,
	DEFAULT_KEYBOARD_PAYLOAD,
	KEYBOARD_EMBED_BLOT,
	registerKeyboardEmbed,
} from '../quill/keyboard-embed.js';

registerKeyboardEmbed();

/**
 * Renders the Quill-backed document editor page and music embed toolbar hooks.
 *
 * @extends {React.Component<EditorPageProps, EditorPageState>}
 */
export default class EditorPage extends React.Component {
	static contextType = MusicNotebookContext;

	/**
	 * Initializes editor state and refs.
	 *
	 * @param {EditorPageProps} props
	 */
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

	/**
	 * Subscribes to page-view updates and mounts Quill.
	 *
	 * @returns {void}
	 */
	componentDidMount() {
		this.updatedListener = this.props.pageView?.listen?.(
			'updated',
			(state) => this.setState(state),
		);
		this.configureKeyboardEmbedContext();
		this.mountEditor();
	}

	/**
	 * Refreshes the Quill embed context when watched app data updates.
	 *
	 * @returns {void}
	 */
	componentDidUpdate() {
		this.configureKeyboardEmbedContext();
	}

	/**
	 * Cleans up page-view subscriptions and editor DOM.
	 *
	 * @returns {void}
	 */
	componentWillUnmount() {
		if (this.props.pageView && this.updatedListener) {
			this.props.pageView.unlisten('updated', this.updatedListener);
		}

		this.quill = null;
		this.cleanupEditorDom();
	}

	/**
	 * Creates the Quill editor instance and configures music toolbar handlers.
	 *
	 * @returns {void}
	 */
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

	/**
	 * Shares the current Music Notebook context with Quill-owned React roots.
	 *
	 * @returns {void}
	 */
	configureKeyboardEmbedContext() {
		configureKeyboardEmbedContext(/** @type {MusicNotebookContextValue} */ (this.context));
	}

	/**
	 * Removes editor-generated DOM from the editor surface.
	 *
	 * @returns {void}
	 */
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

	/**
	 * Inserts a new music embed at the current Quill selection.
	 *
	 * @param {KeyboardDisplayMode} [displayMode]
	 * @returns {void}
	 */
	insertMusicEmbed(displayMode = 'keyboard') {
		if (!this.quill) {
			return;
		}

		const selection = this.quill.getSelection(true);
		const index = selection?.index ?? this.quill.getLength();
		const payload = {
			...DEFAULT_KEYBOARD_PAYLOAD,
			chordId: '',
			displayMode,
			displayKey: 'C',
			id: `keyboard-${Date.now()}`,
			initialEditMode: 'none',
			label: 'C major key',
			notes: [],
			openEditor: true,
			rootNote: '',
		};

		this.quill.insertEmbed(index, KEYBOARD_EMBED_BLOT, payload, 'user');
		this.quill.insertText(index + 1, '\n', 'user');
		this.quill.setSelection(index + 2, 0, 'silent');
		this.updateDocumentJson();
	}

	/**
	 * Applies accessible labels and icons to custom music toolbar buttons.
	 *
	 * @returns {void}
	 */
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

	/**
	 * Configures one custom Quill toolbar button.
	 *
	 * @param {Element | null} button
	 * @param {string} label
	 * @param {React.ReactElement} icon
	 * @returns {void}
	 */
	configureMusicToolbarButton(button, label, icon) {
		if (!button) {
			return;
		}

		button.innerHTML = renderToStaticMarkup(icon);
		button.setAttribute('aria-label', label);
		button.setAttribute('title', label);
		button.setAttribute('type', 'button');
	}

	/**
	 * Updates the debug JSON document snapshot from Quill contents.
	 *
	 * @returns {void}
	 */
	updateDocumentJson() {
		if (!this.quill) {
			return;
		}

		this.setState({
			documentJson: JSON.stringify(this.quill.getContents(), null, 2),
		});
	}

	/**
	 * Renders the editor page and debug document output.
	 *
	 * @returns {React.ReactElement}
	 */
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
