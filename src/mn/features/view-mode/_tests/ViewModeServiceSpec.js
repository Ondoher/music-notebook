import { Registry } from '@polylith/core';
import PagedViewPreview from '../components/PagedViewPreview.jsx';
import ViewModeService from '../view-mode.js';

describe('ViewModeService', function() {
	function createService() {
		const registry = new Registry();
		const service = new ViewModeService(registry);

		service.start();
		return service;
	}

	it('prepares a filtered paged clone without mutating the live editor root', function() {
		const service = createService();
		const editor = document.createElement('div');
		const payload = {
			id: 'paged-keyboard',
			label: 'Paged keyboard',
			notes: ['C4', 'E4', 'G4'],
			width: 300,
		};

		editor.className = 'ql-editor';
		editor.innerHTML = `
			<p>
				<span>Before</span>
				<div class="music-keyboard-embed" data-keyboard-payload='${JSON.stringify(payload)}'>
					&#xFEFF;
					<div class="music-keyboard-embed-content">
						<div class="music-embed-toolbar"></div>
						<div class="music-keyboard-embed-piano" style="height: 164px;">
							<div class="ReactPiano__Keyboard" style="width: 300px; height: 164px;">
								<div class="ReactPiano__Key" style="left: 0%; width: 12.5%;"></div>
							</div>
						</div>
						<button class="music-embed-resize-handle" type="button"></button>
					</div>
					&#xFEFF;
				</div>
			</p>
		`;

		const prepared = service.preparePagedContent({ contentRoot: editor });
		const preparedEmbed = prepared.querySelector('.music-keyboard-embed');
		const preparedContent = prepared.querySelector('.music-keyboard-embed-content');

		expect(prepared).not.toBe(editor);
		expect(prepared.getAttribute('data-mn-view-mode-source')).toBe('live-clone');
		expect(prepared.querySelector('.music-embed-toolbar')).toBeFalsy();
		expect(prepared.querySelector('.music-embed-resize-handle')).toBeFalsy();
		expect(preparedEmbed.getAttribute('data-mn-paged-music-embed')).toBe('true');
		expect(preparedEmbed.textContent).not.toContain('\uFEFF');
		expect(preparedEmbed.tagName.toLowerCase()).toBe('span');
		expect(preparedContent.tagName.toLowerCase()).toBe('span');
		expect(preparedEmbed.querySelector('div')).toBeFalsy();
		expect(preparedEmbed.querySelector('.ReactPiano__Keyboard').tagName.toLowerCase()).toBe('span');
		expect(preparedEmbed.querySelector('.ReactPiano__Keyboard').style.display).toBe('var(--mn-paged-display, flex)');
		expect(preparedEmbed.querySelector('.ReactPiano__Key').style.display).toBe('var(--mn-paged-display, flex)');
		expect(preparedEmbed.style.getPropertyValue('--music-embed-width')).toBe('300px');
		expect(preparedEmbed.style.display).toBe('var(--mn-paged-display, inline-block)');
		expect(preparedContent.style.getPropertyValue('--music-embed-width')).toBe('300px');
		Array.from(preparedEmbed.querySelectorAll('[style]')).forEach((element) => {
			expect(element.style.display).not.toBe('');
		});
		expect(editor.querySelector('.music-embed-toolbar')).toBeTruthy();
		expect(editor.querySelector('.music-embed-resize-handle')).toBeTruthy();
	});

	it('falls back to HTML when no live content root is available', function() {
		const service = createService();
		const prepared = service.preparePagedContent({
			contentHtml: '<p>Fallback</p>',
			ownerDocument: document,
		});

		expect(prepared.classList.contains('ql-editor')).toBeTrue();
		expect(prepared.getAttribute('data-mn-view-mode-source')).toBe('html');
		expect(prepared.textContent).toContain('Fallback');
	});

	it('keeps multiple music embeds in the same paged paragraph', function() {
		const service = createService();
		const editor = document.createElement('div');
		const paragraph = document.createElement('p');
		const payload = {
			notes: ['C4'],
			width: 260,
		};
		const before = document.createElement('span');
		const after = document.createElement('span');

		editor.className = 'ql-editor';
		paragraph.className = 'ql-paragraph-style-normal';
		before.textContent = 'Before';
		after.textContent = 'After';
		paragraph.appendChild(before);
		paragraph.appendChild(createMusicEmbedElement(payload));
		paragraph.appendChild(createMusicEmbedElement(payload));
		paragraph.appendChild(after);
		editor.appendChild(paragraph);

		const prepared = service.preparePagedContent({ contentRoot: editor });
		const paragraphs = Array.from(prepared.querySelectorAll('p'));

		expect(paragraphs.length).toBe(1);
		expect(paragraphs[0].classList.contains('mn-paged-music-row')).toBeFalse();
		expect(paragraphs[0].querySelectorAll('.music-keyboard-embed').length).toBe(2);
		expect(paragraphs[0].textContent).toContain('Before');
		expect(paragraphs[0].textContent).toContain('After');
		expect(paragraphs.every((paragraph) => paragraph.classList.contains('ql-paragraph-style-normal'))).toBeTrue();
	});

	it('groups long music embed runs into paged visual rows', function() {
		const service = createService();
		const editor = document.createElement('div');
		const paragraph = document.createElement('p');
		const payload = {
			notes: ['C4'],
			width: 260,
		};

		editor.className = 'ql-editor';
		paragraph.className = 'ql-paragraph-style-normal';
		for (let index = 0; index < 5; index += 1) {
			paragraph.appendChild(createMusicEmbedElement(payload));
		}
		editor.appendChild(paragraph);

		const prepared = service.preparePagedContent({
			availableWidth: 600,
			contentRoot: editor,
		});
		const paragraphs = Array.from(prepared.querySelectorAll('p'));

		expect(paragraphs.length).toBe(3);
		expect(paragraphs.map((row) => row.querySelectorAll('.music-keyboard-embed').length)).toEqual([2, 2, 1]);
		expect(paragraphs.every((row) => row.classList.contains('mn-paged-music-row'))).toBeTrue();
		expect(paragraphs.every((row) => row.classList.contains('ql-paragraph-style-normal'))).toBeTrue();
	});

	it('leaves the paged preview on the fallback clone path', function() {
		const editor = document.createElement('div');
		const viewMode = {
			preparePagedContent() {
				throw new Error('filter should be unplugged');
			},
		};
		const preview = new PagedViewPreview({
			contentRoot: editor,
			viewMode,
		});
		const content = preview.createPreviewContent();
		const prepared = content.querySelector('.ql-editor');

		expect(prepared).not.toBe(editor);
		expect(prepared.classList.contains('ql-editor')).toBeTrue();
	});
});

function createMusicEmbedElement(payload) {
	const embed = document.createElement('div');
	const content = document.createElement('div');

	embed.className = 'music-keyboard-embed';
	embed.dataset.keyboardPayload = JSON.stringify(payload);
	content.className = 'music-keyboard-embed-content';
	embed.appendChild(content);
	return embed;
}
