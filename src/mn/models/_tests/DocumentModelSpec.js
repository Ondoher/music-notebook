import { Registry, Service } from '@polylith/core';
import DocumentModelService from '../document-model.js';

describe('DocumentModelService', function() {
	function createModel() {
		const registry = new Registry();
		const model = new DocumentModelService(registry);

		model.start();
		return model;
	}

	class IoMock extends Service {
		constructor(registry) {
			super('io', registry);
			this.implement(['get', 'post', 'send']);
			this.documents = [];
			this.gets = [];
			this.posts = [];
			this.sends = [];
		}

		get(url) {
			this.gets.push(url);

			if (url === 'api/documents') {
				return Promise.resolve({
					success: true,
					data: {
						success: true,
						documents: this.documents,
					},
				});
			}

			if (url === 'api/documents/doc-1') {
				return Promise.resolve({
					success: true,
					data: {
						success: true,
						document: {
							id: 'doc-1',
							name: 'Loaded document',
							content: {
								title: 'Ignored title',
								revision: 2,
								tabs: [],
								objects: [],
							},
						},
					},
				});
			}

			return Promise.resolve({ success: false });
		}

		post(url, body) {
			this.posts.push({ url, body });
			return Promise.resolve({
				success: true,
				data: {
					success: true,
					document: {
						id: 'doc-new',
						name: body.name,
						content: body.content,
					},
				},
			});
		}

		send(options) {
			this.sends.push(options);

			if (options.method === 'PATCH') {
				return Promise.resolve({
					success: true,
					data: {
						success: true,
						document: {
							id: 'doc-1',
							name: options.body.name,
						},
					},
				});
			}

			return Promise.resolve({
				success: true,
				data: {
					success: true,
					document: {
						id: options.url.split('/').pop(),
						name: options.body.name,
						content: options.body.content,
					},
				},
			});
		}
	}

	function createPersistenceHarness() {
		const registry = new Registry();
		const io = new IoMock(registry);
		const model = new DocumentModelService(registry);

		model.start();
		model.ready();
		return { io, model };
	}

	it('starts with a continuous notebook document and one editable tab', function() {
		const model = createModel();
		const tabs = model.getTabs();

		expect(model.getTitle()).toBe('Untitled notebook');
		expect(model.getSettings().viewMode).toBe('continuous');
		expect(model.getSettings().typography.fontSize).toBe(12);
		expect(model.getSettings().styles.map((style) => style.id)).toEqual(['normal', 'header-1', 'header-2', 'header-3']);
		expect(model.getSettings().styles.slice(1).map((style) => style.format.fontSize)).toEqual([25, 20, 15]);
		expect(model.getSettings().styles.slice(1).every((style) => style.format.bold === true)).toBeTrue();
		expect(model.getActiveTabId()).toBe('tab-1');
		expect(tabs.length).toBe(1);
		expect(tabs[0].title).toBe('');
		expect(tabs[0].editorContent).toEqual({ ops: [{ insert: '\n' }] });
	});

	it('tracks changes and emits document change events', function() {
		const model = createModel();
		const changes = [];

		model.listen('document-changed', (event) => changes.push(event));

		model.setTitle('Set List');
		model.updateSettings({ chordDisplayStyle: 'jazz' });
		model.setEditorContent({ ops: [{ insert: 'Hello\n' }] });

		expect(model.getTitle()).toBe('Set List');
		expect(model.getSettings().chordDisplayStyle).toBe('jazz');
		expect(model.getRevision()).toBe(3);
		expect(model.isDirty()).toBeTrue();
		expect(changes.map((event) => event.eventName)).toEqual([
			'title-changed',
			'settings-changed',
			'editor-content-changed',
		]);

		model.markSaved();

		expect(model.isDirty()).toBeFalse();
	});

	it('renames a persisted document without marking content dirty', function() {
		const model = createModel();
		const renamed = [];

		model.load({
			id: 'doc-1',
			title: 'Lesson 1',
		});
		model.listen('document-renamed', (document) => renamed.push(document));

		expect(model.rename('Lesson 2')).toBe('Lesson 2');

		expect(model.getTitle()).toBe('Lesson 2');
		expect(model.isDirty()).toBeFalse();
		expect(renamed[0]).toEqual(jasmine.objectContaining({
			id: 'doc-1',
			title: 'Lesson 2',
		}));

		model.setEditorContent({ops: [{insert: 'Dirty\n'}]});
		model.rename('Lesson 3');

		expect(model.getTitle()).toBe('Lesson 3');
		expect(model.isDirty()).toBeTrue();
	});

	it('adds, updates, removes, and reorders tabs', function() {
		const model = createModel();
		const bridge = model.addTab({ title: 'Bridge' });
		const chorus = model.addTab({ title: 'Chorus' });
		const coda = model.addTab({ title: 'Coda', afterTabId: bridge.id });

		model.updateTab(bridge.id, { title: 'Verse' });
		model.moveTab(chorus.id, 0);

		expect(model.getTabs().map((tab) => tab.title)).toEqual([
			'Chorus',
			'',
			'Verse',
			'Coda',
		]);

		model.setActiveTab(bridge.id);

		expect(model.removeTab(bridge.id)).toBeTrue();
		expect(model.getTab(bridge.id)).toBeNull();
		expect(model.getActiveTabId()).not.toBe(bridge.id);
	});

	it('joins tabs and moves objects to the target tab', function() {
		const model = createModel();
		const source = model.addTab({
			title: 'Source',
			editorContent: { ops: [{ insert: 'Source\n' }] },
		});
		const target = model.addTab({
			title: 'Target',
			editorContent: { ops: [{ insert: 'Target\n' }] },
		});

		model.setActiveTab(source.id);
		const musicObject = model.createObject('music-object', { key: 'C' });
		const joined = model.joinTabs(source.id, target.id);

		expect(joined.id).toBe(target.id);
		expect(model.getTab(source.id)).toBeNull();
		expect(model.getObject(musicObject.id).tabId).toBe(target.id);
		expect(model.getEditorContent(target.id)).toEqual({
			ops: [
				{ insert: 'Target' },
				{ insert: '\n\n' },
				{ insert: 'Source\n' },
			],
		});
	});

	it('stores generic document objects against the active tab', function() {
		const model = createModel();
		const tab = model.addTab({ title: 'Music' });
		const created = [];
		const updated = [];

		model.setActiveTab(tab.id);
		model.listen('object-created', (object) => created.push(object));
		model.listen('object-updated', (object) => updated.push(object));

		const musicObject = model.createObject('music-object', {
			displayMode: 'staff',
			contentType: 'scale',
			key: 'C',
		});
		const inlineChord = model.upsertObject({
			type: 'inline-chord',
			sourceText: 'Cmaj7',
			normalized: { root: 'C', quality: 'maj7' },
		});

		expect(musicObject.id).toContain('object-');
		expect(musicObject.tabId).toBe(tab.id);
		expect(model.getObject(musicObject.id)).toEqual(musicObject);

		expect(inlineChord.id).toContain('object-');
		expect(inlineChord.tabId).toBe(tab.id);
		expect(model.getObject(inlineChord.id)).toEqual(inlineChord);
		expect(model.getObjects(tab.id)).toEqual([musicObject, inlineChord]);
		expect(created[0]).toEqual(musicObject);

		const updatedObject = model.updateObject(musicObject.id, {
			data: {
				...musicObject.data,
				key: 'D',
			},
		});

		expect(updatedObject.data.key).toBe('D');
		expect(updated[0]).toEqual(updatedObject);

		expect(model.removeObject(musicObject.id)).toBeTrue();
		expect(model.removeObject(inlineChord.id)).toBeTrue();
	});

	it('loads snapshots and protects callers from mutating internal state', function() {
		const model = createModel();
		const snapshot = model.load({
			id: 'doc-1',
			title: 'Loaded',
			settings: {
				viewMode: 'continuous',
				chordDisplayStyle: 'jazz',
				typography: { fontSize: 18 },
				page: { margins: { top: 36 } },
			},
			tabs: [
				{
					id: 'tab-a',
					title: 'A',
					order: 0,
					editorContent: { ops: [{ insert: 'A\n' }] },
				},
			],
			activeTabId: 'tab-a',
		});

		snapshot.tabs[0].title = 'Mutated';

		expect(model.getId()).toBe('doc-1');
		expect(model.getTitle()).toBe('Loaded');
		expect(model.getSettings().typography.fontSize).toBe(18);
		expect(model.getSettings().page.margins.top).toBe(36);
		expect(model.getTab('tab-a').title).toBe('A');
		expect(model.isDirty()).toBeFalse();
	});

	it('loads persisted document lists through the io service', async function() {
		const { io, model } = createPersistenceHarness();
		io.documents = [{
			id: 'doc-1',
			name: 'Lesson 1',
		}];

		const documents = await model.loadDocumentList();

		expect(io.gets).toEqual(['api/documents']);
		expect(documents).toEqual(io.documents);
	});

	it('loads persisted server documents into the local snapshot', async function() {
		const { io, model } = createPersistenceHarness();

		const result = await model.loadServerDocument('doc-1');

		expect(result.success).toBeTrue();
		expect(io.gets).toEqual(['api/documents/doc-1']);
		expect(model.getId()).toBe('doc-1');
		expect(model.getTitle()).toBe('Loaded document');
		expect(model.isDirty()).toBeFalse();
	});

	it('saves new and existing documents through the io service', async function() {
		const { io, model } = createPersistenceHarness();

		model.setTitle('Draft');
		await model.saveNewDocument('Lesson 1', { allowNameConflict: true });

		expect(io.posts[0]).toEqual(jasmine.objectContaining({
			url: 'api/documents',
			body: jasmine.objectContaining({
				allowNameConflict: true,
				name: 'Lesson 1',
				content: jasmine.objectContaining({
					title: 'Lesson 1',
				}),
			}),
		}));
		expect(model.getId()).toBe('doc-new');

		await model.saveExistingDocument({ id: 'doc-new', name: 'Lesson 1' });

		expect(io.sends[0]).toEqual(jasmine.objectContaining({
			method: 'PUT',
			url: 'api/documents/doc-new',
			body: jasmine.objectContaining({
				name: 'Lesson 1',
			}),
		}));
	});

	it('renames persisted documents through the io service without mutating local content', async function() {
		const { io, model } = createPersistenceHarness();

		model.load({
			id: 'doc-1',
			title: 'Lesson 1',
		});
		model.setEditorContent({ ops: [{ insert: 'Unsaved\n' }] });

		const result = await model.renameServerDocument('Lesson 2', {
			allowNameConflict: true,
			id: 'doc-1',
		});

		expect(result.success).toBeTrue();
		expect(io.sends[0]).toEqual(jasmine.objectContaining({
			method: 'PATCH',
			url: 'api/documents/doc-1/name',
			body: {
				allowNameConflict: true,
				name: 'Lesson 2',
			},
		}));
		expect(model.getTitle()).toBe('Lesson 1');
		expect(model.isDirty()).toBeTrue();
	});

	it('normalizes document paragraph styles and parent references', function() {
		const model = createModel();

		model.updateSettings({
			styles: [
				{
					id: 'Normal',
					name: 'Normal',
					format: { fontSize: 13 },
				},
				{
					id: 'Lesson Title',
					name: 'Lesson Title',
					parentStyleId: 'normal',
					format: {
						alignment: 'center',
						bold: true,
						fontSize: 20,
						start: 'full-line',
					},
				},
				{
					id: 'Broken Parent',
					name: 'Broken',
					parentStyleId: 'missing',
					format: { fontSize: 500 },
				},
			],
		});

		expect(model.getSettings().styles).toEqual([
			{
				id: 'normal',
				name: 'Normal',
				parentStyleId: '',
				format: { fontSize: 13 },
			},
			{
				id: 'lesson-title',
				name: 'Lesson Title',
				parentStyleId: 'normal',
				format: {
					alignment: 'center',
					bold: true,
					fontSize: 20,
					start: 'full-line',
				},
			},
			{
				id: 'broken-parent',
				name: 'Broken',
				parentStyleId: '',
				format: { fontSize: 144 },
			},
		]);
	});
});
