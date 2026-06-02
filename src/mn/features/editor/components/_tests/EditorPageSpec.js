import EditorPage from '../EditorPage.jsx';

describe('EditorPage', function() {
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

	it('prefers table row ranges for left-gutter selection', function() {
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

		page.quill = {
			setSelection(index, length, source) {
				calls.push({ index, length, method: 'setSelection', source });
			},
		};
		page.getTableRowSelectionRangeFromPoint = () => ({ index: 18, length: 7 });
		page.getLineSelectionRangeFromPoint = () => {
			throw new Error('line selection should not resolve when a table row is hit');
		};
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

		expect(calls).toEqual([
			{ method: 'preventDefault' },
			{ method: 'stopPropagation' },
			{ index: 18, length: 7, method: 'setSelection', source: 'user' },
			{ method: 'updateToolbarState' },
			{ method: 'updateEmbedSelectionState' },
		]);
		expect(listeners.pointermove).toBeTruthy();
	});

	it('resolves table row selection from rendered row bounds', function() {
		const page = new EditorPage({});
		const editor = document.createElement('div');
		const table = document.createElement('table');
		const firstRow = document.createElement('tr');
		const secondRow = document.createElement('tr');

		table.className = 'ql-table';
		table.appendChild(firstRow);
		table.appendChild(secondRow);
		editor.appendChild(table);
		firstRow.getBoundingClientRect = () => ({
			bottom: 24,
			height: 24,
			top: 0,
		});
		secondRow.getBoundingClientRect = () => ({
			bottom: 48,
			height: 24,
			top: 24,
		});
		page.quill = { root: editor };
		page.getTableRowSelectionRange = (row) => (
			row === secondRow
				? { index: 30, length: 12 }
				: { index: 10, length: 8 }
		);

		expect(page.getTableRowSelectionRangeFromPoint(36)).toEqual({
			index: 30,
			length: 12,
		});
	});

	it('uses TableUp selected cells for left-gutter table row selection', function() {
		const calls = [];
		const page = new EditorPage({});
		const table = document.createElement('table');
		const firstCell = { id: 'first-cell' };
		const secondCell = { id: 'second-cell' };
		const tableSelection = {
			show() {
				calls.push({ method: 'show' });
			},
			setSelectedTds(cells) {
				calls.push({ cells, method: 'setSelectedTds' });
			},
			setSelectionTable(selectedTable) {
				calls.push({ method: 'setSelectionTable', selectedTable });
			},
		};

		page.quill = {
			setSelection(index, source) {
				calls.push({ index, method: 'setSelection', source });
			},
		};
		page.getTableSelectionModule = () => tableSelection;
		page.getTableCellsBetweenRanges = () => [firstCell, secondCell];
		page.getTableSelectionBoundary = () => ({
			height: 24,
			width: 120,
			x: 5,
			y: 10,
		});
		page.updateToolbarState = () => calls.push({ method: 'updateToolbarState' });
		page.updateEmbedSelectionState = () => calls.push({ method: 'updateEmbedSelectionState' });

		page.selectLineSelectionRanges(
			{ index: 10, length: 4, table },
			{ index: 20, length: 4, table },
		);

		expect(calls).toEqual([
			{ method: 'setSelectionTable', selectedTable: table },
			{ cells: [firstCell, secondCell], method: 'setSelectedTds' },
			{ method: 'show' },
			{ index: null, method: 'setSelection', source: 'api' },
			{ method: 'updateToolbarState' },
			{ method: 'updateEmbedSelectionState' },
		]);
		expect(tableSelection.boundary).toEqual({
			height: 24,
			width: 120,
			x: 5,
			y: 10,
		});
	});

	it('resolves table column selection from the top table band', function() {
		const page = new EditorPage({});
		const editor = document.createElement('div');
		const table = document.createElement('table');
		const row = document.createElement('tr');
		const firstCell = document.createElement('div');
		const secondCell = document.createElement('div');

		table.className = 'ql-table';
		firstCell.className = 'ql-table-cell-inner';
		secondCell.className = 'ql-table-cell-inner';
		row.appendChild(firstCell);
		row.appendChild(secondCell);
		table.appendChild(row);
		editor.appendChild(table);
		table.getBoundingClientRect = () => ({
			bottom: 120,
			height: 100,
			left: 20,
			right: 220,
			top: 20,
			width: 200,
		});
		firstCell.getBoundingClientRect = () => ({
			height: 40,
			left: 20,
			right: 120,
			top: 20,
			width: 100,
		});
		secondCell.getBoundingClientRect = () => ({
			height: 40,
			left: 120,
			right: 220,
			top: 20,
			width: 100,
		});
		page.quill = { root: editor };
		page.getTableColumnSelectionRange = (cell) => (
			cell === secondCell
				? { cells: ['second-column'], index: 10, length: 4, table }
				: null
		);

		expect(page.getTableColumnSelectionRangeFromPoint(160, 24)).toEqual({
			cells: ['second-column'],
			index: 10,
			length: 4,
			table,
		});
		expect(page.getTableColumnSelectionRangeFromPoint(160, 44)).toBeNull();
	});

	it('uses exact column cells for table column selection', function() {
		const firstColumnCell = { id: 'first-column-cell' };
		const secondColumnCell = { id: 'second-column-cell' };
		const rowRangeCell = { id: 'row-range-cell' };
		const page = new EditorPage({});
		const table = document.createElement('table');

		page.getTableCellsBetweenRanges = () => [rowRangeCell];

		expect(page.getTableSelectionCells(
			table,
			{ cells: [firstColumnCell], index: 1, length: 8 },
			{ cells: [secondColumnCell], index: 20, length: 8 },
		)).toEqual([firstColumnCell, secondColumnCell]);
	});

	it('uses cells between visual column indexes for dragged column selection', function() {
		const page = new EditorPage({});
		const table = document.createElement('table');
		const firstRow = document.createElement('tr');
		const secondRow = document.createElement('tr');
		const cells = Array.from({ length: 6 }, (_, index) => {
			const cell = document.createElement('div');

			cell.className = 'ql-table-cell-inner';
			cell.dataset.testId = `cell-${index}`;
			return cell;
		});

		firstRow.appendChild(cells[0]);
		firstRow.appendChild(cells[1]);
		firstRow.appendChild(cells[2]);
		secondRow.appendChild(cells[3]);
		secondRow.appendChild(cells[4]);
		secondRow.appendChild(cells[5]);
		table.appendChild(firstRow);
		table.appendChild(secondRow);
		page.getTableCellSelectionRange = (cell) => ({
			blot: cell.dataset.testId,
			index: 1,
			length: 1,
		});

		expect(page.getTableSelectionCells(
			table,
			{ columnIndex: 0, index: 1, length: 1 },
			{ columnIndex: 1, index: 4, length: 1 },
		)).toEqual(['cell-0', 'cell-1', 'cell-3', 'cell-4']);
	});

	it('extends table column selection while dragging', function() {
		const calls = [];
		const listeners = {};
		const page = new EditorPage({});
		const table = document.createElement('table');
		const ownerDocument = {
			addEventListener(eventName, listener) {
				listeners[eventName] = listener;
			},
			removeEventListener(eventName) {
				delete listeners[eventName];
			},
		};
		const anchorRange = { columnIndex: 0, index: 1, length: 1, table };
		const focusRange = { columnIndex: 2, index: 8, length: 1, table };

		page.quill = {};
		page.getTableColumnSelectionRangeFromPoint = (clientX) => (
			clientX < 100 ? anchorRange : focusRange
		);
		page.selectTableSelectionRanges = (anchor, focus) => {
			calls.push({ anchor, focus, method: 'selectTableSelectionRanges' });
			return true;
		};

		page.handleTableColumnPointerDown({
			clientX: 40,
			clientY: 20,
			currentTarget: { ownerDocument },
			preventDefault() {
				calls.push({ method: 'preventDefault' });
			},
			stopPropagation() {
				calls.push({ method: 'stopPropagation' });
			},
		});
		listeners.pointermove({
			clientX: 140,
			clientY: 20,
			preventDefault() {
				calls.push({ method: 'movePreventDefault' });
			},
		});
		listeners.pointerup();

		expect(calls).toEqual([
			{ method: 'preventDefault' },
			{ method: 'stopPropagation' },
			{ anchor: anchorRange, focus: anchorRange, method: 'selectTableSelectionRanges' },
			{ method: 'movePreventDefault' },
			{ anchor: anchorRange, focus: focusRange, method: 'selectTableSelectionRanges' },
		]);
		expect(listeners.pointermove).toBeUndefined();
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
					hasEditorRoot: Boolean(context.editorRoot),
					hasSelectTableCell: typeof context.selectTableCell === 'function',
				});
				return { handled: true };
			},
		};

		expect(page.dispatchEditorInteraction('contextmenu', event)).toEqual({ handled: true });
		expect(calls).toEqual([{
			eventName: 'contextmenu',
			dispatchedEvent: event,
			hasEditorRoot: true,
			hasSelectTableCell: true,
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

	it('widens the editor content host when a table overflows the page width', function() {
		const page = new EditorPage({});
		const content = document.createElement('div');
		const editor = document.createElement('div');
		const tableWrapper = document.createElement('div');

		tableWrapper.className = 'ql-table-wrapper';
		editor.appendChild(tableWrapper);
		content.style.width = '400px';
		page.documentContentRef.current = content;
		page.quill = {
			root: editor,
		};
		content.getBoundingClientRect = () => ({
			left: 10,
		});
		editor.getBoundingClientRect = () => ({
			width: 400,
		});
		tableWrapper.getBoundingClientRect = () => ({
			right: 610,
		});

		page.updateDocumentOverflowWidth();

		expect(content.style.getPropertyValue('--mn-editor-overflow-width')).toBe('624px');
	});

	it('removes the editor overflow width when tables fit inside the page width', function() {
		const page = new EditorPage({});
		const content = document.createElement('div');
		const editor = document.createElement('div');
		const tableWrapper = document.createElement('div');

		tableWrapper.className = 'ql-table-wrapper';
		editor.appendChild(tableWrapper);
		content.style.setProperty('--mn-editor-overflow-width', '620px');
		page.documentContentRef.current = content;
		page.quill = {
			root: editor,
		};
		content.getBoundingClientRect = () => ({
			left: 10,
		});
		editor.getBoundingClientRect = () => ({
			width: 400,
		});
		tableWrapper.getBoundingClientRect = () => ({
			right: 380,
		});

		page.updateDocumentOverflowWidth();

		expect(content.style.getPropertyValue('--mn-editor-overflow-width')).toBe('');
	});

	it('builds a table selection boundary from selected cell rectangles', function() {
		const page = new EditorPage({});
		const firstCell = {
			parent: {
				domNode: {
					getBoundingClientRect() {
						return {
							bottom: 40,
							height: 20,
							left: 50,
							right: 90,
							top: 20,
							width: 40,
						};
					},
				},
			},
		};
		const secondCell = {
			parent: {
				domNode: {
					getBoundingClientRect() {
						return {
							bottom: 80,
							height: 20,
							left: 50,
							right: 90,
							top: 60,
							width: 40,
						};
					},
				},
			},
		};

		page.quill = {
			root: {
				getBoundingClientRect() {
					return {
						left: 10,
						top: 5,
					};
				},
			},
		};

		expect(page.getTableSelectionBoundary([firstCell, secondCell])).toEqual({
			height: 60,
			width: 40,
			x: 40,
			y: 15,
		});
	});

	it('moves table cell navigation from left to right and top to bottom', function() {
		const calls = [];
		const page = new EditorPage({});
		const table = document.createElement('table');
		const firstRow = document.createElement('tr');
		const secondRow = document.createElement('tr');
		const cells = Array.from({ length: 4 }, () => document.createElement('div'));

		cells.forEach((cell) => {
			cell.className = 'ql-table-cell-inner';
		});
		firstRow.appendChild(cells[0]);
		firstRow.appendChild(cells[1]);
		secondRow.appendChild(cells[2]);
		secondRow.appendChild(cells[3]);
		table.appendChild(firstRow);
		table.appendChild(secondRow);
		page.getCurrentTableCellInner = () => cells[1];
		page.selectTableCell = (cell) => {
			calls.push({ cell, method: 'selectTableCell' });
			return false;
		};

		expect(page.navigateTableCell(false)).toBeFalse();
		expect(calls).toEqual([
			{ cell: cells[2], method: 'selectTableCell' },
		]);
	});

	it('adds a row when tabbing from the last table cell', function() {
		const calls = [];
		const page = new EditorPage({});
		const table = document.createElement('table');
		const row = document.createElement('tr');
		const firstCell = document.createElement('div');
		const lastCell = document.createElement('div');
		const appendedCell = document.createElement('div');

		firstCell.className = 'ql-table-cell-inner';
		lastCell.className = 'ql-table-cell-inner';
		appendedCell.className = 'ql-table-cell-inner';
		row.appendChild(firstCell);
		row.appendChild(lastCell);
		table.appendChild(row);
		page.getCurrentTableCellInner = () => lastCell;
		page.appendTableRowAfterCell = (cell) => {
			const appendedRow = document.createElement('tr');

			calls.push({ cell, method: 'appendTableRowAfterCell' });
			appendedRow.appendChild(appendedCell);
			table.appendChild(appendedRow);
			return true;
		};
		page.selectTableCell = (cell) => {
			calls.push({ cell, method: 'selectTableCell' });
			return false;
		};

		expect(page.navigateTableCell(false)).toBeFalse();
		expect(calls).toEqual([
			{ cell: lastCell, method: 'appendTableRowAfterCell' },
			{ cell: appendedCell, method: 'selectTableCell' },
		]);
	});

	it('swallows shift-tab from the first table cell', function() {
		const page = new EditorPage({});
		const table = document.createElement('table');
		const row = document.createElement('tr');
		const firstCell = document.createElement('div');
		const lastCell = document.createElement('div');

		firstCell.className = 'ql-table-cell-inner';
		lastCell.className = 'ql-table-cell-inner';
		row.appendChild(firstCell);
		row.appendChild(lastCell);
		table.appendChild(row);
		page.getCurrentTableCellInner = () => firstCell;
		page.appendTableRowAfterCell = () => {
			throw new Error('shift-tab should not add a row');
		};
		page.selectTableCell = () => {
			throw new Error('first-cell shift-tab should not select another cell');
		};

		expect(page.navigateTableCell(true)).toBeFalse();
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
