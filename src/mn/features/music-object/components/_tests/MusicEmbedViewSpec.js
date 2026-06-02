/* global describe it expect */

import MusicEmbedView from '../MusicEmbedView.jsx';
import { DEFAULT_KEYBOARD_PAYLOAD } from '../../quill/keyboard-embed.js';
import { getKeyboardEmbedHeight } from '../../../../shared/music-object-layout.js';

describe('MusicEmbedView', function() {
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
});
