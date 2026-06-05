import Quill from 'quill';
import EditorPage from '../EditorPage.jsx';

describe('EditorPage', function() {
	it('renders editor content directly on the continuous sheet', function() {
		const page = new EditorPage({});
		const tree = page.render();
		const surface = tree.props.children[1];
		const splitWorkspace = surface.props.children;
		const documentWorkspace = splitWorkspace.props.children[0];
		const sheet = documentWorkspace.props.children;
		const sheetChildren = sheet.props.children;

		expect(sheetChildren[1].props.className).toContain('mn-document-content');
	});

	it('applies the document typography font size as an editor CSS variable', function() {
		const page = new EditorPage({
			pageView: {
				getState() {
					return {
						documentSettings: {
							typography: {
								fontSize: 12,
							},
							page: {
								size: 'letter',
								orientation: 'portrait',
								margins: {
									top: 72,
									right: 72,
									bottom: 72,
									left: 72,
								},
							},
						},
					};
				},
			},
		});

		expect(page.getDocumentLayoutStyle()['--mn-document-font-size']).toBe('12px');
		expect(page.getDocumentLayoutStyle()['--mn-margin-top']).toBe('72pt');
		expect(page.getDocumentLayoutStyle()['--mn-margin-right']).toBe('72pt');
		expect(page.getDocumentLayoutStyle()['--mn-margin-bottom']).toBe('72pt');
		expect(page.getDocumentLayoutStyle()['--mn-margin-left']).toBe('72pt');
	});

	it('reports the output content guide width instead of widened editor width', function() {
		const page = new EditorPage({});
		const content = document.createElement('div');
		const editor = document.createElement('div');
		const originalGetComputedStyle = window.getComputedStyle.bind(window);

		page.documentContentRef.current = content;
		page.quill = {
			root: editor,
		};
		spyOn(window, 'getComputedStyle').and.callFake((element, pseudoElement) => {
			if (element === content && pseudoElement === '::after') {
				return {
					width: '480px',
				};
			}

			return originalGetComputedStyle(element, pseudoElement);
		});
		editor.getBoundingClientRect = () => ({
			width: 760,
		});

		expect(page.getContentWidth()).toBe(480);
	});

	it('uses document margins in paged preview CSS', function() {
		const page = new EditorPage({
			pageView: {
				getState() {
					return {
						documentSettings: {
							typography: {
								fontSize: 14,
							},
							page: {
								size: 'letter',
								orientation: 'portrait',
								margins: {
									top: 36,
									right: 54,
									bottom: 72,
									left: 90,
								},
							},
						},
					};
				},
			},
		});
		const css = page.getPagedPreviewPageCss();

		expect(css).toContain('margin: 36pt 54pt 72pt 90pt');
		expect(css).toContain('--mn-paged-margin-top: 36pt');
		expect(css).toContain('--mn-paged-margin-right: 54pt');
		expect(css).toContain('--mn-paged-margin-bottom: 72pt');
		expect(css).toContain('--mn-paged-margin-left: 90pt');
		expect(css).toContain('font-size: 14px');
	});

	it('uses landscape document size in paged preview CSS', function() {
		const page = new EditorPage({
			pageView: {
				getState() {
					return {
						documentSettings: {
							page: {
								size: 'letter',
								orientation: 'landscape',
								margins: {
									top: 72,
									right: 72,
									bottom: 72,
									left: 72,
								},
							},
						},
					};
				},
			},
		});
		const css = page.getPagedPreviewPageCss();

		expect(css).toContain('size: 11in 8.5in');
	});

	it('refreshes editor and view-mode layout after document settings change', function() {
		const calls = [];
		const page = new EditorPage({});
		const settings = {
			page: {
				size: 'letter',
				orientation: 'landscape',
				margins: {
					top: 72,
					right: 72,
					bottom: 72,
					left: 72,
				},
			},
		};

		page.setState = (patch, callback) => {
			page.state = {
				...page.state,
				...patch,
			};
			callback?.();
		};
		page.updateToolbarState = () => calls.push('toolbar');
		page.updateEmbedSelectionState = () => calls.push('embed-selection');
		page.updatePagedPreviewHtml = () => calls.push('preview');
		page.updateDocumentOverflowWidth = () => calls.push('overflow');
		page.scheduleWhiteSpaceMarkerUpdate = () => calls.push('white-space');

		page.onDocumentSettingsChanged(settings);

		expect(page.state.documentSettings).toBe(settings);
		expect(calls).toEqual([
			'toolbar',
			'embed-selection',
			'preview',
			'overflow',
			'white-space',
		]);
	});

	it('keeps the editor interaction service wired during toolbar service configuration', function() {
		const editorInteractions = {
			dispatch() {},
			getHandlers() {
				return [];
			},
		};
		const page = new EditorPage({ editorInteractions });

		page.configureToolbarServices();

		expect(page.editorInteractions).toBe(editorInteractions);
	});

	it('collects Quill setup from editor-ready interaction handlers before mounting Quill', function() {
		const registered = [];
		const page = new EditorPage({
			editorInteractions: {
				notifyEditorReady(context) {
					context.registerQuillModule('modules/test-module', function TestModule() {}, true);
					context.addQuillModuleOptions('test-module', {
						enabled: true,
					});
					context.addQuillModuleOptions('test-module', {
						color: 'blue',
					});
				},
			},
		});

		spyOn(console, 'warn');
		spyOn(page.editorInteractionDispatcher, 'applyCursorClass');
		spyOn(Quill, 'register').and.callFake((registration, overwrite) => {
			registered.push({ overwrite, registration });
		});

		expect(page.getEditorReadyQuillModules()).toEqual({
			'test-module': {
				color: 'blue',
				enabled: true,
			},
		});
		expect(registered.length).toBe(1);
		expect(registered[0].overwrite).toBeTrue();
		expect(registered[0].registration['modules/test-module']).toEqual(jasmine.any(Function));
	});

	it('builds paragraph style CSS from document settings', function() {
		const page = new EditorPage({
			pageView: {
				getState() {
					return {
						documentSettings: {
							typography: {
								fontSize: 12,
							},
							styles: [
								{
									id: 'normal',
									name: 'Normal',
									parentStyleId: '',
									format: {},
								},
								{
									id: 'heading',
									name: 'Heading',
									parentStyleId: 'normal',
									format: {
										alignment: 'center',
										bold: true,
										fontSize: 18,
										keepWithNext: true,
										paddingAfter: 10,
										paddingBefore: 6,
									},
								},
							],
							page: {
								size: 'letter',
								orientation: 'portrait',
								margins: {
									top: 72,
									right: 72,
									bottom: 72,
									left: 72,
								},
							},
						},
					};
				},
			},
		});

		const css = page.getDocumentParagraphStyleRules();

		expect(css).toContain('.ql-paragraph-style-heading');
		expect(css).toContain('font-size: 18px');
		expect(css).toContain('font-weight: 700');
		expect(css).toContain('break-after: avoid');
		expect(css).toContain('padding-bottom: 10px');
		expect(css).toContain('padding-top: 6px');
		expect(css).toContain('text-align: center');
	});

	it('resolves paragraph formatting from document defaults, style, and paragraph overrides', function() {
		const page = new EditorPage({
			pageView: {
				getState() {
					return {
						documentSettings: {
							typography: {
								fontSize: 12,
							},
							styles: [
								{
									id: 'normal',
									name: 'Normal',
									parentStyleId: '',
									format: {},
								},
								{
									id: 'heading',
									name: 'Heading',
									parentStyleId: 'normal',
									format: {
										alignment: 'center',
										bold: true,
										fontSize: 18,
									},
								},
							],
						},
					};
				},
			},
		});

		page.quill = {
			getFormat() {
				return {
					paragraphAlignment: 'right',
					paragraphStyle: 'heading',
				};
			},
			getSelection() {
				return { index: 0, length: 0 };
			},
		};

		expect(page.getParagraphFormat()).toEqual({
			alignment: 'right',
			bold: true,
			fontSize: 18,
			italic: false,
				overrides: {
					alignment: true,
					bold: false,
					fontSize: false,
					italic: false,
					keepWithNext: false,
					paddingAfter: false,
					paddingBefore: false,
					start: false,
					underline: false,
				},
			keepWithNext: false,
			paddingAfter: 0,
			paddingBefore: 0,
			start: 'continuous',
			styleId: 'heading',
			underline: false,
		});
	});

	it('reports which paragraph format values are direct overrides', function() {
		const page = new EditorPage({
			pageView: {
				getState() {
					return {
						documentSettings: {
							typography: {
								fontSize: 12,
							},
							styles: [
								{
									id: 'normal',
									name: 'Normal',
									parentStyleId: '',
									format: {},
								},
								{
									id: 'heading',
									name: 'Heading',
									parentStyleId: 'normal',
									format: {
										bold: true,
										fontSize: 18,
									},
								},
							],
						},
					};
				},
			},
		});

		page.quill = {
			getFormat() {
				return {
					paragraphFontSize: '14px',
					paragraphStyle: 'heading',
				};
			},
			getSelection() {
				return { index: 0, length: 0 };
			},
		};

		expect(page.getParagraphFormat().overrides).toEqual({
			alignment: false,
			bold: false,
			fontSize: true,
			italic: false,
			keepWithNext: false,
			paddingAfter: false,
			paddingBefore: false,
			start: false,
			underline: false,
		});
		expect(page.getParagraphFormat().bold).toBeTrue();
		expect(page.getParagraphFormat().fontSize).toBe(14);
	});

	it('can reset direct paragraph format overrides while preserving the selected style', function() {
		const calls = [];
		const page = new EditorPage({
			pageView: {
				getState() {
					return {
						documentSettings: {
							styles: [
								{
									id: 'normal',
									name: 'Normal',
									parentStyleId: '',
									format: {},
								},
								{
									id: 'heading',
									name: 'Heading',
									parentStyleId: 'normal',
									format: {},
								},
							],
						},
					};
				},
			},
		});

		page.quill = {
			formatLine(index, length, name, value, source) {
				calls.push({ index, length, name, source, value });
			},
			getFormat() {
				return {};
			},
			getSelection() {
				return { index: 4, length: 2 };
			},
		};

		page.formatParagraph({
			reset: true,
			styleId: 'heading',
		});

		expect(calls).toEqual([
			{ index: 4, length: 2, name: 'paragraphAlignment', source: 'user', value: false },
			{ index: 4, length: 2, name: 'paragraphFontSize', source: 'user', value: false },
			{ index: 4, length: 2, name: 'paragraphKeepWithNext', source: 'user', value: false },
			{ index: 4, length: 2, name: 'paragraphPaddingAfter', source: 'user', value: false },
			{ index: 4, length: 2, name: 'paragraphPaddingBefore', source: 'user', value: false },
			{ index: 4, length: 2, name: 'paragraphStart', source: 'user', value: false },
			{ index: 4, length: 2, name: 'paragraphBold', source: 'user', value: false },
			{ index: 4, length: 2, name: 'paragraphItalic', source: 'user', value: false },
			{ index: 4, length: 2, name: 'paragraphUnderline', source: 'user', value: false },
			{ index: 4, length: 2, name: 'paragraphStyle', source: 'user', value: 'heading' },
		]);
	});

	it('groups paragraph dialog formatting into one Quill history batch', function() {
		const cutoffs = [];
		const calls = [];
		const page = new EditorPage({
			pageView: {
				getState() {
					return { documentSettings: {} };
				},
			},
		});

		page.quill = {
			formatLine(index, length, name, value, source) {
				calls.push({ index, length, name, source, value });
			},
			getFormat() {
				return {};
			},
			getSelection() {
				return { index: 2, length: 1 };
			},
			history: {
				cutoff() {
					cutoffs.push('cutoff');
				},
			},
		};

		page.formatParagraph({
			alignment: 'center',
			bold: true,
			fontSize: 16,
		});

		expect(cutoffs).toEqual(['cutoff', 'cutoff']);
		expect(calls).toEqual([
			{ index: 2, length: 1, name: 'paragraphAlignment', source: 'user', value: 'center' },
			{ index: 2, length: 1, name: 'paragraphFontSize', source: 'user', value: '16px' },
			{ index: 2, length: 1, name: 'paragraphBold', source: 'user', value: 'true' },
		]);
	});

	it('undoes Quill history before falling back to document formatting history', function() {
		const calls = [];
		const documentFormat = {
			canRedo() {
				return true;
			},
			canUndo() {
				return true;
			},
			redo() {
				calls.push('document-redo');
			},
			undo() {
				calls.push('document-undo');
			},
		};
		const page = new EditorPage({ documentFormat });

		page.documentFormat = documentFormat;
		page.quill = {
			history: {
				stack: {
					redo: [],
					undo: ['quill-change'],
				},
				redo() {
					calls.push('quill-redo');
				},
				undo() {
					calls.push('quill-undo');
				},
			},
		};
		page.updateToolbarState = function() {
			calls.push('toolbar');
		};
		page.updatePagedPreviewHtml = function() {
			calls.push('preview');
		};

		expect(page.undo()).toBeTrue();

		page.quill.history.stack.undo = [];
		page.quill.history.stack.redo = ['quill-change'];

		expect(page.redo()).toBeTrue();

		page.quill.history.stack.redo = [];

		expect(page.undo()).toBeTrue();
		expect(page.redo()).toBeTrue();
		expect(calls).toEqual([
			'quill-undo',
			'toolbar',
			'preview',
			'quill-redo',
			'toolbar',
			'preview',
			'document-undo',
			'toolbar',
			'preview',
			'document-redo',
			'toolbar',
			'preview',
		]);
	});

	it('clears Quill undo history after loading document content', function() {
		const calls = [];
		const content = { ops: [{ insert: 'Loaded\n' }] };
		const documentModel = {
			getActiveTabId() {
				return 'tab-1';
			},
			getEditorContent(tabId) {
				calls.push({ method: 'getEditorContent', tabId });
				return content;
			},
		};
		const page = new EditorPage({ documentModel });

		page.documentModel = documentModel;
		page.quill = {
			history: {
				clear() {
					calls.push({ method: 'history.clear' });
				},
			},
			setContents(nextContent, source) {
				calls.push({ content: nextContent, method: 'setContents', source });
			},
			setSelection(index, length, source) {
				calls.push({ index, length, method: 'setSelection', source });
			},
		};
		page.updateToolbarState = function() {
			calls.push({ method: 'toolbar' });
		};
		page.updateEmbedSelectionState = function() {
			calls.push({ method: 'embed-selection' });
		};
		page.updatePagedPreviewHtml = function() {
			calls.push({ method: 'preview' });
		};
		page.updateDocumentOverflowWidth = function() {
			calls.push({ method: 'overflow' });
		};
		page.scheduleWhiteSpaceMarkerUpdate = function() {
			calls.push({ method: 'white-space' });
		};

		page.loadActiveTabContent();

		expect(calls).toEqual([
			{ method: 'getEditorContent', tabId: 'tab-1' },
			{ content, method: 'setContents', source: 'silent' },
			{ index: 0, length: 0, method: 'setSelection', source: 'silent' },
			{ method: 'history.clear' },
			{ method: 'toolbar' },
			{ method: 'embed-selection' },
			{ method: 'preview' },
			{ method: 'overflow' },
			{ method: 'white-space' },
		]);
	});

	it('falls back to emptying Quill history stacks after loading document content', function() {
		const page = new EditorPage({});

		page.quill = {
			history: {
				stack: {
					redo: ['redo-change'],
					undo: ['undo-change'],
				},
			},
		};

		page.clearEditorHistoryAfterContentLoad();

		expect(page.quill.history.stack).toEqual({
			redo: [],
			undo: [],
		});
	});

	it('inserts a manual page break by marking the following paragraph', function() {
		const calls = [];
		const page = new EditorPage({});

		page.quill = {
			deleteText(index, length, source) {
				calls.push({ index, length, method: 'deleteText', source });
			},
			formatLine(index, length, name, value, source) {
				calls.push({ index, length, method: 'formatLine', name, source, value });
			},
			getSelection() {
				return { index: 4, length: 2 };
			},
			insertText(index, text, source) {
				calls.push({ index, method: 'insertText', source, text });
			},
			setSelection(index, length, source) {
				calls.push({ index, length, method: 'setSelection', source });
			},
		};
		page.updateToolbarState = function() {
			calls.push({ method: 'updateToolbarState' });
		};
		page.updatePagedPreviewHtml = function() {
			calls.push({ method: 'updatePagedPreviewHtml' });
		};

		expect(page.insertPageBreak()).toBeTrue();
		expect(calls).toEqual([
			{ index: 4, length: 2, method: 'deleteText', source: 'user' },
			{ index: 4, method: 'insertText', source: 'user', text: '\n' },
			{ index: 5, length: 1, method: 'formatLine', name: 'paragraphStart', source: 'user', value: 'next-page' },
			{ index: 5, length: 0, method: 'setSelection', source: 'silent' },
			{ method: 'updateToolbarState' },
			{ method: 'updatePagedPreviewHtml' },
		]);
	});

	it('resolves a left-gutter click to a full visual line range', function() {
		const page = new EditorPage({});

		page.quill = {
			root: {
				getBoundingClientRect() {
					return {
						bottom: 220,
						height: 200,
						left: 100,
						right: 500,
						top: 20,
						width: 400,
					};
				},
			},
		};
		page.getQuillRangeFromPoint = (x) => (
			x < 250
				? { index: 5, length: 0 }
				: { index: 16, length: 0 }
		);

		expect(page.getLineSelectionRangeFromPoint(60)).toEqual({
			index: 5,
			length: 11,
		});
	});

	it('falls back to the logical line when a gutter click resolves to one caret point', function() {
		const page = new EditorPage({});
		const line = {
			length() {
				return 4;
			},
		};

		page.quill = {
			getIndex(value) {
				return value === line ? 8 : 0;
			},
			getLine() {
				return [line, 0];
			},
			root: {
				getBoundingClientRect() {
					return {
						bottom: 220,
						height: 200,
						left: 100,
						right: 500,
						top: 20,
						width: 400,
					};
				},
			},
		};
		page.getQuillRangeFromPoint = () => ({ index: 9, length: 0 });

		expect(page.getLineSelectionRangeFromPoint(60)).toEqual({
			index: 8,
			length: 4,
		});
	});

	it('uses rendered visual rows before paragraph fallback for gutter selection', function() {
		const page = new EditorPage({});
		const line = {
			length() {
				return 80;
			},
		};

		page.quill = {
			getIndex(value) {
				return value === line ? 8 : 0;
			},
			getLine() {
				return [line, 0];
			},
			root: {
				getBoundingClientRect() {
					return {
						bottom: 220,
						height: 200,
						left: 100,
						right: 500,
						top: 20,
						width: 400,
					};
				},
			},
		};
		page.getRenderedLineSelectionRangeFromPoint = () => ({
			index: 22,
			length: 14,
		});
		page.getQuillRangeFromPoint = () => ({ index: 9, length: 0 });

		expect(page.getLineSelectionRangeFromPoint(60)).toEqual({
			index: 22,
			length: 14,
		});
	});

	it('chooses the rendered text row nearest the gutter click', function() {
		const page = new EditorPage({});

		expect(page.getClosestRenderedTextLine([
			{ bottom: 30, center: 20, end: 6, index: 2, top: 10 },
			{ bottom: 31, center: 21, end: 12, index: 6, top: 11 },
			{ bottom: 58, center: 48, end: 24, index: 16, top: 38 },
			{ bottom: 59, center: 49, end: 32, index: 24, top: 39 },
		], 45)).toEqual({
			bottom: 59,
			center: 48.5,
			end: 32,
			index: 16,
			top: 38,
		});
	});

	it('extends left-gutter line selection by full line ranges while dragging', function() {
		const calls = [];
		const listeners = {};
		const page = new EditorPage({});
		const ownerDocument = {
			addEventListener(eventName, listener) {
				listeners[eventName] = listener;
				calls.push({ eventName, method: 'addEventListener' });
			},
			removeEventListener(eventName) {
				delete listeners[eventName];
				calls.push({ eventName, method: 'removeEventListener' });
			},
		};

		page.quill = {
			setSelection(index, length, source) {
				calls.push({ index, length, method: 'setSelection', source });
			},
		};
		page.getLineSelectionRangeFromPoint = (clientY) => (
			clientY < 60
				? { index: 10, length: 4 }
				: { index: 30, length: 5 }
		);
		page.updateToolbarState = () => calls.push({ method: 'updateToolbarState' });
		page.updateEmbedSelectionState = () => calls.push({ method: 'updateEmbedSelectionState' });

		page.handleLineSelectionPointerDown({
			clientY: 40,
			currentTarget: { ownerDocument },
			preventDefault() {
				calls.push({ method: 'preventDefault' });
			},
			stopPropagation() {
				calls.push({ method: 'stopPropagation' });
			},
		});
		listeners.pointermove({
			clientY: 80,
			preventDefault() {
				calls.push({ method: 'movePreventDefault' });
			},
		});
		listeners.pointerup();

		expect(calls).toEqual([
			{ method: 'preventDefault' },
			{ method: 'stopPropagation' },
			{ index: 10, length: 4, method: 'setSelection', source: 'user' },
			{ method: 'updateToolbarState' },
			{ method: 'updateEmbedSelectionState' },
			{ eventName: 'pointermove', method: 'addEventListener' },
			{ eventName: 'pointerup', method: 'addEventListener' },
			{ eventName: 'pointercancel', method: 'addEventListener' },
			{ method: 'movePreventDefault' },
			{ index: 10, length: 25, method: 'setSelection', source: 'user' },
			{ method: 'updateToolbarState' },
			{ method: 'updateEmbedSelectionState' },
			{ eventName: 'pointermove', method: 'removeEventListener' },
			{ eventName: 'pointerup', method: 'removeEventListener' },
			{ eventName: 'pointercancel', method: 'removeEventListener' },
		]);
	});

	it('routes gutter selection through a generic source element owner', function() {
		const calls = [];
		const listeners = {};
		const page = new EditorPage({});
		const ownerDocument = {
			addEventListener(eventName, listener) {
				listeners[eventName] = listener;
			},
			removeEventListener(eventName) {
				delete listeners[eventName];
			},
		};
		const section = document.createElement('section');

		section.className = 'owned-region';
		section.getBoundingClientRect = () => ({
			bottom: 60,
			height: 40,
			left: 120,
			right: 320,
			top: 20,
			width: 200,
		});
		document.body.appendChild(section);
		page.quill = {
			setSelection(index, length, source) {
				calls.push({ index, length, method: 'setSelection', source });
			},
		};
		page.getLineSelectionRangeFromPoint = () => ({
			index: 12,
			length: 7,
			sourceElement: section,
		});
		page.editorInteractions = {
			dispatch(eventName, _event, context) {
				calls.push({
					eventName,
					sourceElement: context.lineHit?.sourceElement,
					targetElement: context.target?.element,
					targetServiceName: context.targetServiceName,
				});
				return { handled: true };
			},
			getHandlers(eventName = '') {
				return eventName && eventName !== 'gutter-line-select-start'
					? []
					: [{
						events: ['gutter-line-select-start'],
						gutterSelectable: true,
						id: 'owned-region',
						selector: '.owned-region',
						serviceName: 'owned-region-controller',
					}];
			},
		};

		page.handleLineSelectionPointerDown({
			clientX: 80,
			clientY: 40,
			currentTarget: { ownerDocument },
			preventDefault() {},
			stopPropagation() {},
		});
		section.remove();

		expect(calls).toEqual([{
			eventName: 'gutter-line-select-start',
			sourceElement: section,
			targetElement: section,
			targetServiceName: 'owned-region-controller',
		}]);
		expect(listeners.pointermove).toEqual(jasmine.any(Function));
	});

	it('starts gutter selection from the editor surface left margin', function() {
		const calls = [];
		const page = new EditorPage({});

		page.documentContentRef.current = {
			getBoundingClientRect: () => ({
				bottom: 240,
				left: 100,
				top: 20,
			}),
		};
		page.handleLineSelectionPointerDown = (event) => {
			calls.push({ clientX: event.clientX, clientY: event.clientY });
		};

		page.handleEditorSurfacePointerDownCapture({
			clientX: 72,
			clientY: 80,
		});
		page.handleEditorSurfacePointerDownCapture({
			clientX: 40,
			clientY: 80,
		});
		page.handleEditorSurfacePointerDownCapture({
			clientX: 108,
			clientY: 80,
		});

		expect(calls).toEqual([
			{ clientX: 72, clientY: 80 },
		]);
	});

	it('shows the line-selection cursor across the full gutter hit area', function() {
		const page = new EditorPage({});
		const surface = document.createElement('div');

		page.editorSurfaceRef.current = surface;
		page.documentContentRef.current = {
			getBoundingClientRect: () => ({
				bottom: 240,
				left: 100,
				top: 20,
			}),
		};

		page.handleEditorSurfacePointerMoveCapture({
			clientX: 72,
			clientY: 80,
		});
		expect(surface.classList.contains('mn-line-selection-gutter-cursor')).toBeTrue();

		page.handleEditorSurfacePointerMoveCapture({
			clientX: 40,
			clientY: 80,
		});
		expect(surface.classList.contains('mn-line-selection-gutter-cursor')).toBeFalse();

		page.handleEditorSurfacePointerMoveCapture({
			clientX: 72,
			clientY: 80,
		});
		page.handleEditorSurfacePointerLeave();
		expect(surface.classList.contains('mn-line-selection-gutter-cursor')).toBeFalse();
	});

	it('dispatches editor context menu events through editor interactions', function() {
		const page = new EditorPage({});
		const calls = [];
		const event = { type: 'contextmenu' };

		page.quill = {
			root: document.createElement('div'),
		};
		page.editorInteractions = {
			dispatch(eventName, dispatchedEvent, context) {
				calls.push({
					eventName,
					dispatchedEvent,
					hasFindBlot: typeof context.findBlot === 'function',
					hasEditorRoot: Boolean(context.editorRoot),
					hasGetSelection: typeof context.getSelection === 'function',
				});
				return { handled: true };
			},
		};

		expect(page.dispatchEditorInteraction('contextmenu', event)).toEqual({
			handled: true,
			target: null,
		});
		expect(calls).toEqual([{
			eventName: 'contextmenu',
			dispatchedEvent: event,
			hasFindBlot: true,
			hasEditorRoot: true,
			hasGetSelection: true,
		}]);
	});

	it('broadcasts editor selection changes even when no feature target is resolved', function() {
		const page = new EditorPage({});
		const calls = [];
		const editorRoot = document.createElement('div');
		const paragraph = document.createElement('p');

		editorRoot.appendChild(paragraph);
		page.quill = {
			getLeaf: () => [],
			getLine: () => [{ domNode: paragraph }],
			getSelection: () => ({ index: 3, length: 0 }),
			root: editorRoot,
		};
		page.editorInteractions = {
			dispatch(eventName, dispatchedEvent, context) {
				calls.push({
					eventName,
					dispatchedEvent,
					range: context.range,
					target: context.target,
					targetServiceName: context.targetServiceName,
				});
				return { handled: false };
			},
			getHandlers(eventName = '') {
				return eventName && eventName !== 'selection-change'
					? []
					: [{
						events: ['selection-change'],
						id: 'table.editor-region',
						selector: 'table',
						serviceName: 'table-controller',
					}];
			},
		};

		expect(page.dispatchEditorInteraction('selection-change', null, {
			range: { index: 3, length: 0 },
		})).toEqual({
			handled: false,
			target: null,
		});
		expect(calls).toEqual([{
			eventName: 'selection-change',
			dispatchedEvent: null,
			range: { index: 3, length: 0 },
			target: null,
			targetServiceName: '',
		}]);
	});

	it('dispatches editor keyboard events through editor interactions', function() {
		const calls = [];
		const page = new EditorPage({});
		const event = { key: 'F10' };

		page.editorInteractions = {
			dispatch(eventName, dispatchedEvent) {
				calls.push({ eventName, dispatchedEvent });
				return { handled: false };
			},
		};

		page.handleEditorKeyDown(event);
		expect(calls).toEqual([{ eventName: 'keydown', dispatchedEvent: event }]);
	});

	it('dispatches leading editor keyboard bindings through editor interactions', function() {
		const calls = [];
		const page = new EditorPage({});

		page.editorInteractions = {
			dispatch(eventName, dispatchedEvent, context) {
				calls.push({
					allowUnresolvedTarget: context.allowUnresolvedTarget,
					eventName,
					key: dispatchedEvent.key,
					mnLeadingKeyboardBinding: dispatchedEvent.mnLeadingKeyboardBinding,
					shiftKey: dispatchedEvent.shiftKey,
					target: context.target,
				});
				return { handled: true };
			},
			getHandlers(eventName = '') {
				return eventName && eventName !== 'keydown'
					? []
					: [{
						events: ['keydown'],
						id: 'table.editor-region',
						selector: 'table',
						serviceName: 'table-controller',
					}];
			},
		};

		expect(page.dispatchEditorKeyboardBinding({ key: 'Tab', shiftKey: true })).toBeFalse();
		expect(calls).toEqual([
			{
				allowUnresolvedTarget: true,
				eventName: 'keydown',
				key: 'Tab',
				mnLeadingKeyboardBinding: true,
				shiftKey: true,
				target: null,
			},
		]);
	});

	it('dispatches native editor mouse down capture events through editor interactions', function() {
		const calls = [];
		const page = new EditorPage({});
		const event = {
			button: 0,
			stopImmediatePropagation() {
				calls.push({ method: 'stopImmediatePropagation' });
			},
			stopPropagation() {
				calls.push({ method: 'stopPropagation' });
			},
		};

		page.editorInteractions = {
			dispatch(eventName, dispatchedEvent) {
				calls.push({ eventName, dispatchedEvent });
				return { result: { handled: true, stopPropagation: true } };
			},
		};

		page.handleNativeEditorMouseDownCapture(event);
		expect(calls).toEqual([
			{ eventName: 'mousedown-capture', dispatchedEvent: event },
			{ method: 'stopPropagation' },
			{ method: 'stopImmediatePropagation' },
		]);
	});

	it('marks native selection suppression without stopping native mousedown', function() {
		const calls = [];
		const page = new EditorPage({});
		const event = { button: 0 };

		page.editorInteractions = {
			dispatch(eventName, dispatchedEvent) {
				calls.push({ eventName, dispatchedEvent });
				return {
					handled: true,
					result: {
						suppressNativeSelection: true,
					},
				};
			},
		};

		page.handleNativeEditorMouseDownCapture(event);

		expect(event.mnSuppressNativeSelection).toBeTrue();
		expect(calls).toEqual([
			{ eventName: 'mousedown-capture', dispatchedEvent: event },
		]);
	});

	it('resolves editor interaction targets from text-node event targets', function() {
		const page = new EditorPage({});
		const table = document.createElement('table');
		const cell = document.createElement('td');
		const paragraph = document.createElement('p');
		const text = document.createTextNode('A');
		const calls = [];

		paragraph.appendChild(text);
		cell.appendChild(paragraph);
		table.appendChild(cell);
		page.quill = {
			root: table,
		};
		page.editorInteractions = {
			dispatch(eventName, dispatchedEvent, context) {
				calls.push({
					element: context.target.element,
					eventName,
					serviceName: context.targetServiceName,
				});
				return { handled: true };
			},
			getHandlers(eventName = '') {
				return eventName && eventName !== 'mousedown-capture'
					? []
					: [{
						events: ['mousedown-capture'],
						id: 'table.editor-region',
						selector: 'table',
						serviceName: 'table-controller',
					}];
			},
		};

		expect(page.dispatchEditorInteraction('mousedown-capture', {
			target: text,
			type: 'mousedown',
		})).toEqual({
			handled: true,
			target: jasmine.objectContaining({
				element: table,
				serviceName: 'table-controller',
			}),
		});
		expect(calls).toEqual([{
			element: table,
			eventName: 'mousedown-capture',
			serviceName: 'table-controller',
		}]);
	});

	it('resolves point-selectable interaction targets from editor coordinates', function() {
		const page = new EditorPage({});
		const editorRoot = document.createElement('div');
		const table = document.createElement('table');
		const calls = [];

		editorRoot.appendChild(table);
		table.getBoundingClientRect = () => ({
			bottom: 110,
			height: 100,
			left: 20,
			right: 220,
			top: 10,
			width: 200,
		});
		page.quill = {
			root: editorRoot,
		};
		page.editorInteractions = {
			dispatch(eventName, dispatchedEvent, context) {
				calls.push({
					element: context.target.element,
					eventName,
					point: context.point,
					serviceName: context.targetServiceName,
				});
				return { handled: true };
			},
			getHandlers(eventName = '') {
				return eventName && eventName !== 'pointermove'
					? []
					: [{
						events: ['pointermove'],
						id: 'table.editor-region',
						pointHitMargin: { top: 10 },
						pointSelectable: true,
						selector: 'table',
						serviceName: 'table-controller',
					}];
			},
		};

		expect(page.dispatchEditorInteraction('pointermove', {
			clientX: 160,
			clientY: 5,
			target: editorRoot,
			type: 'pointermove',
		})).toEqual({
			handled: true,
			target: jasmine.objectContaining({
				element: table,
				serviceName: 'table-controller',
			}),
		});
		expect(calls).toEqual([{
			element: table,
			eventName: 'pointermove',
			point: { clientX: 160, clientY: 5 },
			serviceName: 'table-controller',
		}]);
	});

	it('applies interaction cursor classes to the Quill container', function() {
		const page = new EditorPage({});
		const editorContainer = document.createElement('div');
		const editorRoot = document.createElement('div');

		editorContainer.appendChild(editorRoot);
		page.editorRef.current = editorContainer;
		page.quill = {
			root: editorRoot,
		};
		page.editorInteractions = {
			dispatch() {
				return {
					handled: true,
					result: {
						cursorClass: 'mn-table-column-selection-cursor',
					},
				};
			},
		};

		page.dispatchEditorInteraction('pointermove', {
			clientX: 1,
			clientY: 1,
			target: editorRoot,
		});

		expect(editorContainer.classList.contains('mn-table-column-selection-cursor')).toBeTrue();
		expect(editorRoot.classList.contains('mn-table-column-selection-cursor')).toBeFalse();
	});

	it('exposes generic Quill helpers to feature-owned editor views', function() {
		const page = new EditorPage({});
		const editorRoot = document.createElement('div');
		const blot = { id: 'blot' };
		const module = { id: 'module' };
		const calls = [];

		page.quill = {
			getIndex(candidate) {
				calls.push({ candidate, method: 'getIndex' });
				return 5;
			},
			getLeaf(index) {
				calls.push({ index, method: 'getLeaf' });
				return [{ id: 'leaf' }];
			},
			getLine(index) {
				calls.push({ index, method: 'getLine' });
				return [{ id: 'line' }];
			},
			getModule(name) {
				calls.push({ method: 'getModule', name });
				return module;
			},
			getSelection(focus) {
				calls.push({ focus, method: 'getSelection' });
				return { index: 3, length: 0 };
			},
			root: editorRoot,
			setSelection(index, length, source) {
				calls.push({ index, length, method: 'setSelection', source });
			},
		};

		const context = page.getEditorViewContext();

		expect(context.editorRoot).toBe(editorRoot);
		expect(context.getIndex(blot)).toBe(5);
		expect(context.getLeaf(6)).toEqual([{ id: 'leaf' }]);
		expect(context.getLine(7)).toEqual([{ id: 'line' }]);
		expect(context.getModule('sample')).toBe(module);
		expect(context.getSelection(true)).toEqual({ index: 3, length: 0 });
		context.setSelection(8, 1, 'user');
		context.setSelectionWithoutScroll(9, 0, 'user', editorRoot);
		expect(context.getTableModule).toBeUndefined();
		expect(context.getTableSelectionModule).toBeUndefined();
		expect(context.getCurrentTableCellInner).toBeUndefined();
		expect(context.selectTableCell).toBeUndefined();
		expect(calls).toEqual([
			{ candidate: blot, method: 'getIndex' },
			{ index: 6, method: 'getLeaf' },
			{ index: 7, method: 'getLine' },
			{ method: 'getModule', name: 'sample' },
			{ focus: true, method: 'getSelection' },
			{ index: 8, length: 1, method: 'setSelection', source: 'user' },
			{ index: 9, length: 0, method: 'setSelection', source: 'user' },
		]);
	});

	it('preserves scroll positions while forcing a table-cell Quill selection', function(done) {
		const page = new EditorPage({});
		const scrollContainer = {
			clientHeight: 100,
			clientWidth: 100,
			closest: () => null,
			ownerDocument: document,
			parentElement: null,
			scrollHeight: 500,
			scrollLeft: 11,
			scrollTop: 22,
			scrollWidth: 500,
		};
		const calls = [];

		page.quill = {
			focus(options) {
				calls.push({ method: 'focus', options });
				scrollContainer.scrollLeft = 111;
				scrollContainer.scrollTop = 222;
			},
			root: scrollContainer,
			setSelection(index, length, source) {
				calls.push({ index, length, method: 'setSelection', source });
				scrollContainer.scrollLeft = 333;
				scrollContainer.scrollTop = 444;
			},
		};

		page.setQuillSelectionWithoutScroll(5, 0, 'user', scrollContainer);

		expect(scrollContainer.scrollLeft).toBe(11);
		expect(scrollContainer.scrollTop).toBe(22);
		expect(calls).toEqual([
			{ method: 'focus', options: { preventScroll: true } },
			{ index: 5, length: 0, method: 'setSelection', source: 'user' },
		]);

		scrollContainer.scrollLeft = 333;
		scrollContainer.scrollTop = 444;

		window.setTimeout(() => {
			expect(scrollContainer.scrollLeft).toBe(11);
			expect(scrollContainer.scrollTop).toBe(22);
			done();
		}, 5);
	});

	it('attaches native editor mouse down interactions in capture mode', function() {
		const calls = [];
		const page = new EditorPage({});
		const root = {
			addEventListener(eventName, listener, capture) {
				calls.push({ capture, eventName, listener, method: 'addEventListener' });
			},
			removeEventListener(eventName, listener, capture) {
				calls.push({ capture, eventName, listener, method: 'removeEventListener' });
			},
		};

		page.quill = { root };
		page.attachNativeEditorInteractionListeners();
		page.attachNativeEditorInteractionListeners();
		page.detachNativeEditorInteractionListeners();

		expect(calls).toEqual([
			{
				capture: true,
				eventName: 'mousedown',
				listener: page.handleNativeEditorMouseDownCapture,
				method: 'addEventListener',
			},
			{
				capture: true,
				eventName: 'mousedown',
				listener: page.handleNativeEditorMouseDownCapture,
				method: 'removeEventListener',
			},
		]);
	});

	it('records contributed overflow width without changing text wrapping width', function() {
		const page = new EditorPage({});
		const content = document.createElement('div');
		const editor = document.createElement('div');

		content.style.width = '400px';
		page.documentContentRef.current = content;
		page.quill = {
			root: editor,
		};
		page.editorLayout = {
			getWideContentWidth(context) {
				expect(context.baseWidth).toBe(400);
				expect(context.content).toBe(content);
				expect(context.editorRoot).toBe(editor);
				return 624;
			},
		};
		content.getBoundingClientRect = () => ({
			left: 10,
		});
		editor.getBoundingClientRect = () => ({
			width: 400,
		});

		page.updateDocumentOverflowWidth();

		expect(content.style.getPropertyValue('--mn-editor-overflow-width')).toBe('624px');
	});

	it('removes the contributed overflow width when wide content fits inside the page width', function() {
		const page = new EditorPage({});
		const content = document.createElement('div');
		const editor = document.createElement('div');

		content.style.setProperty('--mn-editor-overflow-width', '620px');
		page.documentContentRef.current = content;
		page.quill = {
			root: editor,
		};
		page.editorLayout = {
			getWideContentWidth() {
				return 400;
			},
		};
		content.getBoundingClientRect = () => ({
			left: 10,
		});
		editor.getBoundingClientRect = () => ({
			width: 400,
		});

		page.updateDocumentOverflowWidth();

		expect(content.style.getPropertyValue('--mn-editor-overflow-width')).toBe('');
	});

	it('renders white-space markers in an overlay without changing editor content', function() {
		const host = document.createElement('div');
		const editor = document.createElement('div');
		const paragraph = document.createElement('p');
		const emptyParagraph = document.createElement('p');
		const overlay = document.createElement('div');
		const page = new EditorPage({});

		host.style.position = 'relative';
		host.style.width = '480px';
		host.style.fontSize = '16px';
		editor.className = 'ql-editor';
		overlay.className = 'mn-white-space-overlay';
		paragraph.textContent = 'A B';
		emptyParagraph.innerHTML = '<br>';
		editor.appendChild(paragraph);
		editor.appendChild(emptyParagraph);
		host.appendChild(editor);
		host.appendChild(overlay);
		document.body.appendChild(host);

		page.quill = { root: editor };
		page.whiteSpaceOverlayRef.current = overlay;
		page.state = { seeWhiteSpace: true };

		const before = editor.innerHTML;

		try {
			page.updateWhiteSpaceMarkers();

			const paragraphMarkers = Array.from(overlay.querySelectorAll('.mn-white-space-marker--paragraph'));
			const emptyParagraphMarker = paragraphMarkers[paragraphMarkers.length - 1];

			expect(editor.innerHTML).toBe(before);
			expect(overlay.querySelector('.mn-white-space-marker--space')).toBeTruthy();
			expect(overlay.querySelector('.mn-white-space-marker--paragraph')).toBeTruthy();
			expect(parseFloat(emptyParagraphMarker.style.left)).toBeLessThan(24);
		} finally {
			host.remove();
		}
	});

});
