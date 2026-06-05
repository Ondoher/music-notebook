import { Service } from '@polylith/core';

const DEFAULT_TAB_ID = 'tab-1';
const DEFAULT_EDITOR_CONTENT = { ops: [{ insert: '\n' }] };

export default class DocumentModelService extends Service {
	constructor(registry) {
		super('document-model', registry);
		this.implement([
			'ready',
			'start',
			'getId',
			'getTitle',
			'setTitle',
			'rename',
			'getRevision',
			'isDirty',
			'markSaved',
			'getSettings',
			'updateSettings',
			'getTabs',
			'getTab',
			'addTab',
			'updateTab',
			'removeTab',
			'moveTab',
			'joinTabs',
			'getActiveTabId',
			'setActiveTab',
			'getEditorContent',
			'setEditorContent',
			'getObjects',
			'getObject',
			'createObject',
			'upsertObject',
			'updateObject',
			'removeObject',
			'loadDocumentList',
			'loadServerDocument',
			'saveNewDocument',
			'saveExistingDocument',
			'renameServerDocument',
			'toJSON',
			'load',
		]);
	}

	ready() {
		/** @type {IoService} */
		this.io = this.registry.subscribe('io');
	}

	start() {
		this.document = this.createDefaultDocument();
		this.dirty = false;
	}

	createDefaultSettings() {
		return {
			viewMode: 'continuous',
			chordDisplayStyle: 'plain',
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
					id: 'header-1',
					name: 'Header 1',
					parentStyleId: 'normal',
					format: {
						bold: true,
						fontSize: 25,
						start: 'full-line',
					},
				},
				{
					id: 'header-2',
					name: 'Header 2',
					parentStyleId: 'normal',
					format: {
						bold: true,
						fontSize: 20,
						start: 'full-line',
					},
				},
				{
					id: 'header-3',
					name: 'Header 3',
					parentStyleId: 'normal',
					format: {
						bold: true,
						fontSize: 15,
						start: 'full-line',
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
		};
	}

	createDefaultDocument() {
		return {
			id: null,
			title: 'Untitled notebook',
			revision: 0,
			settings: this.createDefaultSettings(),
			tabs: [
				{
					id: DEFAULT_TAB_ID,
					title: '',
					order: 0,
					editorContent: this.clone(DEFAULT_EDITOR_CONTENT),
				},
			],
			activeTabId: DEFAULT_TAB_ID,
			objects: [],
		};
	}

	clone(value) {
		if (value === undefined || value === null) {
			return value;
		}

		if (typeof structuredClone === 'function') {
			return structuredClone(value);
		}

		return JSON.parse(JSON.stringify(value));
	}

	makeId(prefix) {
		return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
	}

	getSortedTabs() {
		return [...this.document.tabs].sort((left, right) => (
			left.order === right.order
				? String(left.id || '').localeCompare(String(right.id || ''))
				: left.order - right.order
		));
	}

	normalizeTab(input = {}, index = 0) {
		const id = input.id || this.makeId('tab');

		return {
			id,
			title: input.title || '',
			order: Number.isFinite(input.order) ? input.order : index,
			editorContent: this.clone(input.editorContent || DEFAULT_EDITOR_CONTENT),
		};
	}

	normalizeObject(object = {}, fallbackTabId = this.document?.activeTabId || DEFAULT_TAB_ID) {
		const nextObject = this.clone(object) || {};
		const tabId = nextObject.tabId || fallbackTabId;

		return {
			...nextObject,
			id: nextObject.id || this.makeId('object'),
			tabId,
		};
	}

	normalizeSettings(settings = {}) {
		const defaults = this.createDefaultSettings();

		return {
			...defaults,
			...settings,
			typography: {
				...defaults.typography,
				...(settings.typography || {}),
				fontSize: this.normalizeFontSize(settings.typography?.fontSize, defaults.typography.fontSize),
			},
			styles: this.normalizeStyles(settings.styles, defaults.styles),
			page: {
				...defaults.page,
				...(settings.page || {}),
				margins: {
					...defaults.page.margins,
					...(settings.page?.margins || {}),
				},
			},
		};
	}

	normalizeStyles(styles, fallbackStyles = this.createDefaultSettings().styles) {
		const fallback = Array.isArray(fallbackStyles) ? fallbackStyles : [];
		const sourceStyles = Array.isArray(styles) && styles.length ? styles : fallback;
		const normalized = sourceStyles
			.map((style) => this.normalizeStyle(style))
			.filter(Boolean);

		if (!normalized.some((style) => style.id === 'normal')) {
			normalized.unshift(this.normalizeStyle(fallback.find((style) => style.id === 'normal') || {
				id: 'normal',
				name: 'Normal',
				parentStyleId: '',
				format: {},
			}));
		}

		const ids = new Set(normalized.map((style) => style.id));

		return normalized.map((style) => ({
			...style,
			parentStyleId: style.parentStyleId && ids.has(style.parentStyleId) && style.parentStyleId !== style.id
				? style.parentStyleId
				: '',
		}));
	}

	normalizeStyle(style = {}) {
		const id = this.normalizeStyleId(style.id);

		if (!id) {
			return null;
		}

		return {
			id,
			name: String(style.name || id),
			parentStyleId: this.normalizeStyleId(style.parentStyleId),
			format: this.normalizeParagraphStyleFormat(style.format || {}),
		};
	}

	normalizeStyleId(value) {
		return String(value || '')
			.trim()
			.toLowerCase()
			.replace(/[^a-z0-9_-]+/g, '-')
			.replace(/^-+|-+$/g, '');
	}

	normalizeParagraphStyleFormat(format = {}) {
		const normalized = {};

		if (['center', 'justify', 'left', 'right'].includes(format.alignment)) {
			normalized.alignment = format.alignment;
		}

		if (format.bold !== undefined) {
			normalized.bold = format.bold === true;
		}

		if (format.fontSize !== undefined) {
			normalized.fontSize = this.normalizeFontSize(format.fontSize);
		}

		if (format.italic !== undefined) {
			normalized.italic = format.italic === true;
		}

		if (['continuous', 'full-line', 'next-page'].includes(format.start)) {
			normalized.start = format.start;
		}

		if (format.underline !== undefined) {
			normalized.underline = format.underline === true;
		}

		return normalized;
	}

	normalizeFontSize(fontSize, defaultValue = 12) {
		const value = Number(fontSize);

		if (!Number.isFinite(value)) {
			return defaultValue;
		}

		return Math.min(Math.max(Math.round(value), 6), 144);
	}

	normalizeSnapshot(snapshot = {}) {
		const tabs = (snapshot.tabs?.length ? snapshot.tabs : this.createDefaultDocument().tabs)
			.map((tab, index) => this.normalizeTab(tab, index));
		const activeTabId = tabs.some((tab) => tab.id === snapshot.activeTabId)
			? snapshot.activeTabId
			: tabs[0]?.id || null;
		const objects = [
			...(snapshot.objects || []),
			...(snapshot.musicObjects || []),
			...(snapshot.inlineChords || []),
		].map((object) => this.normalizeObject(object, activeTabId));

		return {
			id: snapshot.id || null,
			title: snapshot.title || 'Untitled notebook',
			revision: Number.isFinite(snapshot.revision) ? snapshot.revision : 0,
			settings: this.normalizeSettings(snapshot.settings),
			tabs,
			activeTabId,
			objects,
		};
	}

	markChanged(eventName, payload) {
		this.document.revision += 1;
		this.dirty = true;
		this.fire(eventName, payload);
		this.fire('document-changed', {
			eventName,
			payload,
			document: this.toJSON(),
		});
	}

	reorderTabs() {
		this.document.tabs = this.getSortedTabs().map((tab, index) => ({
			...tab,
			order: index,
		}));
	}

	getId() {
		return this.document.id;
	}

	getTitle() {
		return this.document.title;
	}

	setTitle(title) {
		const nextTitle = String(title || '').trim() || 'Untitled notebook';

		if (this.document.title === nextTitle) {
			return this.document.title;
		}

		this.document.title = nextTitle;
		this.markChanged('title-changed', nextTitle);
		return this.document.title;
	}

	rename(title) {
		const nextTitle = String(title || '').trim() || 'Untitled notebook';

		if (this.document.title === nextTitle) {
			return this.document.title;
		}

		this.document.title = nextTitle;
		this.fire('title-changed', nextTitle);
		this.fire('document-renamed', this.toJSON());
		return this.document.title;
	}

	getRevision() {
		return this.document.revision;
	}

	isDirty() {
		return this.dirty;
	}

	markSaved(revision = this.document.revision) {
		this.document.revision = revision;
		this.dirty = false;
		this.fire('document-saved', this.toJSON());
	}

	getSettings() {
		return this.clone(this.document.settings);
	}

	updateSettings(patch = {}) {
		this.document.settings = this.normalizeSettings({
			...this.document.settings,
			...patch,
			page: {
				...this.document.settings.page,
				...(patch.page || {}),
				margins: {
					...this.document.settings.page.margins,
					...(patch.page?.margins || {}),
				},
			},
		});
		this.markChanged('settings-changed', this.getSettings());
		return this.getSettings();
	}

	getTabs() {
		return this.getSortedTabs().map((tab) => this.clone(tab));
	}

	getTab(tabId) {
		const tab = this.document.tabs.find((candidate) => candidate.id === tabId);

		return tab ? this.clone(tab) : null;
	}

	addTab(input = {}) {
		const tabs = this.getSortedTabs();
		const tab = this.normalizeTab(input, tabs.length);
		const afterIndex = input.afterTabId
			? tabs.findIndex((candidate) => candidate.id === input.afterTabId)
			: -1;

		if (afterIndex === -1) {
			tabs.push(tab);
		} else {
			tabs.splice(afterIndex + 1, 0, tab);
		}

		this.document.tabs = tabs.map((item, index) => ({
			...item,
			order: index,
		}));
		this.document.activeTabId = tab.id;

		this.markChanged('tabs-changed', this.getTabs());
		this.fire('tab-added', this.clone(tab));
		this.fire('active-tab-changed', tab.id);
		return this.clone(tab);
	}

	updateTab(tabId, patch = {}) {
		const index = this.document.tabs.findIndex((tab) => tab.id === tabId);

		if (index === -1) {
			return null;
		}

		this.document.tabs[index] = {
			...this.document.tabs[index],
			...patch,
			id: tabId,
			editorContent: patch.editorContent !== undefined
				? this.clone(patch.editorContent)
				: this.document.tabs[index].editorContent,
		};
		this.markChanged('tabs-changed', this.getTabs());
		this.fire('tab-updated', this.getTab(tabId));
		return this.getTab(tabId);
	}

	removeTab(tabId) {
		const initialLength = this.document.tabs.length;

		if (initialLength <= 1) {
			return false;
		}

		this.document.tabs = this.document.tabs.filter((tab) => tab.id !== tabId);

		if (this.document.tabs.length === initialLength) {
			return false;
		}

		this.document.objects = this.document.objects.filter((object) => object.tabId !== tabId);

		if (this.document.activeTabId === tabId) {
			this.document.activeTabId = this.getSortedTabs()[0]?.id || null;
			this.fire('active-tab-changed', this.document.activeTabId);
		}

		this.reorderTabs();
		this.markChanged('tabs-changed', this.getTabs());
		this.fire('tab-removed', tabId);
		return true;
	}

	moveTab(tabId, targetIndex) {
		const tabs = this.getSortedTabs();
		const currentIndex = tabs.findIndex((tab) => tab.id === tabId);

		if (currentIndex === -1) {
			return;
		}

		const nextIndex = Math.max(0, Math.min(targetIndex, tabs.length - 1));
		const [tab] = tabs.splice(currentIndex, 1);

		tabs.splice(nextIndex, 0, tab);
		this.document.tabs = tabs.map((item, index) => ({
			...item,
			order: index,
		}));
		this.markChanged('tabs-changed', this.getTabs());
		this.fire('tabs-reordered', this.getTabs());
	}

	joinTabs(sourceTabId, targetTabId) {
		if (sourceTabId === targetTabId) {
			return null;
		}

		const source = this.document.tabs.find((tab) => tab.id === sourceTabId);
		const target = this.document.tabs.find((tab) => tab.id === targetTabId);

		if (!source || !target) {
			return null;
		}

		target.editorContent = this.joinEditorContent(target.editorContent, source.editorContent);
		this.document.objects = this.document.objects.map((object) => (
			object.tabId === sourceTabId
				? { ...object, tabId: targetTabId }
				: object
		));
		this.document.tabs = this.document.tabs.filter((tab) => tab.id !== sourceTabId);

		if (this.document.activeTabId === sourceTabId) {
			this.document.activeTabId = targetTabId;
			this.fire('active-tab-changed', targetTabId);
		}

		this.reorderTabs();
		this.markChanged('tabs-joined', {
			sourceTabId,
			targetTabId,
			tabs: this.getTabs(),
		});
		return this.getTab(targetTabId);
	}

	joinEditorContent(targetContent = DEFAULT_EDITOR_CONTENT, sourceContent = DEFAULT_EDITOR_CONTENT) {
		const targetOps = Array.isArray(targetContent?.ops) ? this.clone(targetContent.ops) : [];
		const sourceOps = Array.isArray(sourceContent?.ops) ? this.clone(sourceContent.ops) : [];
		const trimmedTargetOps = sourceOps.length
			? this.removeTrailingEditorNewline(targetOps)
			: targetOps;

		return {
			ops: [
				...trimmedTargetOps,
				{ insert: '\n\n' },
				...sourceOps,
			],
		};
	}

	removeTrailingEditorNewline(ops = []) {
		const trimmedOps = [...ops];
		const lastOp = trimmedOps[trimmedOps.length - 1];

		if (!lastOp) {
			return trimmedOps;
		}

		if (lastOp.insert === '\n') {
			trimmedOps.pop();
			return trimmedOps;
		}

		if (typeof lastOp.insert === 'string' && lastOp.insert.endsWith('\n')) {
			const nextInsert = lastOp.insert.slice(0, -1);

			if (nextInsert.length === 0) {
				trimmedOps.pop();
			} else {
				trimmedOps[trimmedOps.length - 1] = {
					...lastOp,
					insert: nextInsert,
				};
			}
		}

		return trimmedOps;
	}

	getActiveTabId() {
		return this.document.activeTabId;
	}

	setActiveTab(tabId) {
		if (!this.document.tabs.some((tab) => tab.id === tabId)) {
			return null;
		}

		this.document.activeTabId = tabId;
		this.fire('active-tab-changed', tabId);
		return tabId;
	}

	getEditorContent(tabId = this.document.activeTabId) {
		const tab = this.document.tabs.find((candidate) => candidate.id === tabId);

		return tab ? this.clone(tab.editorContent) : null;
	}

	setEditorContent(content, tabId = this.document.activeTabId) {
		const index = this.document.tabs.findIndex((tab) => tab.id === tabId);

		if (index === -1) {
			return null;
		}

		this.document.tabs[index] = {
			...this.document.tabs[index],
			editorContent: this.clone(content),
		};
		this.markChanged('editor-content-changed', {
			tabId,
			editorContent: this.clone(content),
		});
		return this.getEditorContent(tabId);
	}

	getObjects(tabId = '') {
		return this.document.objects
			.filter((object) => !tabId || object.tabId === tabId)
			.map((object) => this.clone(object));
	}

	getObject(objectId) {
		const object = this.document.objects.find((candidate) => candidate.id === objectId);

		return object ? this.clone(object) : null;
	}

	createObject(type, data = {}, options = {}) {
		return this.upsertObject({
			...options,
			type,
			data: this.clone(data),
		});
	}

	upsertObject(object) {
		const nextObject = this.normalizeObject(object);
		const index = this.document.objects.findIndex((candidate) => candidate.id === nextObject.id);
		const isNew = index === -1;

		if (isNew) {
			this.document.objects.push(nextObject);
		} else {
			this.document.objects[index] = nextObject;
		}

		const eventName = isNew ? 'object-created' : 'object-updated';

		this.markChanged(eventName, this.clone(nextObject));
		this.fire('object-changed', this.clone(nextObject));
		return this.clone(nextObject);
	}

	updateObject(objectId, patch = {}) {
		const existingObject = this.getObject(objectId);

		if (!existingObject) {
			return null;
		}

		return this.upsertObject({
			...existingObject,
			...patch,
			id: objectId,
			data: patch.data !== undefined
				? this.clone(patch.data)
				: existingObject.data,
		});
	}

	removeObject(objectId) {
		const initialLength = this.document.objects.length;

		this.document.objects = this.document.objects.filter((object) => object.id !== objectId);

		if (this.document.objects.length === initialLength) {
			return false;
		}

		this.markChanged('object-removed', objectId);
		return true;
	}

	getCurrentContentForSave(name = this.getTitle()) {
		return {
			...this.toJSON(),
			title: name,
		};
	}

	applyServerDocument(document) {
		this.load({
			...document.content,
			id: document.id,
			title: document.name,
		});
	}

	async loadDocumentList() {
		const result = await this.io.get('api/documents');

		if (result.success && result.data?.success && Array.isArray(result.data.documents)) {
			return result.data.documents;
		}

		return [];
	}

	async loadServerDocument(documentId) {
		const id = String(documentId || '').trim();

		if (!id) {
			return {success: false};
		}

		const result = await this.io.get(`api/documents/${encodeURIComponent(id)}`);

		if (result.success && result.data?.success && result.data.document) {
			this.applyServerDocument(result.data.document);
		}

		return result;
	}

	async saveNewDocument(name, options = {}) {
		const result = await this.io.post('api/documents', {
			allowNameConflict: options.allowNameConflict === true,
			name,
			content: this.getCurrentContentForSave(name),
		});

		if (result.success && result.data?.success && result.data.document) {
			this.applyServerDocument(result.data.document);
		}

		return result;
	}

	async saveExistingDocument(options = {}) {
		const id = options.id || this.getId();
		const name = options.name || this.getTitle();
		const result = await this.io.send({
			method: 'PUT',
			url: `api/documents/${encodeURIComponent(id)}`,
			body: {
				name,
				content: this.getCurrentContentForSave(name),
			},
		});

		if (result.success && result.data?.success && result.data.document) {
			this.applyServerDocument(result.data.document);
		}

		return result;
	}

	async renameServerDocument(name, options = {}) {
		const id = options.id || this.getId();

		return this.io.send({
			method: 'PATCH',
			url: `api/documents/${encodeURIComponent(id)}/name`,
			body: {
				allowNameConflict: options.allowNameConflict === true,
				name,
			},
		});
	}

	toJSON() {
		const tabs = this.getSortedTabs();

		return this.clone({
			...this.document,
			tabs,
			activeTabId: this.document.activeTabId,
		});
	}

	load(snapshot = {}) {
		this.document = this.normalizeSnapshot(snapshot);
		this.dirty = false;
		this.fire('document-loaded', this.toJSON());
		return this.toJSON();
	}
}

new DocumentModelService();
