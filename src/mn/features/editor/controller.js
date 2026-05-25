import { Service } from '@polylith/core';

export default class EditorController extends Service {
	constructor(registry) {
		super('editor-controller', registry);
		this.implement(['ready', 'mount', 'getState']);
	}

	ready() {
		this.pages = this.registry.subscribe('app-pages');
		this.views = this.registry.subscribe('views');
		this.localize = this.registry.subscribe('localize');
		this.state = this.initialState();

		this.pages.add({
			id: 'editor',
			label: 'Editor',
			urlSlug: 'editor',
			route: '/mn/editor',
			order: 0,
			controller: 'editor-controller',
		});
	}

	initialState() {
		return {
			title: this.localize.t('editor.title.untitled'),
			status: this.localize.t('editor.status.poc'),
			placeholder: this.localize.t('editor.placeholder'),
			debugDocumentLabel: this.localize.t('editor.debug_document'),
			insertKeyboardObjectLabel: this.localize.t('editor.insert_keyboard_object'),
			insertStaffObjectLabel: this.localize.t('editor.insert_staff_object'),
			document: {
				ops: [
					{ insert: this.localize.t('editor.initial.start') },
					{ insert: '\n\n' },
					{ insert: this.localize.t('editor.initial.embeds') },
					{ insert: '\n' },
				],
			},
		};
	}

	mount(options = {}) {
		this.app = options.appController || this.app || null;

		return this.views.get('editor', {
			controller: this,
		});
	}

	getState() {
		return { ...this.state };
	}
}

new EditorController();
