import { Service } from '@polylith/core';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatUnderlinedIcon from '@mui/icons-material/FormatUnderlined';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import FormatClearIcon from '@mui/icons-material/FormatClear';
import SpaceBarIcon from '@mui/icons-material/SpaceBar';
import { EDITOR_TOOLBAR_SECTIONS } from './services/editor-toolbar.js';

export default class EditorController extends Service {
	constructor(registry) {
		super('editor-controller', registry);
		this.implement(['ready', 'mount', 'getState', 'toggleSeeWhiteSpace']);
	}

	ready() {
		this.pages = this.registry.subscribe('app-pages');
		this.views = this.registry.subscribe('views');
		this.localize = this.registry.subscribe('localize');
		this.editorToolbar = this.registry.subscribe('editor-toolbar');
		this.editorSurface = this.registry.subscribe('editor-surface');
		this.actionRegistry = this.registry.subscribe('action-registry');
		this.state = this.initialState();

		this.registerToolbarActions();
		this.registerToolbarItems();
		this.toolbarSelectedListener = this.editorToolbar.listen(
			'item-selected',
			this.onToolbarItemSelected.bind(this),
		);
		this.pages.add({
			id: 'editor',
			label: 'Editor',
			urlSlug: 'editor',
			route: '/mn/editor',
			order: 0,
			controller: 'editor-controller',
		});
	}

	registerToolbarActions() {
		this.actionRegistry.registerAction('editor.bold', FormatBoldIcon, 'default', 'editor.toolbar.bold');
		this.actionRegistry.registerAction('editor.italic', FormatItalicIcon, 'default', 'editor.toolbar.italic');
		this.actionRegistry.registerAction('editor.underline', FormatUnderlinedIcon, 'default', 'editor.toolbar.underline');
		this.actionRegistry.registerAction('editor.list.bullet', FormatListBulletedIcon, 'default', 'editor.toolbar.list_bullet');
		this.actionRegistry.registerAction('editor.list.ordered', FormatListNumberedIcon, 'default', 'editor.toolbar.list_ordered');
		this.actionRegistry.registerAction('editor.clean', FormatClearIcon, 'default', 'editor.toolbar.clean');
		this.actionRegistry.registerAction('editor.see-white-space', SpaceBarIcon, 'default', 'editor.toolbar.see_white_space');
	}

	registerToolbarItems() {
		this.editorToolbar.addItem(EDITOR_TOOLBAR_SECTIONS.TEXT, 100, 'editor.bold', 'editor.toolbar.bold', 'editor.bold', {
			commandId: 'editor.format.bold',
			ownerFeature: 'editor',
			pressed: false,
		});
		this.editorToolbar.addItem(EDITOR_TOOLBAR_SECTIONS.TEXT, 200, 'editor.italic', 'editor.toolbar.italic', 'editor.italic', {
			commandId: 'editor.format.italic',
			ownerFeature: 'editor',
			pressed: false,
		});
		this.editorToolbar.addItem(EDITOR_TOOLBAR_SECTIONS.TEXT, 300, 'editor.underline', 'editor.toolbar.underline', 'editor.underline', {
			commandId: 'editor.format.underline',
			ownerFeature: 'editor',
			pressed: false,
		});
		this.editorToolbar.addItem(EDITOR_TOOLBAR_SECTIONS.STRUCTURE, 100, 'editor.list.ordered', 'editor.toolbar.list_ordered', 'editor.list.ordered', {
			commandId: 'editor.format.list.ordered',
			ownerFeature: 'editor',
			pressed: false,
		});
		this.editorToolbar.addItem(EDITOR_TOOLBAR_SECTIONS.STRUCTURE, 200, 'editor.list.bullet', 'editor.toolbar.list_bullet', 'editor.list.bullet', {
			commandId: 'editor.format.list.bullet',
			ownerFeature: 'editor',
			pressed: false,
		});
		this.editorToolbar.addItem(EDITOR_TOOLBAR_SECTIONS.TEXT, 400, 'editor.clean', 'editor.toolbar.clean', 'editor.clean', {
			commandId: 'editor.format.clean',
			ownerFeature: 'editor',
		});
		this.editorToolbar.addItem(EDITOR_TOOLBAR_SECTIONS.TEXT, 500, 'editor.see-white-space', 'editor.toolbar.see_white_space', 'editor.see-white-space', {
			commandId: 'editor.view.see-white-space',
			ownerFeature: 'editor',
			pressed: this.state.seeWhiteSpace === true,
		});
	}

	onToolbarItemSelected(event) {
		const commandId = event?.item?.commandId || event?.item?.id;

		if (commandId === 'editor.view.see-white-space') {
			this.toggleSeeWhiteSpace();
			return;
		}

		if (commandId?.startsWith('editor.format.')) {
			this.editorSurface.format(commandId);
		}
	}

	toggleSeeWhiteSpace() {
		this.state = {
			...this.state,
			seeWhiteSpace: this.state.seeWhiteSpace !== true,
		};
		this.editorToolbar.updateItem('editor.see-white-space', {
			pressed: this.state.seeWhiteSpace,
		});
		this.fire('updated', this.getState());
		return this.state.seeWhiteSpace;
	}

	initialState() {
		return {
			placeholder: this.localize.translate('editor.placeholder'),
			document: {
				ops: [
					{ insert: this.localize.translate('editor.initial.start') },
					{ insert: '\n\n' },
					{ insert: this.localize.translate('editor.initial.embeds') },
					{ insert: '\n' },
				],
			},
			seeWhiteSpace: false,
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
