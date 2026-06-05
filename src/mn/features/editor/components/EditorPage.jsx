import React from 'react';
import Quill from 'quill';
import MusicNotebookContext from '../../../common/MusicNotebookContext.js';
import EditorInteractionDispatcher from './EditorInteractionDispatcher.js';
import EditorToolbar from './EditorToolbar.jsx';
import ViewModePane from '../../view-mode/components/ViewModePane.jsx';

/**
 * Renders the Quill-backed document editor page and generic object embed hooks.
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
			editorViews: [],
			pagedPreviewHtml: '',
		};
		this.editorSurfaceRef = React.createRef();
		this.documentContentRef = React.createRef();
		this.editorRef = React.createRef();
		this.whiteSpaceOverlayRef = React.createRef();
		this.quill = null;
		this.editorToolbar = null;
		this.editorSurface = null;
		this.actionRegistry = null;
		this.documentModel = null;
		this.documentFormat = null;
		this.viewMode = null;
		this.editorInteractions = this.props.editorInteractions || this.context?.registry?.subscribe?.('editor-interactions') || null;
		this.editorLayout = null;
		this.editorViews = null;
		this.documentModelListeners = [];
		this.objectTypes = null;
		this.surfaceAdapter = null;
		this.objectTypeRegistryListeners = null;
		this.objectTypeEventListeners = [];
		this.editorMutationObserver = null;
		this.documentOverflowWidthTimer = null;
		this.pagedPreviewHtmlTimer = null;
		this.whiteSpaceMarkerTimer = null;
		this.activeTabId = '';
		this.isApplyingDocumentModelContent = false;
		this.selectionOwnerDocument = null;
		this.editorPointerInteraction = null;
		this.editorPointerInteractionOwnerDocument = null;
		this.nativeEditorMouseDownRoot = null;
		this.lineSelectionAnchorRange = null;
		this.lineSelectionOwnerDocument = null;
		this.gutterSelectionInteraction = null;
		this.objectTypeClipboardMatcherKeys = new Set();
		this.editorInteractionDispatcher = new EditorInteractionDispatcher({
			getEditorInteractions: () => this.editorInteractions,
			getCursorRoot: () => this.editorRef.current || this.quill?.root || null,
			getEditorRoot: () => this.quill?.root || this.editorRef.current || null,
			getQuill: () => this.quill,
			getContentWidth: () => this.getContentWidth(),
			setSelectionWithoutScroll: (index, length, source, anchor) => (
				this.setQuillSelectionWithoutScroll(index, length, source, anchor)
			),
		});
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
		this.configureToolbarServices();
		this.subscribeToEditorViews();
		this.subscribeToDocumentSettings();
		this.subscribeToDocumentTabs();
		this.subscribeToObjectTypes();
		this.configureObjectTypeContext();
		this.mountEditor();
	}

	/**
	 * Refreshes object embed contexts when watched app data updates.
	 *
	 * @returns {void}
	 */
	componentDidUpdate(_prevProps, prevState) {
		this.configureObjectTypeContext();

		if (prevState.seeWhiteSpace !== this.state.seeWhiteSpace) {
			this.scheduleWhiteSpaceMarkerUpdate();
		}
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

		if (this.editorSurface && this.surfaceAdapter) {
			this.editorSurface.detachSurface(this.surfaceAdapter);
		}

		this.unsubscribeFromDocumentSettings();
		this.unsubscribeFromDocumentTabs();
		this.unsubscribeFromObjectTypes();
		this.unsubscribeFromEditorViews();
		this.removeObjectTypeEventListeners();
		this.disconnectEditorMutationObserver();
		this.detachNativeEditorInteractionListeners();
		this.detachEditorPointerCaptureListeners();
		this.detachLineSelectionDragListeners();
		window.clearTimeout(this.documentOverflowWidthTimer);
		window.clearTimeout(this.pagedPreviewHtmlTimer);
		window.clearTimeout(this.whiteSpaceMarkerTimer);

		this.cleanupEditorDom();
		this.quill = null;
	}

	/**
	 * Finds toolbar services and subscribes to editor toolbar selection.
	 *
	 * @returns {void}
	 */
	configureToolbarServices() {
		this.editorToolbar = this.props.editorToolbar || this.context?.registry?.subscribe?.('editor-toolbar') || null;
		this.editorSurface = this.props.editorSurface || this.context?.registry?.subscribe?.('editor-surface') || null;
		this.actionRegistry = this.props.actionRegistry || this.context?.registry?.subscribe?.('action-registry') || null;
		this.documentModel = this.props.documentModel || this.context?.registry?.subscribe?.('document-model') || null;
		this.documentFormat = this.props.documentFormat || this.context?.registry?.subscribe?.('document-format') || null;
		this.viewMode = this.props.viewMode || this.context?.registry?.subscribe?.('view-mode') || null;
		this.editorInteractions = this.props.editorInteractions || this.context?.registry?.subscribe?.('editor-interactions') || null;
		this.editorLayout = this.props.editorLayout || this.context?.registry?.subscribe?.('editor-layout') || null;
		this.editorViews = this.props.editorViews || this.context?.registry?.subscribe?.('editor-views') || null;
		this.objectTypes = this.props.objectTypes || this.context?.registry?.subscribe?.('object-type-registry') || null;
	}

	subscribeToEditorViews() {
		if (!this.editorViews?.listen) {
			return;
		}

		this.editorViewsListener = this.editorViews.listen(
			'updated',
			(editorViews) => this.setState({ editorViews }),
		);
		this.setState({
			editorViews: this.editorViews.getRequestedViews?.() || [],
		});
	}

	unsubscribeFromEditorViews() {
		if (this.editorViews?.unlisten && this.editorViewsListener) {
			this.editorViews.unlisten('updated', this.editorViewsListener);
		}

		this.editorViewsListener = null;
	}

	subscribeToDocumentSettings() {
		if (!this.documentModel?.listen) {
			return;
		}

		this.documentSettingsListener = this.documentModel.listen(
			'settings-changed',
			(settings) => this.onDocumentSettingsChanged(settings),
		);
		this.setState({
			documentSettings: this.documentModel.getSettings(),
		});
	}

	onDocumentSettingsChanged(settings) {
		this.setState({ documentSettings: settings }, () => {
			this.updateToolbarState();
			this.updateEmbedSelectionState();
			this.updatePagedPreviewHtml();
			this.updateDocumentOverflowWidth();
			this.scheduleWhiteSpaceMarkerUpdate();
		});
	}

	unsubscribeFromDocumentSettings() {
		if (this.documentModel?.unlisten && this.documentSettingsListener) {
			this.documentModel.unlisten('settings-changed', this.documentSettingsListener);
		}

		this.documentSettingsListener = null;
	}

	subscribeToDocumentTabs() {
		if (!this.documentModel?.listen) {
			return;
		}

		this.documentModelListeners = [
			[
				'active-tab-changed',
				this.documentModel.listen('active-tab-changed', () => this.loadActiveTabContent()),
			],
			[
				'document-loaded',
				this.documentModel.listen('document-loaded', () => this.loadActiveTabContent()),
			],
		];
	}

	unsubscribeFromDocumentTabs() {
		if (!this.documentModel?.unlisten || !this.documentModelListeners) {
			this.documentModelListeners = [];
			return;
		}

		this.documentModelListeners.forEach(([eventName, listener]) => {
			this.documentModel.unlisten(eventName, listener);
		});
		this.documentModelListeners = [];
	}

	subscribeToObjectTypes() {
		if (!this.objectTypes?.listen) {
			return;
		}

		this.objectTypeRegistryListeners = [
			['type-registered', this.objectTypes.listen('type-registered', this.onObjectTypesChanged.bind(this))],
			['type-removed', this.objectTypes.listen('type-removed', this.onObjectTypesChanged.bind(this))],
		];
	}

	unsubscribeFromObjectTypes() {
		if (!this.objectTypes?.unlisten || !this.objectTypeRegistryListeners) {
			this.objectTypeRegistryListeners = null;
			return;
		}

		this.objectTypeRegistryListeners.forEach(([eventName, listener]) => {
			this.objectTypes.unlisten(eventName, listener);
		});
		this.objectTypeRegistryListeners = null;
	}

	onObjectTypesChanged() {
		this.configureObjectTypeContext();
		this.listenForObjectTypeChanges();
		this.registerObjectTypeClipboardMatchers();
	}

	getObjectTypeClipboardMatchers() {
		return (this.objectTypes?.getTypes?.() || [])
			.flatMap((definition) => (
				Array.isArray(definition.clipboardMatchers)
					? definition.clipboardMatchers
					: []
			));
	}

	/**
	 * Creates the Quill editor instance and attaches the generic editor surface.
	 *
	 * @returns {void}
	 */
	mountEditor() {
		if (this.quill || !this.editorRef.current) {
			return;
		}

		this.cleanupEditorDom();
		const contributedModules = this.getEditorReadyQuillModules();

		this.quill = new Quill(this.editorRef.current, {
			modules: {
				...contributedModules,
				clipboard: {
					matchers: this.getObjectTypeClipboardMatchers(),
				},
				toolbar: false,
			},
			placeholder: this.state.placeholder || '',
			theme: 'snow',
		});

		this.quill.keyboard?.addBinding?.({ key: 'Enter', shortKey: true }, () => {
			this.insertPageBreak();
			return false;
		});
		this.quill.keyboard?.addBinding?.({ key: 'z', shortKey: true }, () => !this.undo());
		this.quill.keyboard?.addBinding?.({ key: 'Z', shortKey: true }, () => !this.undo());
		this.quill.keyboard?.addBinding?.({ key: 'z', shortKey: true, shiftKey: true }, () => !this.redo());
		this.quill.keyboard?.addBinding?.({ key: 'Z', shortKey: true, shiftKey: true }, () => !this.redo());
		this.quill.keyboard?.addBinding?.({ key: 'y', shortKey: true }, () => !this.redo());
		this.quill.keyboard?.addBinding?.({ key: 'Y', shortKey: true }, () => !this.redo());
		this.addLeadingKeyboardBinding({ key: 'Tab', shiftKey: false }, () => this.dispatchEditorKeyboardBinding({ key: 'Tab' }));
		this.addLeadingKeyboardBinding({ key: 'Tab', shiftKey: true }, () => this.dispatchEditorKeyboardBinding({ key: 'Tab', shiftKey: true }));
		this.quill.on('selection-change', (range, oldRange, source) => {
			this.updateToolbarState();
			this.updateEmbedSelectionState();
			this.dispatchEditorInteraction('selection-change', null, {
				oldRange,
				range,
				source,
			});
		});
		this.quill.on('text-change', (delta, oldDelta, source) => {
			this.onEditorTextChange(source);
		});
		this.selectionOwnerDocument = this.editorRef.current.ownerDocument;
		this.selectionOwnerDocument.addEventListener('selectionchange', this.updateEmbedSelectionState);
		this.attachNativeEditorInteractionListeners();
		this.attachEditorSurface();
		this.listenForObjectTypeChanges();
		this.registerObjectTypeClipboardMatchers();
		this.connectEditorMutationObserver();

		this.loadActiveTabContent();
		this.updatePagedPreviewHtml();
		this.updateDocumentOverflowWidth();
		this.scheduleWhiteSpaceMarkerUpdate();

	}

	getEditorReadyQuillModules() {
		const modules = {};

		this.editorInteractions?.notifyEditorReady?.({
			Quill,
			addQuillModuleOptions: (name, options) => {
				if (!name || !options) {
					return false;
				}

				modules[name] = {
					...(modules[name] || {}),
					...options,
				};
				return true;
			},
			registerQuillModule: (path, value, overwrite = true) => {
				if (!path || !value) {
					return false;
				}

				Quill.register({ [path]: value }, overwrite === true);
				return true;
			},
		});
		return modules;
	}

	registerObjectTypeClipboardMatchers() {
		const clipboard = this.quill?.clipboard;

		if (!clipboard?.addMatcher) {
			return;
		}

		this.getObjectTypeClipboardMatchers().forEach(([selector, matcher]) => {
			if (!selector || typeof matcher !== 'function') {
				return;
			}

			const key = `${String(selector)}:${matcher.name || 'anonymous'}`;

			if (this.objectTypeClipboardMatcherKeys.has(key)) {
				return;
			}

			clipboard.addMatcher(selector, matcher);
			this.objectTypeClipboardMatcherKeys.add(key);
		});
	}

	/**
	 * Adds a keyboard binding before Quill and TableUp default handlers.
	 *
	 * @param {Record<string, unknown>} binding
	 * @param {Function} handler
	 * @returns {void}
	 */
	addLeadingKeyboardBinding(binding, handler) {
		const keyboard = this.quill?.keyboard;

		if (!keyboard?.addBinding) {
			return;
		}

		keyboard.addBinding(binding, handler);
		const keys = [binding.key, binding.key === 'Tab' ? 9 : null].filter(Boolean);

		keys.forEach((key) => {
			const bindings = keyboard.bindings?.[key];

			if (!bindings || bindings.length < 2) {
				return;
			}

			bindings.unshift(bindings.pop());
		});
	}

	handleEditorContextMenu = (event) => {
		this.dispatchEditorInteraction('contextmenu', event);
	};

	handleEditorKeyDown = (event) => {
		this.dispatchEditorInteraction('keydown', event);
	};

	dispatchEditorKeyboardBinding(binding) {
		const result = this.dispatchEditorInteraction('keydown', {
			key: binding?.key,
			mnLeadingKeyboardBinding: true,
			preventDefault() {},
			shiftKey: binding?.shiftKey === true,
			stopImmediatePropagation() {},
			stopPropagation() {},
		}, {
			allowUnresolvedTarget: true,
		});

		return result?.handled === true ? false : true;
	}

	handleNativeEditorMouseDownCapture = (event) => {
		const result = this.dispatchEditorInteraction('mousedown-capture', event);

		if (result?.result?.suppressNativeSelection === true) {
			event.mnSuppressNativeSelection = true;
		}
	};

	attachNativeEditorInteractionListeners() {
		const root = this.quill?.root;

		if (!root || this.nativeEditorMouseDownRoot === root) {
			return;
		}

		this.detachNativeEditorInteractionListeners();
		root.addEventListener('mousedown', this.handleNativeEditorMouseDownCapture, true);
		this.nativeEditorMouseDownRoot = root;
	}

	detachNativeEditorInteractionListeners() {
		if (!this.nativeEditorMouseDownRoot) {
			return;
		}

		this.nativeEditorMouseDownRoot.removeEventListener('mousedown', this.handleNativeEditorMouseDownCapture, true);
		this.nativeEditorMouseDownRoot = null;
	}

	handleEditorSurfacePointerDownCapture = (event) => {
		if (!this.isLineSelectionGutterPoint(event)) {
			return;
		}

		this.handleLineSelectionPointerDown(event);
	};

	handleEditorSurfacePointerMoveCapture = (event) => {
		this.updateLineSelectionGutterCursor(event);
	};

	handleEditorSurfacePointerLeave = () => {
		this.setLineSelectionGutterCursor(false);
	};

	updateLineSelectionGutterCursor(event) {
		this.setLineSelectionGutterCursor(this.isLineSelectionGutterPoint(event));
	}

	setLineSelectionGutterCursor(active) {
		this.editorSurfaceRef.current?.classList?.toggle?.('mn-line-selection-gutter-cursor', active === true);
	}

	isLineSelectionGutterPoint(event) {
		const content = this.documentContentRef.current;
		const rect = content?.getBoundingClientRect?.();
		const clientX = Number(event?.clientX);
		const clientY = Number(event?.clientY);

		if (!rect || !Number.isFinite(clientX) || !Number.isFinite(clientY)) {
			return false;
		}

		return rect.top <= clientY
			&& clientY <= rect.bottom
			&& rect.left - 56 <= clientX
			&& clientX <= rect.left + 2;
	}

	handleEditorPointerDown = (event) => {
		const result = this.dispatchEditorInteraction('pointerdown', event);

		if (this.shouldCaptureEditorPointer(result)) {
			this.startEditorPointerCapture(event, result);
		}
	};

	handleEditorPointerMove = (event) => {
		if (this.editorPointerInteraction) {
			return;
		}

		this.dispatchEditorInteraction('pointermove', event);
	};

	handleEditorPointerLeave = (event) => {
		if (this.editorPointerInteraction) {
			return;
		}

		this.dispatchEditorInteraction('pointerleave', event);
	};

	handleEditorPointerUp = (event) => {
		if (this.editorPointerInteraction) {
			return;
		}

		this.dispatchEditorInteraction('pointerup', event);
	};

	handleEditorPointerCancel = (event) => {
		if (this.editorPointerInteraction) {
			return;
		}

		this.dispatchEditorInteraction('pointercancel', event);
	};

	dispatchEditorInteraction(eventName, event, extraContext = {}) {
		return this.editorInteractionDispatcher.dispatch(eventName, event, extraContext);
	}

	shouldCaptureEditorPointer(result) {
		return result?.handled === true && result?.result?.capturePointer === true;
	}

	startEditorPointerCapture(event, result) {
		const ownerDocument = event.currentTarget?.ownerDocument || event.target?.ownerDocument;

		if (!ownerDocument) {
			return;
		}

		this.detachEditorPointerCaptureListeners();
		this.editorPointerInteraction = {
			handlerId: result.handlerId || '',
			serviceName: result.serviceName || result.target?.serviceName || '',
			target: result.target || null,
		};
		this.editorPointerInteractionOwnerDocument = ownerDocument;
		ownerDocument.addEventListener('pointermove', this.handleCapturedEditorPointerMove);
		ownerDocument.addEventListener('pointerup', this.handleCapturedEditorPointerUp);
		ownerDocument.addEventListener('pointercancel', this.handleCapturedEditorPointerUp);
	}

	handleCapturedEditorPointerMove = (event) => {
		if (!this.editorPointerInteraction) {
			return;
		}

		this.dispatchEditorInteraction('pointermove', event, this.getCapturedEditorPointerContext());
	};

	handleCapturedEditorPointerUp = (event) => {
		if (!this.editorPointerInteraction) {
			return;
		}

		const eventName = event.type === 'pointercancel' ? 'pointercancel' : 'pointerup';

		this.dispatchEditorInteraction(eventName, event, this.getCapturedEditorPointerContext());
		this.detachEditorPointerCaptureListeners();
	};

	getCapturedEditorPointerContext() {
		return {
			captured: true,
			handlerId: this.editorPointerInteraction?.handlerId || '',
			target: this.editorPointerInteraction?.target || null,
			targetServiceName: this.editorPointerInteraction?.serviceName || '',
		};
	}

	detachEditorPointerCaptureListeners() {
		if (!this.editorPointerInteractionOwnerDocument) {
			this.editorPointerInteraction = null;
			return;
		}

		this.editorPointerInteractionOwnerDocument.removeEventListener('pointermove', this.handleCapturedEditorPointerMove);
		this.editorPointerInteractionOwnerDocument.removeEventListener('pointerup', this.handleCapturedEditorPointerUp);
		this.editorPointerInteractionOwnerDocument.removeEventListener('pointercancel', this.handleCapturedEditorPointerUp);
		this.editorPointerInteractionOwnerDocument = null;
		this.editorPointerInteraction = null;
	}

	getEditorInteractionContext() {
		return this.editorInteractionDispatcher.getInteractionContext();
	}

	getEditorViewContext() {
		return {
			editorRoot: this.quill?.root || null,
			findBlot: (node, bubble = true) => Quill.find(node, bubble),
			getIndex: (blot) => blot && this.quill?.getIndex ? this.quill.getIndex(blot) : null,
			getLeaf: (index) => this.quill?.getLeaf?.(index) || [],
			getLine: (index) => this.quill?.getLine?.(index) || [],
			getModule: (name) => this.quill?.getModule?.(name) || null,
			getContentWidth: this.getContentWidth.bind(this),
			getSelection: (focus = false) => this.quill?.getSelection?.(focus) || null,
			quill: this.quill,
			setSelection: (...args) => this.quill?.setSelection?.(...args),
			setSelectionWithoutScroll: (index, length, source, anchor) => (
				this.setQuillSelectionWithoutScroll(index, length, source, anchor)
			),
		};
	}

	renderEditorViews() {
		const requests = this.state.editorViews || [];

		return requests.map((request) => {
			const component = this.editorViews?.getComponent?.(request, this.getEditorViewContext());

			if (!component) {
				return null;
			}

			return (
				<React.Fragment key={request.name}>
					{component}
				</React.Fragment>
			);
		});
	}

	loadActiveTabContent() {
		if (!this.quill) {
			return;
		}

		const documentModel = this.documentModel;
		const activeTabId = documentModel?.getActiveTabId?.() || '';
		const content = documentModel?.getEditorContent?.(activeTabId)
			|| this.state.document
			|| { ops: [{ insert: '\n' }] };

		this.activeTabId = activeTabId;
		this.isApplyingDocumentModelContent = true;
		this.quill.setContents(content, 'silent');
		this.quill.setSelection(0, 0, 'silent');
		this.clearEditorHistoryAfterContentLoad();
		this.isApplyingDocumentModelContent = false;
		this.updateToolbarState();
		this.updateEmbedSelectionState();
		this.updatePagedPreviewHtml();
		this.updateDocumentOverflowWidth();
		this.scheduleWhiteSpaceMarkerUpdate();
	}

	clearEditorHistoryAfterContentLoad() {
		if (typeof this.quill?.history?.clear === 'function') {
			this.quill.history.clear();
			return;
		}

		if (Array.isArray(this.quill?.history?.stack?.undo)) {
			this.quill.history.stack.undo = [];
		}

		if (Array.isArray(this.quill?.history?.stack?.redo)) {
			this.quill.history.stack.redo = [];
		}
	}

	onEditorTextChange(source) {
		this.updateToolbarState();
		this.updateEmbedSelectionState();
		this.updatePagedPreviewHtml();
		this.updateDocumentOverflowWidth();
		this.scheduleWhiteSpaceMarkerUpdate();

		if (
			this.isApplyingDocumentModelContent ||
			source !== 'user' ||
			!this.quill ||
			!this.documentModel?.setEditorContent
		) {
			return;
		}

		const activeTabId = this.documentModel.getActiveTabId?.() || this.activeTabId;

		this.activeTabId = activeTabId;
		this.documentModel.setEditorContent(this.quill.getContents(), activeTabId);
	}

	/**
	 * Attaches this page as the active editor surface.
	 *
	 * @returns {void}
	 */
	attachEditorSurface() {
		if (!this.editorSurface) {
			return;
		}

		this.surfaceAdapter = {
			insertObject: this.insertObject.bind(this),
			insertPageBreak: this.insertPageBreak.bind(this),
			updateObject: this.updateObject.bind(this),
			removeObject: this.removeObject.bind(this),
			getContentWidth: this.getContentWidth.bind(this),
			getSelection: () => this.quill?.getSelection() || null,
			getQuill: () => this.quill || null,
			getQuillModule: (name) => this.quill?.getModule?.(name) || null,
			getEditorRoot: () => this.quill?.root || null,
			findBlot: (node, bubble = true) => Quill.find(node, bubble) || null,
			getIndex: (blot) => blot && this.quill?.getIndex ? this.quill.getIndex(blot) : null,
			getLine: (index) => this.quill?.getLine?.(index) || null,
			getLeaf: (index) => this.quill?.getLeaf?.(index) || null,
			setSelection: (index, length = 0, source = 'api') => {
				if (!this.quill?.setSelection) {
					return false;
				}

				this.quill.setSelection(index, length, source);
				return true;
			},
			focus: (options = undefined) => {
				if (!this.quill?.focus) {
					return false;
				}

				this.quill.focus(options);
				return true;
			},
			update: (source = 'api') => {
				if (!this.quill?.update) {
					return false;
				}

				this.quill.update(source);
				return true;
			},
			getParagraphFormat: this.getParagraphFormat.bind(this),
			format: this.format.bind(this),
			formatParagraph: this.formatParagraph.bind(this),
			redo: this.redo.bind(this),
			undo: this.undo.bind(this),
		};
		this.editorSurface.attachSurface(this.surfaceAdapter);
	}

	listenForObjectTypeChanges() {
		if (!this.editorSurfaceRef.current) {
			return;
		}

		this.removeObjectTypeEventListeners();
		this.objectTypeEventListeners = (this.objectTypes?.getTypes?.() || [])
			.flatMap((definition) => {
				const listeners = [];

				if (definition.changeEventName) {
					const listener = this.onEmbeddedObjectChanged.bind(this);

					this.editorSurfaceRef.current.addEventListener(definition.changeEventName, listener);
					listeners.push([definition.changeEventName, listener]);
				}

				if (definition.removeEventName) {
					const listener = this.onEmbeddedObjectRemoved.bind(this);

					this.editorSurfaceRef.current.addEventListener(definition.removeEventName, listener);
					listeners.push([definition.removeEventName, listener]);
				}

				return listeners;
			});
	}

	removeObjectTypeEventListeners() {
		if (!this.editorSurfaceRef.current || !this.objectTypeEventListeners) {
			this.objectTypeEventListeners = [];
			return;
		}

		this.objectTypeEventListeners.forEach(([eventName, listener]) => {
			this.editorSurfaceRef.current.removeEventListener(eventName, listener);
		});
		this.objectTypeEventListeners = [];
	}

	/**
	 * Toggles supported inline and list formats.
	 *
	 * @param {string} commandId
	 * @returns {void}
	 */
	format(commandId) {
		if (commandId === 'editor.format.clean') {
			this.cleanSelection();
			return true;
		}

		const formats = this.quill.getFormat();
		const formatByCommandId = {
			'editor.format.bold': 'bold',
			'editor.format.italic': 'italic',
			'editor.format.underline': 'underline',
		};

		if (formatByCommandId[commandId]) {
			const format = formatByCommandId[commandId];

			this.quill.format(format, !formats[format], 'user');
			this.updateToolbarState();
			return true;
		}

		if (commandId === 'editor.format.list.ordered') {
			this.quill.format('list', formats.list === 'ordered' ? false : 'ordered', 'user');
			this.updateToolbarState();
			return true;
		}

		if (commandId === 'editor.format.list.bullet') {
			this.quill.format('list', formats.list === 'bullet' ? false : 'bullet', 'user');
			this.updateToolbarState();
			return true;
		}

		return null;
	}

	/**
	 * Removes formatting from the current selection.
	 *
	 * @returns {void}
	 */
	cleanSelection() {
		const range = this.quill.getSelection(true);

		if (!range) {
			return;
		}

		if (range.length === 0) {
			Object.keys(this.quill.getFormat(range)).forEach((format) => {
				this.quill.format(format, false, 'user');
			});
		} else {
			this.quill.removeFormat(range.index, range.length, 'user');
		}

		this.updateToolbarState();
	}

	/**
	 * Gets paragraph-level formatting at the current selection.
	 *
	 * @returns {ParagraphFormatSettings | null}
	 */
	getParagraphFormat(focusEditor = false) {
		if (!this.quill) {
			return null;
		}

		const range = this.quill.getSelection(focusEditor);
		const formats = range ? this.quill.getFormat(range) : {};
		const settings = this.state.documentSettings || {};
		const styleId = normalizeParagraphStyleId(formats.paragraphStyle, settings);
		const styleFormat = resolveParagraphStyleFormat(styleId, settings);
		const documentFormat = getDocumentParagraphFormat(settings);
		const directFormat = getDirectParagraphFormat(formats);
		const overrides = getDirectParagraphFormatOverrides(formats);
		const effectiveFormat = {
			...documentFormat,
			...styleFormat,
			...directFormat,
		};

		return {
			alignment: normalizeParagraphAlignment(effectiveFormat.alignment),
			bold: effectiveFormat.bold === true,
			fontSize: normalizeParagraphFontSize(effectiveFormat.fontSize, documentFormat.fontSize),
			italic: effectiveFormat.italic === true,
			keepWithNext: effectiveFormat.keepWithNext === true,
			overrides,
			paddingAfter: normalizeParagraphSpacing(effectiveFormat.paddingAfter),
			paddingBefore: normalizeParagraphSpacing(effectiveFormat.paddingBefore),
			start: normalizeParagraphStart(effectiveFormat.start),
			styleId,
			underline: effectiveFormat.underline === true,
		};
	}

	/**
	 * Applies paragraph-level formatting to the current paragraph or selected paragraphs.
	 *
	 * @param {Partial<ParagraphFormatSettings>} format
	 * @returns {ParagraphFormatSettings | null}
	 */
	formatParagraph(format = {}) {
		if (!this.quill) {
			return null;
		}

		const range = this.quill.getSelection(true);

		if (!range) {
			return null;
		}

		const length = Math.max(range.length, 1);
		const paragraphFormats = {};

		this.quill.history?.cutoff?.();

		if (format.reset === true) {
			[
				'paragraphAlignment',
				'paragraphFontSize',
				'paragraphKeepWithNext',
				'paragraphPaddingAfter',
				'paragraphPaddingBefore',
				'paragraphStart',
				'paragraphBold',
				'paragraphItalic',
				'paragraphUnderline',
			].forEach((name) => {
				this.quill.formatLine(range.index, length, name, false, 'user');
			});
		}

		if (format.styleId !== undefined) {
			paragraphFormats.paragraphStyle = normalizeParagraphStyleId(format.styleId, this.state.documentSettings);
		}

		if (format.alignment !== undefined) {
			paragraphFormats.paragraphAlignment = normalizeParagraphAlignment(format.alignment);
		}

		if (format.fontSize !== undefined) {
			paragraphFormats.paragraphFontSize = `${normalizeParagraphFontSize(format.fontSize)}px`;
		}

		if (format.keepWithNext !== undefined) {
			paragraphFormats.paragraphKeepWithNext = format.keepWithNext === true ? 'true' : 'false';
		}

		if (format.paddingAfter !== undefined) {
			paragraphFormats.paragraphPaddingAfter = `${normalizeParagraphSpacing(format.paddingAfter)}px`;
		}

		if (format.paddingBefore !== undefined) {
			paragraphFormats.paragraphPaddingBefore = `${normalizeParagraphSpacing(format.paddingBefore)}px`;
		}

		if (format.start !== undefined) {
			paragraphFormats.paragraphStart = normalizeParagraphStart(format.start);
		}

		if (format.bold !== undefined) {
			paragraphFormats.paragraphBold = format.bold === true ? 'true' : 'false';
		}

		if (format.italic !== undefined) {
			paragraphFormats.paragraphItalic = format.italic === true ? 'true' : 'false';
		}

		if (format.underline !== undefined) {
			paragraphFormats.paragraphUnderline = format.underline === true ? 'true' : 'false';
		}

		Object.entries(paragraphFormats).forEach(([name, value]) => {
			this.quill.formatLine(range.index, length, name, value, 'user');
		});

		this.quill.history?.cutoff?.();
		this.updateToolbarState();
		return this.getParagraphFormat(true);
	}

	undo() {
		if (!this.quill) {
			return false;
		}

		const hasQuillUndo = this.quill.history?.stack?.undo?.length > 0;

		if (hasQuillUndo) {
			this.quill.history.undo();
			this.updateToolbarState();
			this.updatePagedPreviewHtml();
			return true;
		}

		if (this.documentFormat?.canUndo?.()) {
			this.documentFormat.undo();
			this.updateToolbarState();
			this.updatePagedPreviewHtml();
			return true;
		}

		return false;
	}

	redo() {
		if (!this.quill) {
			return false;
		}

		const hasQuillRedo = this.quill.history?.stack?.redo?.length > 0;

		if (hasQuillRedo) {
			this.quill.history.redo();
			this.updateToolbarState();
			this.updatePagedPreviewHtml();
			return true;
		}

		if (this.documentFormat?.canRedo?.()) {
			this.documentFormat.redo();
			this.updateToolbarState();
			this.updatePagedPreviewHtml();
			return true;
		}

		return false;
	}

	/**
	 * Applies an inline text format across the current paragraph or selected paragraphs.
	 *
	 * @param {{index: number, length: number}} range
	 * @param {string} name
	 * @param {boolean} value
	 * @returns {void}
	 */
	formatParagraphText(range, name, value) {
		const lines = this.quill.getLines(range.index, Math.max(range.length, 1));

		if (!lines.length && range.length === 0) {
			this.quill.format(name, value, 'user');
			return;
		}

		lines.forEach((line) => {
			const index = this.quill.getIndex(line);
			const length = Math.max(line.length() - 1, 0);

			if (length > 0) {
				this.quill.formatText(index, length, name, value, 'user');
			} else if (range.length === 0) {
				this.quill.setSelection(index, 0, 'silent');
				this.quill.format(name, value, 'user');
			}
		});
	}

	/**
	 * Mirrors current Quill selection formatting into toolbar item state.
	 *
	 * @returns {void}
	 */
	updateToolbarState() {
		if (!this.quill || !this.editorToolbar?.updateItem) {
			return;
		}

		const range = this.quill.getSelection();
		const formats = range ? this.quill.getFormat(range) : {};

		this.editorToolbar.updateItem('editor.bold', { pressed: Boolean(formats.bold) });
		this.editorToolbar.updateItem('editor.italic', { pressed: Boolean(formats.italic) });
		this.editorToolbar.updateItem('editor.underline', { pressed: Boolean(formats.underline) });
		this.editorToolbar.updateItem('editor.list.ordered', { pressed: formats.list === 'ordered' });
		this.editorToolbar.updateItem('editor.list.bullet', { pressed: formats.list === 'bullet' });

		const paragraphFormat = this.getParagraphFormat();

		if (paragraphFormat) {
			this.editorToolbar.updateItem('paragraph.style', { value: paragraphFormat.styleId });
			this.editorToolbar.updateItem('paragraph.font-size', { value: paragraphFormat.fontSize });
			this.editorToolbar.updateItem('paragraph.align.left', { pressed: paragraphFormat.alignment === 'left' });
			this.editorToolbar.updateItem('paragraph.align.center', { pressed: paragraphFormat.alignment === 'center' });
			this.editorToolbar.updateItem('paragraph.align.right', { pressed: paragraphFormat.alignment === 'right' });
			this.editorToolbar.updateItem('paragraph.align.justify', { pressed: paragraphFormat.alignment === 'justify' });
		}
	}

	/**
	 * Mirrors Quill selection inclusion onto rendered embeds without changing payloads.
	 *
	 * @returns {void}
	 */
	updateEmbedSelectionState = () => {
		if (!this.quill || !this.editorSurfaceRef.current) {
			return;
		}

		const range = this.quill.getSelection();

		this.editorSurfaceRef.current
			.querySelectorAll('.music-keyboard-embed')
			.forEach((node) => {
				const blot = Quill.find(node);
				const index = blot ? this.quill.getIndex(blot) : -1;
				const selected = isEmbedSelected(range, index) || isNativeSelectionIncludingNode(node);

				if (node.__musicNotebookEmbedSelected === selected) {
					return;
				}

				node.__musicNotebookEmbedSelected = selected;
				node.classList.toggle('music-keyboard-embed--selected', selected);
				node.dispatchEvent(new CustomEvent('music-keyboard-selection-change', {
					bubbles: false,
					detail: { selected },
				}));
			});
	};

	scheduleWhiteSpaceMarkerUpdate() {
		window.clearTimeout(this.whiteSpaceMarkerTimer);
		this.whiteSpaceMarkerTimer = window.setTimeout(() => this.updateWhiteSpaceMarkers(), 40);
	}

	updateWhiteSpaceMarkers() {
		const overlay = this.whiteSpaceOverlayRef.current;

		if (!overlay) {
			return;
		}

		overlay.innerHTML = '';

		if (this.state.seeWhiteSpace !== true) {
			return;
		}

		const editor = this.quill?.root || this.editorRef.current?.querySelector?.('.ql-editor');
		const root = overlay.offsetParent || overlay.parentElement;
		const rootRect = root?.getBoundingClientRect?.();

		if (!editor || !rootRect) {
			return;
		}

		const markers = [
			...this.getSpaceMarkers(editor, rootRect),
			...this.getParagraphMarkers(editor, rootRect),
		];

		markers.forEach((marker) => {
			const element = document.createElement('span');

			element.className = `mn-white-space-marker mn-white-space-marker--${marker.type}`;
			element.textContent = marker.text;
			element.style.left = `${marker.left}px`;
			element.style.top = `${marker.top}px`;
			overlay.appendChild(element);
		});
	}

	getSpaceMarkers(editor, rootRect) {
		const markers = [];
		const walker = document.createTreeWalker(
			editor,
			NodeFilter.SHOW_TEXT,
			{
				acceptNode(node) {
					if (!node.nodeValue || !node.nodeValue.includes(' ')) {
						return NodeFilter.FILTER_REJECT;
					}

					if (node.parentElement?.closest?.('.music-keyboard-embed, .ql-ui')) {
						return NodeFilter.FILTER_REJECT;
					}

					return NodeFilter.FILTER_ACCEPT;
				},
			},
		);

		while (walker.nextNode()) {
			const node = walker.currentNode;

			for (let index = 0; index < node.nodeValue.length; index += 1) {
				if (node.nodeValue[index] !== ' ') {
					continue;
				}

				const rect = getTextRangeRect(node, index, index + 1);

				if (!rect) {
					continue;
				}

				markers.push({
					left: rect.left - rootRect.left + (rect.width / 2),
					text: '·',
					top: rect.top - rootRect.top + (rect.height / 2),
					type: 'space',
				});
			}
		}

		return markers;
	}

	getParagraphMarkers(editor, rootRect) {
		return Array.from(editor.children)
			.filter((block) => !block.closest?.('.music-keyboard-embed'))
			.map((block) => {
				const anchor = getBlockEndAnchor(block);

				if (!anchor) {
					return null;
				}

				return {
					left: anchor.left - rootRect.left + 2,
					text: '¶',
					top: anchor.top - rootRect.top + (anchor.height / 2),
					type: 'paragraph',
				};
			})
			.filter(Boolean);
	}

	/**
	 * Shares the current app context with registered object embed renderers.
	 *
	 * @returns {void}
	 */
	configureObjectTypeContext() {
		(this.objectTypes?.getTypes?.() || []).forEach((definition) => {
			definition.configureContext?.(/** @type {MusicNotebookContextValue} */ (this.context));
		});
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

		surface.querySelectorAll(':scope > .ql-toolbar').forEach((toolbar) => toolbar.remove());
		this.selectionOwnerDocument?.removeEventListener('selectionchange', this.updateEmbedSelectionState);
		this.selectionOwnerDocument = null;
		editor.className = 'editor-quill';
		editor.innerHTML = '';
	}

	/**
	 * Starts Word-style content selection from the left document gutter.
	 *
	 * @param {React.PointerEvent<HTMLElement>} event
	 * @returns {void}
	 */
	handleLineSelectionPointerDown = (event) => {
		if (!this.quill) {
			return;
		}

		event.preventDefault();
		event.stopPropagation();

		const range = this.getLineSelectionRangeFromPoint(event.clientY);

		if (!range) {
			return;
		}

		const lineHit = this.getGutterLineSelectionHit(range, event);
		const target = this.editorInteractionDispatcher.resolveGutterTarget('gutter-line-select-start', range);
		const result = target
			? this.dispatchEditorInteraction('gutter-line-select-start', event, {
				anchorLineHit: lineHit,
				lineHit,
				target,
				targetServiceName: target.serviceName,
			})
			: { handled: false };

		if (result.handled) {
			event.preventDefault();
			event.stopPropagation();
			this.startGutterSelectionInteraction(event, result, lineHit);
			return;
		}

		this.lineSelectionAnchorRange = range;
		this.selectLineSelectionRanges(range, range);

		this.lineSelectionOwnerDocument = event.currentTarget.ownerDocument;
		this.lineSelectionOwnerDocument.addEventListener('pointermove', this.handleLineSelectionPointerMove);
		this.lineSelectionOwnerDocument.addEventListener('pointerup', this.handleLineSelectionPointerUp);
		this.lineSelectionOwnerDocument.addEventListener('pointercancel', this.handleLineSelectionPointerUp);
	};

	/**
	 * Extends gutter selection while dragging through the margin.
	 *
	 * @param {PointerEvent} event
	 * @returns {void}
	 */
	handleLineSelectionPointerMove = (event) => {
		if (this.gutterSelectionInteraction) {
			const range = this.getLineSelectionRangeFromPoint(event.clientY);

			if (!range) {
				return;
			}

			event.preventDefault();
			this.dispatchEditorInteraction('gutter-line-select-move', event, {
				anchorLineHit: this.gutterSelectionInteraction.anchorLineHit,
				lineHit: this.getGutterLineSelectionHit(range, event),
				target: this.gutterSelectionInteraction.target,
				targetServiceName: this.gutterSelectionInteraction.serviceName,
			});
			return;
		}

		if (!this.lineSelectionAnchorRange) {
			return;
		}

		const range = this.getLineSelectionRangeFromPoint(event.clientY);

		if (!range) {
			return;
		}

		event.preventDefault();
		this.selectLineSelectionRanges(this.lineSelectionAnchorRange, range);
	};

	/**
	 * Ends active gutter line selection.
	 *
	 * @returns {void}
	 */
	handleLineSelectionPointerUp = (event) => {
		if (this.gutterSelectionInteraction) {
			this.dispatchEditorInteraction(
				event?.type === 'pointercancel' ? 'gutter-line-select-cancel' : 'gutter-line-select-end',
				event,
				{
					anchorLineHit: this.gutterSelectionInteraction.anchorLineHit,
					target: this.gutterSelectionInteraction.target,
					targetServiceName: this.gutterSelectionInteraction.serviceName,
				},
			);
			this.gutterSelectionInteraction = null;
			this.detachLineSelectionDragListeners();
			return;
		}

		this.lineSelectionAnchorRange = null;
		this.detachLineSelectionDragListeners();
	};

	startGutterSelectionInteraction(event, result, anchorLineHit) {
		const ownerDocument = event.currentTarget?.ownerDocument || event.target?.ownerDocument;

		if (!ownerDocument) {
			return;
		}

		this.gutterSelectionInteraction = {
			anchorLineHit,
			handlerId: result.handlerId || '',
			serviceName: result.serviceName || result.target?.serviceName || '',
			target: result.target || null,
		};
		this.lineSelectionOwnerDocument = ownerDocument;
		ownerDocument.addEventListener('pointermove', this.handleLineSelectionPointerMove);
		ownerDocument.addEventListener('pointerup', this.handleLineSelectionPointerUp);
		ownerDocument.addEventListener('pointercancel', this.handleLineSelectionPointerUp);
	}

	getGutterLineSelectionHit(range, event) {
		return {
			point: this.editorInteractionDispatcher.getPoint(event),
			range: {
				index: range.index,
				length: range.length,
			},
			sourceElement: range.sourceElement || null,
		};
	}

	/**
	 * Removes document-level gutter drag listeners.
	 *
	 * @returns {void}
	 */
	detachLineSelectionDragListeners() {
		if (!this.lineSelectionOwnerDocument) {
			return;
		}

		this.lineSelectionOwnerDocument.removeEventListener('pointermove', this.handleLineSelectionPointerMove);
		this.lineSelectionOwnerDocument.removeEventListener('pointerup', this.handleLineSelectionPointerUp);
		this.lineSelectionOwnerDocument.removeEventListener('pointercancel', this.handleLineSelectionPointerUp);
		this.lineSelectionOwnerDocument = null;
	}

	/**
	 * Selects the combined full-line range represented by two gutter hits.
	 *
	 * @param {{index: number, length: number}} anchorRange
	 * @param {{index: number, length: number}} focusRange
	 * @returns {void}
	 */
	selectLineSelectionRanges(anchorRange, focusRange) {
		const start = Math.min(anchorRange.index, focusRange.index);
		const end = Math.max(anchorRange.index + anchorRange.length, focusRange.index + focusRange.length);
		const length = Math.max(end - start, 0);

		this.quill?.setSelection(start, length, 'user');
		this.updateToolbarState();
		this.updateEmbedSelectionState();
	}

	/**
	 * Resolves a gutter y-position to the visual editor line nearest that point.
	 *
	 * @param {number} clientY
	 * @returns {{index: number, length: number} | null}
	 */
	getLineSelectionRangeFromPoint(clientY) {
		const editor = this.quill?.root;
		const rect = editor?.getBoundingClientRect?.();

		if (!editor || !rect || rect.width <= 0 || rect.height <= 0) {
			return null;
		}

		const y = clampNumber(clientY, rect.top + 1, rect.bottom - 1);
		const renderedRange = this.getRenderedLineSelectionRangeFromPoint(y);

		if (renderedRange) {
			return renderedRange;
		}

		const startRange = this.getQuillRangeFromPoint(rect.left + 1, y);
		const endRange = this.getQuillRangeFromPoint(rect.right - 1, y);
		const startIndex = startRange?.index;
		const endIndex = endRange?.index;

		if (!Number.isInteger(startIndex) && !Number.isInteger(endIndex)) {
			return null;
		}

		if (Number.isInteger(startIndex) && Number.isInteger(endIndex) && startIndex !== endIndex) {
			const index = Math.min(startIndex, endIndex);
			return {
				index,
				length: Math.max(Math.max(startIndex, endIndex) - index, 1),
			};
		}

		const index = Number.isInteger(startIndex) ? startIndex : endIndex;
		return this.getLogicalLineRangeAtIndex(index);
	}

	getRenderedLineSelectionRangeFromPoint(clientY) {
		const editor = this.quill?.root;
		const ownerDocument = editor?.ownerDocument || document;

		if (!editor?.nodeType || !ownerDocument?.createTreeWalker) {
			return null;
		}

		const candidates = this.getRenderedTextLineCandidates(editor, clientY);
		const line = this.getClosestRenderedTextLine(candidates, clientY);

		if (!line) {
			return null;
		}

		return {
			index: line.index,
			length: Math.max(line.end - line.index, 1),
		};
	}

	getRenderedTextLineCandidates(editor, clientY) {
		const ownerDocument = editor.ownerDocument || document;
		const nodeFilter = ownerDocument.defaultView?.NodeFilter
			|| (typeof NodeFilter === 'undefined' ? null : NodeFilter);

		if (!nodeFilter) {
			return [];
		}

		const walker = ownerDocument.createTreeWalker(
			editor,
			nodeFilter.SHOW_TEXT,
			{
				acceptNode(node) {
					if (!node.nodeValue || !node.nodeValue.trim()) {
						return nodeFilter.FILTER_REJECT;
					}

					if (node.parentElement?.closest?.('.music-keyboard-embed, .ql-ui')) {
						return nodeFilter.FILTER_REJECT;
					}

					return nodeFilter.FILTER_ACCEPT;
				},
			},
		);
		const candidates = [];

		while (walker.nextNode()) {
			const node = walker.currentNode;

			for (let offset = 0; offset < node.nodeValue.length; offset += 1) {
				const rect = getTextRangeRect(node, offset, offset + 1);

				if (!rect || rect.width <= 0 || rect.height <= 0) {
					continue;
				}

				if (rect.bottom < clientY - 8 || rect.top > clientY + 8) {
					continue;
				}

				const start = this.getQuillRangeFromTextOffset(node, offset)?.index;
				const end = this.getQuillRangeFromTextOffset(node, offset + 1)?.index;

				if (!Number.isInteger(start) || !Number.isInteger(end)) {
					continue;
				}

				candidates.push({
					bottom: rect.bottom,
					center: rect.top + (rect.height / 2),
					end: Math.max(start, end),
					index: Math.min(start, end),
					top: rect.top,
				});
			}
		}

		return candidates;
	}

	getClosestRenderedTextLine(candidates, clientY) {
		const lines = [];

		candidates.forEach((candidate) => {
			const line = lines.find((entry) => Math.abs(entry.center - candidate.center) <= 3);

			if (line) {
				line.bottom = Math.max(line.bottom, candidate.bottom);
				line.center = (line.center + candidate.center) / 2;
				line.end = Math.max(line.end, candidate.end);
				line.index = Math.min(line.index, candidate.index);
				line.top = Math.min(line.top, candidate.top);
				return;
			}

			lines.push({ ...candidate });
		});

		return lines
			.filter((line) => line.top - 4 <= clientY && clientY <= line.bottom + 4)
			.sort((first, second) => (
				Math.abs(first.center - clientY) - Math.abs(second.center - clientY)
				|| first.index - second.index
			))[0] || null;
	}

	getQuillRangeFromTextOffset(node, offset) {
		const ownerDocument = node?.ownerDocument || document;
		const range = ownerDocument.createRange?.();

		if (!range) {
			return null;
		}

		try {
			range.setStart(node, offset);
			range.setEnd(node, offset);
			const normalized = this.quill?.selection?.normalizeNative?.(range);

			return normalized ? this.quill.selection.normalizedToRange(normalized) : null;
		} finally {
			range.detach?.();
		}
	}

	/**
	 * Converts a browser caret point to a Quill range.
	 *
	 * @param {number} clientX
	 * @param {number} clientY
	 * @returns {{index: number, length: number} | null}
	 */
	getQuillRangeFromPoint(clientX, clientY) {
		const ownerDocument = this.quill?.root?.ownerDocument || document;
		let nativeRange = null;

		if (ownerDocument.caretRangeFromPoint) {
			nativeRange = ownerDocument.caretRangeFromPoint(clientX, clientY);
		} else if (ownerDocument.caretPositionFromPoint) {
			const position = ownerDocument.caretPositionFromPoint(clientX, clientY);

			if (position) {
				nativeRange = ownerDocument.createRange();
				nativeRange.setStart(position.offsetNode, position.offset);
				nativeRange.setEnd(position.offsetNode, position.offset);
			}
		}

		const normalized = nativeRange && this.quill?.selection?.normalizeNative?.(nativeRange);
		return normalized ? this.quill.selection.normalizedToRange(normalized) : null;
	}

	/**
	 * Gets a complete logical Quill line when the browser returns one caret point.
	 *
	 * @param {number} index
	 * @returns {{index: number, length: number} | null}
	 */
	getLogicalLineRangeAtIndex(index) {
		const [line] = this.quill?.getLine?.(index) || [];

		if (!line) {
			return null;
		}

		const lineIndex = this.quill.getIndex(line);
		const length = Math.max(line.length(), 1);

		return {
			index: lineIndex,
			length,
		};
	}

	/**
	 * Sets a Quill selection while preserving visible scroll positions.
	 *
	 * @param {number} index - Selection index.
	 * @param {number} length - Selection length.
	 * @param {string} source - Quill selection source.
	 * @param {Element | null} anchor - DOM anchor used to find scroll containers.
	 * @returns {void}
	 */
	setQuillSelectionWithoutScroll(index, length, source, anchor = null) {
		const snapshots = this.captureScrollSnapshots(anchor);

		try {
			this.quill?.focus?.({ preventScroll: true });
			this.quill?.setSelection?.(index, length, source);
		} finally {
			this.restoreScrollSnapshots(snapshots);
			window.setTimeout(() => this.restoreScrollSnapshots(snapshots), 0);
		}
	}

	/**
	 * Captures scroll positions that programmatic focus/selection might disturb.
	 *
	 * @param {Element | null} anchor - DOM anchor used to find scroll containers.
	 * @returns {Array<Record<string, unknown>>}
	 */
	captureScrollSnapshots(anchor = null) {
		const snapshots = [];
		const ownerDocument = anchor?.ownerDocument || this.quill?.root?.ownerDocument || document;
		const ownerWindow = ownerDocument?.defaultView || window;
		const seen = new Set();

		if (ownerWindow) {
			snapshots.push({
				target: ownerWindow,
				type: 'window',
				x: ownerWindow.scrollX,
				y: ownerWindow.scrollY,
			});
		}

		[
			this.documentContentRef?.current,
			this.quill?.root,
			anchor,
			anchor?.closest?.('.ql-editor, .mn-document-content, .mn-editor-page, .mn-editor-scroll, [data-scroll-container]'),
		].filter(Boolean).forEach((node) => {
			let current = node;

			while (current && current !== ownerDocument?.body && current !== ownerDocument?.documentElement) {
				if (!seen.has(current) && this.isScrollableElement(current)) {
					seen.add(current);
					snapshots.push({
						target: current,
						type: 'element',
						x: current.scrollLeft,
						y: current.scrollTop,
					});
				}

				current = current.parentElement;
			}
		});

		return snapshots;
	}

	/**
	 * Restores scroll positions captured before a forced Quill selection.
	 *
	 * @param {Array<Record<string, unknown>>} snapshots - Captured scroll positions.
	 * @returns {void}
	 */
	restoreScrollSnapshots(snapshots = []) {
		snapshots.forEach((snapshot) => {
			if (snapshot.type === 'window') {
				snapshot.target?.scrollTo?.(snapshot.x, snapshot.y);
				return;
			}

			if (snapshot.target) {
				snapshot.target.scrollLeft = snapshot.x;
				snapshot.target.scrollTop = snapshot.y;
			}
		});
	}

	/**
	 * Checks whether an element can scroll.
	 *
	 * @param {Element | unknown} element - Candidate element.
	 * @returns {boolean}
	 */
	isScrollableElement(element) {
		return Boolean(element
			&& (element.scrollHeight > element.clientHeight || element.scrollWidth > element.clientWidth));
	}

	/**
	 * Gets an element from a DOM node.
	 *
	 * @param {Node | Element | unknown} node - Source node.
	 * @returns {Element | null}
	 */
	getElementFromNode(node) {
		if (!node) {
			return null;
		}

		if (node.nodeType === getNodeType('ELEMENT_NODE')) {
			return node;
		}

		return node.parentElement || null;
	}

	/**
	 * Gets the initial document layout CSS variables.
	 *
	 * @returns {React.CSSProperties}
	 */
	getDocumentLayoutStyle() {
		const page = this.state.documentSettings?.page || {};
		const margins = page.margins || {};
		const typography = this.state.documentSettings?.typography || {};
		const dimensions = this.getPageDimensions(page.size, page.orientation);
		const fontSize = Number.isFinite(typography.fontSize) ? typography.fontSize : 12;

		return {
			'--mn-document-font-size': `${fontSize}px`,
			'--mn-page-width': `${dimensions.width}in`,
			'--mn-page-height': `${dimensions.height}in`,
			'--mn-margin-top': `${Number.isFinite(margins.top) ? margins.top : 72}pt`,
			'--mn-margin-right': `${Number.isFinite(margins.right) ? margins.right : 72}pt`,
			'--mn-margin-bottom': `${Number.isFinite(margins.bottom) ? margins.bottom : 72}pt`,
			'--mn-margin-left': `${Number.isFinite(margins.left) ? margins.left : 72}pt`,
		};
	}

	getPagedPreviewPageCss() {
		const page = this.state.documentSettings?.page || {};
		const margins = page.margins || {};
		const typography = this.state.documentSettings?.typography || {};
		const dimensions = this.getPageDimensions(page.size, page.orientation);
		const fontSize = Number.isFinite(typography.fontSize) ? typography.fontSize : 12;
		const marginTop = Number.isFinite(margins.top) ? margins.top : 72;
		const marginRight = Number.isFinite(margins.right) ? margins.right : 72;
		const marginBottom = Number.isFinite(margins.bottom) ? margins.bottom : 72;
		const marginLeft = Number.isFinite(margins.left) ? margins.left : 72;

		return `
			@page {
				size: ${dimensions.width}in ${dimensions.height}in;
				margin: ${marginTop}pt ${marginRight}pt ${marginBottom}pt ${marginLeft}pt;
			}

			.mn-paged-preview-document {
				font-size: ${fontSize}px;
			}

			.pagedjs_page {
				--mn-paged-margin-top: ${marginTop}pt;
				--mn-paged-margin-right: ${marginRight}pt;
				--mn-paged-margin-bottom: ${marginBottom}pt;
				--mn-paged-margin-left: ${marginLeft}pt;
			}
		`;
	}

	/**
	 * Gets CSS rules for document-global paragraph styles.
	 *
	 * @returns {string}
	 */
	getDocumentParagraphStyleRules() {
		const settings = this.state.documentSettings || {};

		return getDocumentParagraphStyles(settings)
			.map((style) => {
				const format = resolveParagraphStyleFormat(style.id, settings);
				const declarations = getParagraphStyleDeclarations(format);

				if (!declarations.length) {
					return '';
				}

				return `.mn-document-content .ql-editor :where(.ql-paragraph-style-${style.id}) { ${declarations.join(' ')} }`;
			})
			.filter(Boolean)
			.join('\n');
	}

	getPageDimensions(size = 'letter', orientation = 'portrait') {
		const pageSizes = {
			letter: { width: 8.5, height: 11 },
			legal: { width: 8.5, height: 14 },
			a4: { width: 8.27, height: 11.69 },
			a5: { width: 5.83, height: 8.27 },
		};
		const dimensions = pageSizes[size] || pageSizes.letter;

		if (orientation === 'landscape') {
			return {
				width: dimensions.height,
				height: dimensions.width,
			};
		}

		return dimensions;
	}

	getContentWidth() {
		const content = this.documentContentRef.current;
		const guideStyle = content ? getComputedStyle(content, '::after') : null;
		const guideWidth = Number.parseFloat(guideStyle?.width || '');

		if (Number.isFinite(guideWidth) && guideWidth > 0) {
			return guideWidth;
		}

		const contentStyle = content ? getComputedStyle(content) : null;
		const cssContentWidth = Number.parseFloat(contentStyle?.getPropertyValue('--mn-content-width') || '');

		if (Number.isFinite(cssContentWidth) && cssContentWidth > 0) {
			return cssContentWidth;
		}

		const editor = this.quill?.root || this.editorRef.current?.querySelector?.('.ql-editor');
		const bounds = editor?.getBoundingClientRect?.();
		const width = Number(bounds?.width || editor?.clientWidth);

		return Number.isFinite(width) && width > 0 ? width : null;
	}

	connectEditorMutationObserver() {
		const editor = this.quill?.root;

		if (!editor || typeof MutationObserver !== 'function') {
			return;
		}

		this.disconnectEditorMutationObserver();
		this.editorMutationObserver = new MutationObserver(() => {
			this.schedulePagedPreviewHtmlUpdate();
			this.scheduleDocumentOverflowWidthUpdate();
			this.scheduleWhiteSpaceMarkerUpdate();
		});
		this.editorMutationObserver.observe(editor, {
			attributes: true,
			childList: true,
			characterData: true,
			subtree: true,
		});
	}

	disconnectEditorMutationObserver() {
		this.editorMutationObserver?.disconnect?.();
		this.editorMutationObserver = null;
	}

	schedulePagedPreviewHtmlUpdate() {
		window.clearTimeout(this.pagedPreviewHtmlTimer);
		this.pagedPreviewHtmlTimer = window.setTimeout(() => this.updatePagedPreviewHtml(), 120);
	}

	scheduleDocumentOverflowWidthUpdate() {
		window.clearTimeout(this.documentOverflowWidthTimer);
		this.documentOverflowWidthTimer = window.setTimeout(() => this.updateDocumentOverflowWidth(), 60);
	}

	updateDocumentOverflowWidth() {
		const content = this.documentContentRef.current;
		const editor = this.quill?.root;

		if (!content || !editor) {
			return;
		}

		const editorRect = editor.getBoundingClientRect?.();
		const contentRect = content.getBoundingClientRect?.();
		const baseWidth = Number(editorRect?.width || editor.clientWidth);

		if (!Number.isFinite(baseWidth) || baseWidth <= 0) {
			return;
		}

		const overflowWidth = this.editorLayout?.getWideContentWidth?.({
			baseWidth,
			content,
			contentRect,
			editorRoot: editor,
		}) ?? baseWidth;

		if (overflowWidth > baseWidth + 1) {
			content.style.setProperty('--mn-editor-overflow-width', `${overflowWidth}px`);
		} else {
			content.style.removeProperty('--mn-editor-overflow-width');
		}
	}

	updatePagedPreviewHtml() {
		const html = this.quill?.root?.innerHTML || '';

		if (html === this.state.pagedPreviewHtml) {
			return;
		}

		this.setState({ pagedPreviewHtml: html });
	}

	/**
	 * Inserts a generic document object into the current Quill selection.
	 *
	 * @param {NotebookDocumentObject} object
	 * @returns {unknown}
	 */
	insertObject(object) {
		if (!this.quill) {
			return null;
		}

		const definition = this.objectTypes?.getType?.(object.type);
		const blotName = definition?.blotName;

		if (!blotName) {
			console.warn(`Cannot insert document object "${object.id}" because object type "${object.type}" has no blot.`);
			return null;
		}

		const selection = this.quill.getSelection(true);
		const index = selection?.index ?? this.quill.getLength();
		const embedValue = definition.toEmbedValue?.(object) || object;
		const embedIndex = Math.min(Math.max(index, 0), Math.max(this.quill.getLength() - 1, 0));

		this.quill.insertEmbed(embedIndex, blotName, embedValue, 'user');
		this.quill.insertText(embedIndex + 1, '\n', 'user');
		this.quill.setSelection(embedIndex + 2, 0, 'silent');
		return object;
	}

	insertPageBreak() {
		if (!this.quill) {
			return false;
		}

		const range = this.quill.getSelection(true);

		if (!range) {
			return false;
		}

		if (range.length > 0) {
			this.quill.deleteText(range.index, range.length, 'user');
		}

		this.quill.insertText(range.index, '\n', 'user');
		this.quill.formatLine(range.index + 1, 1, 'paragraphStart', 'next-page', 'user');
		this.quill.setSelection(range.index + 1, 0, 'silent');
		this.updateToolbarState();
		this.updatePagedPreviewHtml();
		this.scheduleWhiteSpaceMarkerUpdate();
		return true;
	}

	updateObject(objectId, patch = {}) {
		return this.documentModel?.updateObject?.(objectId, patch) || null;
	}

	removeObject(objectId) {
		return this.documentModel?.removeObject?.(objectId) || false;
	}

	onEmbeddedObjectChanged(event) {
		const payload = event?.detail?.payload;

		if (!payload?.id) {
			return;
		}

		this.updateObject(payload.id, { data: payload });
	}

	onEmbeddedObjectRemoved(event) {
		const objectId = event?.detail?.id;

		if (!objectId) {
			return;
		}

		this.removeObject(objectId);
	}

	/**
	 * Renders the continuous editor page.
	 *
	 * @returns {React.ReactElement}
	 */
	render() {
		const editorToolbar = this.editorToolbar || this.props.editorToolbar || this.context?.registry?.subscribe?.('editor-toolbar') || null;
		const actionRegistry = this.actionRegistry || this.props.actionRegistry || this.context?.registry?.subscribe?.('action-registry') || null;
		const contentClassName = [
			'mn-document-content',
			this.state.seeWhiteSpace === true ? 'mn-document-content--see-white-space' : '',
		].filter(Boolean).join(' ');

		return (
			<section className="editor-page">
				<EditorToolbar
					editorToolbar={editorToolbar}
					actionRegistry={actionRegistry}
					label="Editor toolbar"
				/>
				<div
					ref={this.editorSurfaceRef}
					className="editor-page-surface"
					onPointerDownCapture={this.handleEditorSurfacePointerDownCapture}
					onPointerLeave={this.handleEditorSurfacePointerLeave}
					onPointerMoveCapture={this.handleEditorSurfacePointerMoveCapture}
				>
					<div className="mn-editor-split-workspace">
						<div className="mn-document-workspace">
							<div
								className="mn-document-sheet mn-document-sheet--continuous"
								style={this.getDocumentLayoutStyle()}
							>
								<style>{this.getDocumentParagraphStyleRules()}</style>
								<div ref={this.documentContentRef} className={contentClassName}>
									<div
										className="mn-line-selection-gutter"
										aria-hidden="true"
										onPointerDown={this.handleLineSelectionPointerDown}
									/>
									<div
										ref={this.editorRef}
										className="editor-quill"
										onContextMenu={this.handleEditorContextMenu}
										onKeyDown={this.handleEditorKeyDown}
										onPointerCancel={this.handleEditorPointerCancel}
										onPointerDown={this.handleEditorPointerDown}
										onPointerLeave={this.handleEditorPointerLeave}
										onPointerMove={this.handleEditorPointerMove}
										onPointerUp={this.handleEditorPointerUp}
									/>
									<div
										ref={this.whiteSpaceOverlayRef}
										className="mn-white-space-overlay"
										aria-hidden="true"
									/>
									{this.renderEditorViews()}
								</div>
							</div>
						</div>
						<ViewModePane
							contentHtml={this.state.pagedPreviewHtml}
							contentRoot={this.quill?.root || null}
							pageCss={this.getPagedPreviewPageCss()}
							styleRules={this.getDocumentParagraphStyleRules()}
							viewMode={this.viewMode}
						/>
					</div>
				</div>
			</section>
		);
	}

}

function normalizeParagraphAlignment(value) {
	return ['center', 'right', 'justify'].includes(value) ? value : 'left';
}

function clampNumber(value, min, max) {
	const number = Number(value);

	if (!Number.isFinite(number)) {
		return min;
	}

	return Math.min(Math.max(number, min), max);
}

function getTextRangeRect(node, start, end) {
	const range = node.ownerDocument.createRange();

	range.setStart(node, start);
	range.setEnd(node, end);

	const rect = Array.from(range.getClientRects())
		.find((candidate) => candidate.width > 0 && candidate.height > 0);

	range.detach?.();
	return rect || null;
}

function getBlockEndAnchor(block) {
	const textNode = getLastTextNode(block);

	if (textNode?.nodeValue?.length) {
		const range = block.ownerDocument.createRange();
		const end = textNode.nodeValue.length;

		range.setStart(textNode, Math.max(end - 1, 0));
		range.setEnd(textNode, end);

		const rect = Array.from(range.getClientRects())
			.reverse()
			.find((candidate) => candidate.width > 0 && candidate.height > 0);

		range.detach?.();

		if (rect) {
			return {
				height: rect.height,
				left: rect.right,
				top: rect.top,
			};
		}
	}

	const elementRect = getLastElementRect(block);

	if (elementRect) {
		return {
			height: elementRect.height,
			left: elementRect.right,
			top: elementRect.top,
		};
	}

	const blockRect = block.getBoundingClientRect();

	if (!blockRect) {
		return null;
	}

	return {
		height: blockRect.height,
		left: blockRect.left,
		top: blockRect.top,
	};
}

function getLastTextNode(root) {
	const walker = root.ownerDocument.createTreeWalker(
		root,
		NodeFilter.SHOW_TEXT,
		{
			acceptNode(node) {
				if (!node.nodeValue || !node.nodeValue.trim()) {
					return NodeFilter.FILTER_REJECT;
				}

				if (node.parentElement?.closest?.('.music-keyboard-embed, .ql-ui')) {
					return NodeFilter.FILTER_REJECT;
				}

				return NodeFilter.FILTER_ACCEPT;
			},
		},
	);
	let last = null;

	while (walker.nextNode()) {
		last = walker.currentNode;
	}

	return last;
}

function getLastElementRect(root) {
	const elements = Array.from(root.querySelectorAll('*'))
		.filter((element) => {
			if (element.matches('br, .ql-ui')) {
				return false;
			}

			if (element.closest('.ql-ui')) {
				return false;
			}

			const rect = element.getBoundingClientRect();

			return rect.width > 0 && rect.height > 0;
		});
	const element = elements[elements.length - 1];

	return element?.getBoundingClientRect?.() || null;
}

function normalizeParagraphStart(value) {
	return ['full-line', 'next-page'].includes(value) ? value : 'continuous';
}

function normalizeParagraphFontSize(value, fallback = 12) {
	const size = Number(value);

	if (!Number.isFinite(size)) {
		return normalizeParagraphFontSize(fallback, 12);
	}

	return Math.min(Math.max(Math.round(size), 6), 144);
}

function parseParagraphFontSize(value, fallback = 12) {
	if (typeof value === 'string') {
		const match = value.match(/^([0-9]+(?:\.[0-9]+)?)px$/);

		if (match) {
			return normalizeParagraphFontSize(Number(match[1]), fallback);
		}
	}

	return normalizeParagraphFontSize(value, fallback);
}

function normalizeParagraphSpacing(value, fallback = 0) {
	const spacing = Number(value);

	if (!Number.isFinite(spacing)) {
		return normalizeParagraphSpacing(fallback, 0);
	}

	return Math.min(Math.max(Math.round(spacing), 0), 240);
}

function parseParagraphSpacing(value, fallback = 0) {
	if (typeof value === 'string') {
		const match = value.match(/^([0-9]+(?:\.[0-9]+)?)px$/);

		if (match) {
			return normalizeParagraphSpacing(Number(match[1]), fallback);
		}
	}

	return normalizeParagraphSpacing(value, fallback);
}

function getDocumentParagraphFormat(settings = {}) {
	return {
		alignment: 'left',
		bold: false,
		fontSize: normalizeParagraphFontSize(settings.typography?.fontSize, 12),
		italic: false,
		keepWithNext: false,
		paddingAfter: 0,
		paddingBefore: 0,
		start: 'continuous',
		underline: false,
	};
}

function getDirectParagraphFormat(formats = {}) {
	const direct = {};
	const paragraphAlignment = formats.paragraphAlignment || formats.align;
	const paragraphBold = parseParagraphBoolean(formats.paragraphBold);
	const paragraphItalic = parseParagraphBoolean(formats.paragraphItalic);
	const paragraphKeepWithNext = parseParagraphBoolean(formats.paragraphKeepWithNext);
	const paragraphUnderline = parseParagraphBoolean(formats.paragraphUnderline);

	if (paragraphAlignment) {
		direct.alignment = normalizeParagraphAlignment(paragraphAlignment);
	}

	if (formats.paragraphFontSize) {
		direct.fontSize = parseParagraphFontSize(formats.paragraphFontSize);
	}

	if (paragraphBold !== null) {
		direct.bold = paragraphBold;
	} else if (formats.bold) {
		direct.bold = true;
	}

	if (paragraphItalic !== null) {
		direct.italic = paragraphItalic;
	} else if (formats.italic) {
		direct.italic = true;
	}

	if (paragraphKeepWithNext !== null) {
		direct.keepWithNext = paragraphKeepWithNext;
	}

	if (formats.paragraphPaddingAfter) {
		direct.paddingAfter = parseParagraphSpacing(formats.paragraphPaddingAfter);
	}

	if (formats.paragraphPaddingBefore) {
		direct.paddingBefore = parseParagraphSpacing(formats.paragraphPaddingBefore);
	}

	if (formats.paragraphStart) {
		direct.start = normalizeParagraphStart(formats.paragraphStart);
	}

	if (paragraphUnderline !== null) {
		direct.underline = paragraphUnderline;
	} else if (formats.underline) {
		direct.underline = true;
	}

	return direct;
}

function getDirectParagraphFormatOverrides(formats = {}) {
	return {
		alignment: Boolean(formats.paragraphAlignment || formats.align),
		bold: parseParagraphBoolean(formats.paragraphBold) !== null || Boolean(formats.bold),
		fontSize: Boolean(formats.paragraphFontSize),
		italic: parseParagraphBoolean(formats.paragraphItalic) !== null || Boolean(formats.italic),
		keepWithNext: parseParagraphBoolean(formats.paragraphKeepWithNext) !== null,
		paddingAfter: Boolean(formats.paragraphPaddingAfter),
		paddingBefore: Boolean(formats.paragraphPaddingBefore),
		start: Boolean(formats.paragraphStart),
		underline: parseParagraphBoolean(formats.paragraphUnderline) !== null || Boolean(formats.underline),
	};
}

function parseParagraphBoolean(value) {
	if (value === true || value === 'true') {
		return true;
	}

	if (value === false || value === 'false') {
		return false;
	}

	return null;
}

function getDocumentParagraphStyles(settings = {}) {
	const styles = Array.isArray(settings.styles) ? settings.styles : [];

	if (!styles.length) {
		return [{ id: 'normal', name: 'Normal', parentStyleId: '', format: {} }];
	}

	return styles;
}

function normalizeParagraphStyleId(value, settings = {}) {
	const normalized = String(value || '')
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9_-]+/g, '-')
		.replace(/^-+|-+$/g, '');
	const styles = getDocumentParagraphStyles(settings);

	if (styles.some((style) => style.id === normalized)) {
		return normalized;
	}

	return styles[0]?.id || 'normal';
}

function resolveParagraphStyleFormat(styleId, settings = {}, visited = new Set()) {
	const styles = getDocumentParagraphStyles(settings);
	const style = styles.find((candidate) => candidate.id === styleId);

	if (!style || visited.has(style.id)) {
		return {};
	}

	visited.add(style.id);

	return {
		...resolveParagraphStyleFormat(style.parentStyleId, settings, visited),
		...(style.format || {}),
	};
}

function getParagraphStyleDeclarations(format = {}) {
	const declarations = [];

	if (format.alignment) {
		declarations.push(`text-align: ${normalizeParagraphAlignment(format.alignment)};`);
	}

	if (format.bold !== undefined) {
		declarations.push(`font-weight: ${format.bold === true ? 700 : 400};`);
	}

	if (format.fontSize !== undefined) {
		declarations.push(`font-size: ${normalizeParagraphFontSize(format.fontSize)}px;`);
	}

	if (format.italic !== undefined) {
		declarations.push(`font-style: ${format.italic === true ? 'italic' : 'normal'};`);
	}

	if (format.keepWithNext === true) {
		declarations.push('break-after: avoid; page-break-after: avoid;');
	}

	if (format.paddingAfter !== undefined) {
		declarations.push(`padding-bottom: ${normalizeParagraphSpacing(format.paddingAfter)}px;`);
	}

	if (format.paddingBefore !== undefined) {
		declarations.push(`padding-top: ${normalizeParagraphSpacing(format.paddingBefore)}px;`);
	}

	if (format.start === 'full-line' || format.start === 'next-page') {
		declarations.push('clear: both;');
	}

	if (format.start === 'next-page') {
		declarations.push('break-before: page; page-break-before: always;');
	}

	if (format.start === 'continuous') {
		declarations.push('clear: none; break-before: auto; page-break-before: auto;');
	}

	if (format.underline !== undefined) {
		declarations.push(`text-decoration-line: ${format.underline === true ? 'underline' : 'none'};`);
	}

	return declarations;
}

function isEmbedSelected(range, index) {
	if (!range || index < 0) {
		return false;
	}

	return range.length > 0 && range.index <= index && index < range.index + range.length;
}

function isNativeSelectionIncludingNode(node) {
	const selection = node.ownerDocument?.getSelection?.();

	if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
		return false;
	}

	for (let index = 0; index < selection.rangeCount; index += 1) {
		const range = selection.getRangeAt(index);

		try {
			if (range.intersectsNode(node)) {
				return true;
			}
		} catch {
			// Ignore transient ranges while the browser is still adjusting drag selection.
		}
	}

	return false;
}

function getNodeType(name) {
	if (typeof Node !== 'undefined') {
		return Node[name];
	}

	return {
		ELEMENT_NODE: 1,
		TEXT_NODE: 3,
	}[name];
}
