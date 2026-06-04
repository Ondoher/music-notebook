import { Service } from '@polylith/core';
import EditIcon from '@mui/icons-material/Edit';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import TuneIcon from '@mui/icons-material/Tune';
import {
	IconClefStaff,
	IconPiano,
} from '@tabler/icons-react';
import { EDITOR_TOOLBAR_SECTIONS } from '../editor/services/editor-toolbar.js';
import {
	DEFAULT_KEYBOARD_PAYLOAD,
	KEYBOARD_EMBED_BLOT,
	configureKeyboardEmbedContext,
	getKeyboardEmbedClipboardMatchers,
	registerKeyboardEmbed,
} from './quill/keyboard-embed.js';
import MusicObjectEmbedSession from './embed-session.js';

/**
 * Registers music object document type, toolbar commands, icons, and Quill embed rendering.
 */
export default class MusicObjectController extends Service {
	constructor(registry) {
		super('music-object-controller', registry);
		this.implement(['ready', 'attachEmbed', 'getPlayerService']);
	}

	ready() {
		this.documentModel = this.registry.subscribe('document-model');
		this.editorToolbar = this.registry.subscribe('editor-toolbar');
		this.editorSurface = this.registry.subscribe('editor-surface');
		this.iconRegistry = this.registry.subscribe('icon-registry');
		this.objectTypes = this.registry.subscribe('object-type-registry');
		this.player = null;

		registerKeyboardEmbed();
		this.registerObjectType();
		this.registerToolbarIcons();
		this.registerToolbarItems();
		this.toolbarSelectedListener = this.editorToolbar.listen(
			'item-selected',
			this.onToolbarItemSelected.bind(this),
		);
	}

	attachEmbed(options = {}) {
		return new MusicObjectEmbedSession(this, options);
	}

	getPlayerService() {
		if (!this.player) {
			this.player = this.registry.subscribe('player');
		}

		return this.player;
	}

	registerObjectType() {
		this.objectTypes.registerType('music-object', {
			blotName: KEYBOARD_EMBED_BLOT,
			changeEventName: 'music-keyboard-change',
			clipboardMatchers: getKeyboardEmbedClipboardMatchers(),
			removeEventName: 'music-keyboard-remove',
			configureContext: configureKeyboardEmbedContext,
			createDefaultObject: (options = {}) => {
				const displayMode = options.displayMode === 'staff' ? 'staff' : 'keyboard';

				return {
					type: 'music-object',
					data: {
						...DEFAULT_KEYBOARD_PAYLOAD,
						chordId: '',
						displayMode,
						displayKey: 'C',
						height: displayMode === 'staff' ? 266 : DEFAULT_KEYBOARD_PAYLOAD.height,
						initialEditMode: 'none',
						label: 'C major key',
						notes: [],
						openEditor: true,
						rootNote: '',
					},
				};
			},
			toEmbedValue: (object) => ({
				...(object.data || {}),
				id: object.id,
			}),
			fromEmbedValue: (value) => ({
				type: 'music-object',
				data: value,
			}),
		});
	}

	registerToolbarIcons() {
		this.iconRegistry.registerIcon('music-object.insert.keyboard', IconPiano, 'default', 'editor.insert_keyboard_object');
		this.iconRegistry.registerIcon('music-object.insert.staff', IconClefStaff, 'default', 'editor.insert_staff_object');
		this.iconRegistry.registerIcon('music-object.play', PlayArrowIcon, 'default', 'music.controls.play');
		this.iconRegistry.registerIcon('music-object.stop', StopIcon, 'default', 'music.controls.stop');
		this.iconRegistry.registerIcon('music-object.edit', EditIcon, 'default', 'music.controls.edit');
		this.iconRegistry.registerIcon('music-object.format', TuneIcon, 'default', 'music.controls.format');
	}

	registerToolbarItems() {
		this.editorToolbar.addItem(EDITOR_TOOLBAR_SECTIONS.INSERT, 100, 'music-object.insert.keyboard', 'editor.insert_keyboard_object', 'music-object.insert.keyboard', {
			commandId: 'music-object.insert',
			commandPayload: { displayMode: 'keyboard' },
			ownerFeature: 'music-object',
		});
		this.editorToolbar.addItem(EDITOR_TOOLBAR_SECTIONS.INSERT, 200, 'music-object.insert.staff', 'editor.insert_staff_object', 'music-object.insert.staff', {
			commandId: 'music-object.insert',
			commandPayload: { displayMode: 'staff' },
			ownerFeature: 'music-object',
		});
	}

	onToolbarItemSelected(event) {
		const commandId = event?.item?.commandId || event?.item?.id;

		if (commandId === 'music-object.insert') {
			this.insertMusicObject(event.item.commandPayload || {});
		}
	}

	insertMusicObject(options = {}) {
		const definition = this.objectTypes.getType('music-object');
		const partialObject = definition?.createDefaultObject?.(options) || { type: 'music-object', data: {} };
		const object = this.documentModel.createObject(
			'music-object',
			partialObject.data || {},
			partialObject,
		);

		this.editorSurface.insertObject(object);
		return object;
	}
}

new MusicObjectController();
