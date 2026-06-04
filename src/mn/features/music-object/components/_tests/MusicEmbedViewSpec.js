/* global describe it expect */

import MusicEmbedView from '../MusicEmbedView.jsx';
import { DEFAULT_KEYBOARD_PAYLOAD } from '../../quill/keyboard-embed.js';
import { getKeyboardEmbedHeight } from '../../../../shared/music-object-layout.js';
import { createTestHarness } from '../../../../testing/TestHarness.js';

describe('MusicEmbedView', function() {
	let harness;

	afterEach(function() {
		harness?.unmount();
		harness = null;
	});

	it('keeps keyboard table-cell sizing at the piano aspect ratio', function() {
		const view = new MusicEmbedView({
			payload: {
				...DEFAULT_KEYBOARD_PAYLOAD,
				height: 120,
				width: 900,
			},
		});
		const cell = document.createElement('div');
		const embed = document.createElement('span');
		const content = document.createElement('div');

		cell.className = 'ql-table-cell-inner';
		embed.className = 'music-keyboard-embed';
		embed.appendChild(content);
		cell.appendChild(embed);
		cell.getBoundingClientRect = () => ({
			width: 240,
		});
		view.contentRef.current = content;
		view.state.fitPreviewWidth = true;

		view.syncEmbedNodeSize();

		expect(embed.style.getPropertyValue('--music-embed-width')).toBe('240px');
		expect(embed.style.getPropertyValue('--music-embed-height')).toBe(`${getKeyboardEmbedHeight(view.state.currentPayload, 240)}px`);
		expect(embed.style.getPropertyValue('--music-embedded-layout-width')).toBe('240px');
		expect(embed.style.getPropertyValue('--music-embedded-layout-height')).toBe(`${getKeyboardEmbedHeight(view.state.currentPayload, 240)}px`);
	});

	it('renders a non-interactive preview with an error marker when the controller session is unavailable', function() {
		spyOn(console, 'error');

		harness = createTestHarness();

		const result = harness.render(MusicEmbedView, {
			payload: {
				...DEFAULT_KEYBOARD_PAYLOAD,
				id: 'missing-session-preview-spec',
				label: 'C major',
				notes: ['C4', 'E4', 'G4'],
			},
		});

		const errorMarker = result.container.querySelector('.music-embed-session-error');

		expect(result.container.querySelector('.ReactPiano__Keyboard')).toBeTruthy();
		expect(errorMarker).toBeTruthy();
		expect(errorMarker.getAttribute('aria-label')).toBe('Error loading object');
		expect(errorMarker.getAttribute('tabindex')).toBe('0');
		expect(result.container.querySelector('.music-embed-toolbar')).toBeFalsy();
		expect(result.container.querySelector('.music-embed-resize-handle')).toBeFalsy();
		expect(console.error).toHaveBeenCalledWith(
			'MusicEmbedView could not attach music-object-controller session. Rendering preview without interactive controls.',
		);
	});
});
