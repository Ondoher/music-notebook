import { Registry, Service } from '@polylith/core';
import DocumentModelService from '../../../models/document-model.js';
import EditorSurfaceService from '../../editor/services/editor-surface.js';
import EditorToolbarService from '../../editor/services/editor-toolbar.js';
import ActionRegistryService from '../../../services/action-registry.js';
import ObjectTypeRegistryService from '../../../services/object-type-registry.js';
import MusicObjectController from '../controller.js';

describe('MusicObjectController', function() {
	it('adds registered action components to embed session actions', function() {
		function TestIcon() {
			return null;
		}
		const {
			controller,
			actionRegistry,
		} = makeController();

		actionRegistry.registerAction('music-object.play', TestIcon, 'default', 'music.controls.play');

		const session = controller.attachEmbed({
			getValue: () => ({
				id: 'music-object-session-icons-spec',
				notes: ['C4'],
			}),
		});
		const playbackAction = session.getState().actions.find((action) => action.id === 'playback');

		expect(playbackAction.iconComponent).toBe(TestIcon);
	});

	it('creates controller-owned embed sessions that route playback through the player service', async function() {
		const {
			controller,
			player,
		} = makeController();
		const session = controller.attachEmbed({
			getValue: () => ({
				id: 'music-object-session-spec',
				notes: ['C4', 'E4', 'G4'],
			}),
		});

		await session.togglePlayback();

		expect(player.playedPayloads).toEqual([
			jasmine.objectContaining({
				id: 'music-object-session-spec',
			}),
		]);
		expect(session.getState().playbackState).toBe('playing');

		await session.togglePlayback();

		expect(player.stopCount).toBe(1);
		expect(session.getState().playbackState).toBe('idle');
	});
});

class PlayerMock extends Service {
	constructor(registry) {
		super('player', registry);
		this.implement(['play', 'stop']);
		this.playedPayloads = [];
		this.stopCount = 0;
	}

	play(payload) {
		this.playedPayloads.push(payload);

		return Promise.resolve({ duration: 0 });
	}

	stop() {
		this.stopCount += 1;
	}
}

function makeController() {
	const registry = new Registry();
	const documentModel = new DocumentModelService(registry);
	const editorSurface = new EditorSurfaceService(registry);
	const editorToolbar = new EditorToolbarService(registry);
	const actionRegistry = new ActionRegistryService(registry);
	const objectTypes = new ObjectTypeRegistryService(registry);
	const player = new PlayerMock(registry);
	const controller = new MusicObjectController(registry);

	documentModel.start();
	editorSurface.start();
	editorToolbar.start();
	actionRegistry.start();
	objectTypes.start();
	controller.ready();

	return {
		controller,
		actionRegistry,
		player,
	};
}
