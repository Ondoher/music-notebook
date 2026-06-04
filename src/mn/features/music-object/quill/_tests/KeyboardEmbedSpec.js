import Quill from 'quill';
import React from 'react';
import { act } from 'react';
import { buildMusicXml, getPayloadKeyFifths, getStaffNotes } from '../../../../shared/music_helper.js';
import {
	configureKeyboardEmbedContext,
	getKeyboardEmbedClipboardMatchers,
	KEYBOARD_EMBED_BLOT,
	registerKeyboardEmbed,
} from '../keyboard-embed.js';

describe('KeyboardEmbed', function() {
	let container;
	let quill;

	beforeEach(function() {
		registerKeyboardEmbed();
		container = document.createElement('div');
		document.body.appendChild(container);
		quill = new Quill(container);
	});

	afterEach(function() {
		configureKeyboardEmbedContext(null);
		container.remove();
		container = null;
		quill = null;
	});

	it('round-trips structured keyboard payload through the Quill delta', function() {
		const payload = {
			id: 'keyboard-spec',
			label: 'C major',
			notes: ['C4', 'E4', 'G4'],
		};

		act(() => {
			quill.setContents([
				{ insert: 'Before\n' },
				{ insert: { [KEYBOARD_EMBED_BLOT]: payload } },
				{ insert: '\nAfter\n' },
			]);
		});

		const embed = container.querySelector('.music-keyboard-embed');
		const piano = container.querySelector('.ReactPiano__Keyboard');
		const highlightedPiano = container.querySelector('.music-keyboard-embed-has-highlights');
		const highlightedKeys = container.querySelectorAll('.music-keyboard-key-highlighted');
		const rootKeys = container.querySelectorAll('.music-keyboard-key-root');
		const contents = quill.getContents();
		const keyboardOperation = contents.ops.find((operation) => operation.insert?.[KEYBOARD_EMBED_BLOT]);

		expect(embed).toBeTruthy();
		expect(piano).toBeTruthy();
		expect(highlightedPiano).toBeTruthy();
		expect(highlightedKeys.length).toBe(3);
		expect(rootKeys.length).toBe(1);
		expect(embed.getAttribute('aria-label')).toBe('Music object: C major');
		expect(embed.style.getPropertyValue('--music-embed-width')).toBe('456px');
		expect(embed.style.getPropertyValue('--music-embed-height')).toBe('204px');
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT]).toEqual({
			...payload,
			displayMode: 'keyboard',
			height: 204,
			staffOctave: 4,
			width: 456,
		});
	});

	it('renders the music object as a non-editable inline blot', function() {
		act(() => {
			quill.setContents([
				{ insert: { [KEYBOARD_EMBED_BLOT]: { id: 'keyboard-valid-html-spec' } } },
				{ insert: '\n' },
			]);
		});

		const embed = container.querySelector('.music-keyboard-embed');

		expect(embed.tagName).toBe('SPAN');
		expect(embed.getAttribute('contenteditable')).toBe('false');
		expect(embed.querySelector('.music-keyboard-embed-content')).toBeTruthy();
	});

	it('pastes copied music object HTML as one embed without rendered control text', function() {
		const pasteContainer = document.createElement('div');
		const embed = document.createElement('span');
		const payload = {
			caption: { template: '{{short}}' },
			id: 'keyboard-paste-embed-spec',
			label: 'Degree 3: F#m',
			notes: ['F#4', 'A4', 'C#5'],
		};

		embed.className = 'music-keyboard-embed';
		embed.dataset.keyboardPayload = JSON.stringify(payload);
		embed.innerHTML = [
			'<span>Play</span>',
			'<span>Edit</span>',
			'<span>Format</span>',
			'<div class="music-embed-caption">Degree 3: F#m</div>',
			'<button>Resize music object</button>',
		].join('');
		pasteContainer.appendChild(embed);

		const clipboardQuill = new Quill(document.createElement('div'), {
			modules: {
				clipboard: {
					matchers: getKeyboardEmbedClipboardMatchers(),
				},
			},
		});
		const delta = clipboardQuill.clipboard.convert({
			html: pasteContainer.innerHTML,
			text: pasteContainer.textContent,
		});
		const serializedDelta = JSON.stringify(delta.ops);

		expect(delta.ops).toEqual([
			{
				insert: {
					[KEYBOARD_EMBED_BLOT]: jasmine.objectContaining({
						id: 'keyboard-paste-embed-spec',
						label: 'Degree 3: F#m',
					}),
				},
			},
		]);
		expect(serializedDelta).not.toContain('Play');
		expect(serializedDelta).not.toContain('Edit');
		expect(serializedDelta).not.toContain('Format');
		expect(serializedDelta).not.toContain('Resize music object');
	});

	it('copies music object semantic HTML without rendered control text', function() {
		act(() => {
			quill.setContents([
				{
					insert: {
						[KEYBOARD_EMBED_BLOT]: {
							caption: { template: '{{short}}' },
							id: 'keyboard-copy-embed-spec',
							label: 'Degree 3: F#m',
							notes: ['F#4', 'A4', 'C#5'],
						},
					},
				},
				{ insert: '\n' },
			]);
		});

		const html = quill.getSemanticHTML(0, 1);

		expect(html).toContain('music-keyboard-embed');
		expect(html).toContain('keyboard-copy-embed-spec');
		expect(html).not.toContain('Play');
		expect(html).not.toContain('Edit');
		expect(html).not.toContain('Format');
		expect(html).not.toContain('Resize music object');
		expect(html).not.toContain('class="music-embed-caption');
	});

	it('renders context-aware caption fields for chords and scales', function() {
		act(() => {
			quill.setContents([
				{
					insert: {
						[KEYBOARD_EMBED_BLOT]: {
							caption: { template: '{{short}} / {{long}} / {{key}}' },
							chordId: 'typed:Dm:inv0',
							displayKey: 'C',
							displayKeyMode: 'minor',
							id: 'keyboard-chord-caption-spec',
							label: 'D minor',
							notes: ['D4', 'F4', 'A4'],
							sourceChordSymbol: 'Dm',
						},
					},
				},
				{ insert: '\n' },
				{
					insert: {
						[KEYBOARD_EMBED_BLOT]: {
							caption: { template: '{{short}} / {{long}} / {{key}}' },
							displayKey: 'D',
							displayKeyMode: 'dorian',
							id: 'keyboard-scale-caption-spec',
							label: 'D dorian',
							notes: ['D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'],
							scaleId: 'typed:D dorian',
						},
					},
				},
				{ insert: '\n' },
			]);
		});

		const captions = Array.from(container.querySelectorAll('.music-embed-caption'))
			.map((caption) => caption.textContent);
		const embeds = Array.from(container.querySelectorAll('.music-keyboard-embed'));
		const contents = quill.getContents();
		const keyboardOperations = contents.ops
			.filter((operation) => operation.insert?.[KEYBOARD_EMBED_BLOT])
			.map((operation) => operation.insert[KEYBOARD_EMBED_BLOT]);

		expect(captions).toEqual(['Dm / D minor / C minor', 'D dorian / D dorian / D dorian']);
		expect(embeds.map((embed) => embed.style.getPropertyValue('--music-embed-height'))).toEqual(['230px', '230px']);
		expect(embeds.map((embed) => embed.style.getPropertyValue('--music-embed-caption-height'))).toEqual(['26px', '26px']);
		expect(keyboardOperations.map((payload) => payload.height)).toEqual([230, 230]);
	});

	it('resizes the visible embed when a draft caption is entered', function() {
		const payload = {
			id: 'keyboard-draft-caption-size-spec',
			label: 'C major',
			notes: ['C4', 'E4', 'G4'],
		};

		act(() => {
			quill.setContents([
				{ insert: { [KEYBOARD_EMBED_BLOT]: payload } },
				{ insert: '\n' },
			]);
			quill.history.clear();
		});

		const embed = container.querySelector('.music-keyboard-embed');
		const editButton = container.querySelector('.music-keyboard-edit-button');

		expect(embed.style.getPropertyValue('--music-embed-height')).toBe('204px');

		act(() => {
			editButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});

		const dialog = getLatestDialog();
		const captionInput = dialog.querySelector('.music-embed-caption-template textarea');

		act(() => {
			setInputValue(captionInput, 'Caption');
			captionInput.dispatchEvent(new Event('input', { bubbles: true }));
		});

		let keyboardOperation = quill.getContents().ops.find((operation) => operation.insert?.[KEYBOARD_EMBED_BLOT]);

		expect(embed.style.getPropertyValue('--music-embed-height')).toBe('204px');
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].height).toBe(204);
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].caption).toBeUndefined();

		cancelOpenDialog();

		keyboardOperation = quill.getContents().ops.find((operation) => operation.insert?.[KEYBOARD_EMBED_BLOT]);

		expect(embed.style.getPropertyValue('--music-embed-height')).toBe('204px');
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].height).toBe(204);
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].caption).toBeUndefined();
	});

	it('renders persisted music embed format settings', function() {
		const payload = {
			id: 'keyboard-format-render-spec',
			caption: { template: 'Caption' },
			format: {
				alignment: 'center',
				caption: {
					alignment: 'right',
					bold: true,
					fontSize: 18,
					italic: true,
					underline: true,
				},
			},
			label: 'C major',
			notes: ['C4', 'E4', 'G4'],
		};

		act(() => {
			quill.setContents([
				{ insert: { [KEYBOARD_EMBED_BLOT]: payload } },
				{ insert: '\n' },
			]);
			quill.history.clear();
		});

		const embed = container.querySelector('.music-keyboard-embed');
		const caption = container.querySelector('.music-embed-caption');
		const keyboardOperation = quill.getContents().ops.find((operation) => operation.insert?.[KEYBOARD_EMBED_BLOT]);

		expect(embed.classList.contains('music-keyboard-embed--align-center')).toBe(true);
		expect(caption.textContent).toBe('Caption');
		expect(caption.style.fontSize).toBe('18px');
		expect(caption.style.fontStyle).toBe('italic');
		expect(caption.style.fontWeight).toBe('700');
		expect(caption.style.textAlign).toBe('right');
		expect(caption.style.textDecoration).toBe('underline');
		expect(embed.style.getPropertyValue('--music-embed-height')).toBe('238px');
		expect(embed.style.getPropertyValue('--music-embed-caption-height')).toBe('34px');
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].height).toBe(238);
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].format).toEqual(payload.format);
	});

	it('drafts and commits music embed format settings from the format dialog', function() {
		const payload = {
			id: 'keyboard-format-dialog-spec',
			caption: { template: 'Caption' },
			label: 'C major',
			notes: ['C4', 'E4', 'G4'],
		};

		act(() => {
			quill.setContents([
				{ insert: { [KEYBOARD_EMBED_BLOT]: payload } },
				{ insert: '\n' },
			]);
			quill.history.clear();
		});

		const embed = container.querySelector('.music-keyboard-embed');
		const formatButton = container.querySelector('.music-keyboard-format-button');

		act(() => {
			formatButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});

		const dialog = getLatestDialog();
		const fontSizeInput = dialog.querySelector('.music-embed-format-dialog__font-size input');
		const boldButton = dialog.querySelector('[aria-label="Bold"]');
		const captionRightButton = dialog.querySelector('[aria-label="Align caption right"]');
		const centerButton = dialog.querySelector('[aria-label="Center"]');

		act(() => {
			centerButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});

		act(() => {
			setInputValue(fontSizeInput, '16');
			fontSizeInput.dispatchEvent(new Event('input', { bubbles: true }));
		});

		act(() => {
			boldButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});

		act(() => {
			captionRightButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});

		let caption = container.querySelector('.music-embed-caption');
		let keyboardOperation = quill.getContents().ops.find((operation) => operation.insert?.[KEYBOARD_EMBED_BLOT]);

		expect(embed.classList.contains('music-keyboard-embed--align-center')).toBe(true);
		expect(embed.style.getPropertyValue('--music-embed-height')).toBe('230px');
		expect(caption.style.fontSize).toBe('16px');
		expect(caption.style.fontWeight).toBe('700');
		expect(caption.style.textAlign).toBe('right');
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].format).toBeUndefined();

		closeOpenDialog();

		caption = container.querySelector('.music-embed-caption');
		keyboardOperation = quill.getContents().ops.find((operation) => operation.insert?.[KEYBOARD_EMBED_BLOT]);

		expect(embed.classList.contains('music-keyboard-embed--align-center')).toBe(true);
		expect(embed.style.getPropertyValue('--music-embed-height')).toBe('230px');
		expect(caption.style.fontSize).toBe('16px');
		expect(caption.style.fontWeight).toBe('700');
		expect(caption.style.textAlign).toBe('right');
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].height).toBe(230);
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].format).toEqual({
			alignment: 'center',
			caption: {
				alignment: 'right',
				bold: true,
				fontSize: 16,
				italic: false,
				underline: false,
			},
		});

		act(() => {
			quill.history.undo();
		});

		keyboardOperation = quill.getContents().ops.find((operation) => operation.insert?.[KEYBOARD_EMBED_BLOT]);
		caption = container.querySelector('.music-embed-caption');

		expect(caption.style.fontSize).not.toBe('16px');
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].format).toBeUndefined();
	});

	it('marks highlighted accidentals by note spelling', function() {
		const payload = {
			id: 'keyboard-accidental-spec',
			label: 'D major',
			notes: ['D4', 'F#4', 'A4'],
		};

		act(() => {
			quill.setContents([
				{ insert: { [KEYBOARD_EMBED_BLOT]: payload } },
				{ insert: '\n' },
			]);
		});

		const accidentalMarker = container.querySelector('.music-keyboard-key-highlighted .music-keyboard-accidental-marker');
		const contents = quill.getContents();
		const keyboardOperation = contents.ops.find((operation) => operation.insert?.[KEYBOARD_EMBED_BLOT]);

		expect(accidentalMarker).toBeTruthy();
		expect(accidentalMarker.textContent).toBe('F\u266f');
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT]).toEqual({
			...payload,
			displayMode: 'keyboard',
			height: 204,
			staffOctave: 4,
			width: 456,
		});
	});

	it('renders a localized focusable resize handle', function() {
		const payload = {
			id: 'keyboard-resize-handle-spec',
			label: 'C major',
			notes: ['C4', 'E4', 'G4'],
		};

		act(() => {
			quill.setContents([
				{ insert: { [KEYBOARD_EMBED_BLOT]: payload } },
				{ insert: '\n' },
			]);
		});

		const resizeHandle = container.querySelector('.music-embed-resize-handle');

		expect(resizeHandle).toBeTruthy();
		expect(resizeHandle.tagName).toBe('BUTTON');
		expect(resizeHandle.type).toBe('button');
		expect(resizeHandle.textContent).toBe('Resize music object');
	});

	it('renders a localized playback control', function() {
		const payload = {
			id: 'keyboard-playback-button-spec',
			label: 'C major',
			notes: ['C4', 'E4', 'G4'],
		};

		act(() => {
			quill.setContents([
				{ insert: { [KEYBOARD_EMBED_BLOT]: payload } },
				{ insert: '\n' },
			]);
		});

		const playButton = container.querySelector('.music-keyboard-play-button');

		expect(playButton).toBeTruthy();
		expect(playButton.tagName).toBe('BUTTON');
		expect(playButton.type).toBe('button');
		expect(playButton.textContent).toBe('Play');
	});

	it('omits playback for none content', function() {
		const payload = {
			id: 'keyboard-none-content-toolbar-spec',
			displayKey: 'C',
			label: 'C major key',
			notes: [],
		};

		act(() => {
			quill.setContents([
				{ insert: { [KEYBOARD_EMBED_BLOT]: payload } },
				{ insert: '\n' },
			]);
		});

		const playButton = container.querySelector('.music-keyboard-play-button');
		const editButton = container.querySelector('.music-keyboard-edit-button');
		const formatButton = container.querySelector('.music-keyboard-format-button');

		expect(playButton).toBeFalsy();
		expect(editButton).toBeTruthy();
		expect(formatButton).toBeTruthy();
	});

	it('renders hover toolbar icons from the icon registry', function() {
		function TestIcon() {
			return <svg viewBox="0 0 18 18"><path d="M1 1h16v16H1z" /></svg>;
		}

		configureKeyboardEmbedContext({
			localize: {
				translate(phrase) {
					return phrase;
				},
			},
			registry: {
				subscribe(serviceName) {
					if (serviceName === 'music-object-controller') {
						return makeMusicObjectControllerMock();
					}

					if (serviceName === 'icon-registry') {
						return {
							getIcon() {
								return TestIcon;
							},
						};
					}

					return null;
				},
			},
		});

		act(() => {
			quill.setContents([
				{ insert: { [KEYBOARD_EMBED_BLOT]: { id: 'keyboard-toolbar-icons-spec' } } },
				{ insert: '\n' },
			]);
		});

		const toolbarButtons = container.querySelectorAll('.music-embed-toolbar button');

		expect(toolbarButtons.length).toBe(3);
		expect(Array.from(toolbarButtons).every((button) => button.querySelector('svg'))).toBe(true);
	});

	it('updates localized embed controls when the watched locale changes', function() {
		let locale = 'en-US-u-ms-ussystem';
		const appData = makeAppDataMock({ locale });
		const localize = {
			getLocale() {
				return locale;
			},
			translate(phrase) {
				if (phrase === 'music.controls.play') {
					return locale === 'es-ES' ? 'Reproducir' : 'Play';
				}

				if (phrase === 'music.controls.resize_object') {
					return locale === 'es-ES' ? 'Cambiar tamano' : 'Resize music object';
				}

				return phrase;
			},
		};

		configureKeyboardEmbedContext({
			app: { id: 'mn' },
			appData,
			localize,
			locale,
			registry: {
				subscribe(serviceName) {
					if (serviceName === 'app-data') {
						return appData;
					}

					if (serviceName === 'music-object-controller') {
						return makeMusicObjectControllerMock();
					}

					return localize;
				},
			},
		});

		act(() => {
			quill.setContents([
				{
					insert: {
						[KEYBOARD_EMBED_BLOT]: {
							id: 'keyboard-locale-watch-spec',
							label: 'C major',
							notes: ['C4', 'E4', 'G4'],
						},
					},
				},
				{ insert: '\n' },
			]);
		});

		expect(container.querySelector('.music-keyboard-play-button').textContent).toBe('Play');

		act(() => {
			locale = 'es-ES';
			appData.update('locale', locale);
		});

		expect(container.querySelector('.music-keyboard-play-button').textContent).toBe('Reproducir');
		expect(container.querySelector('.music-embed-resize-handle').textContent).toBe('Cambiar tamano');
	});

	it('persists embed scale from the resize handle pointer drag', function() {
		const payload = {
			id: 'keyboard-resize-pointer-spec',
			label: 'C major',
			notes: ['C4', 'E4', 'G4'],
			width: 300,
			height: 220,
		};

		act(() => {
			quill.setContents([
				{ insert: { [KEYBOARD_EMBED_BLOT]: payload } },
				{ insert: '\n' },
			]);
		});

		const embed = container.querySelector('.music-keyboard-embed');
		const resizeHandle = container.querySelector('.music-embed-resize-handle');

		act(() => {
			dispatchPointerEvent(resizeHandle, 'pointerdown', { clientX: 10, clientY: 20, pointerId: 1 });
			dispatchPointerEvent(document, 'pointermove', { clientX: 55, clientY: 50, pointerId: 1 });
			dispatchPointerEvent(document, 'pointerup', { clientX: 55, clientY: 50, pointerId: 1 });
		});

		const contents = quill.getContents();
		const keyboardOperation = contents.ops.find((operation) => operation.insert?.[KEYBOARD_EMBED_BLOT]);

		expect(embed.style.getPropertyValue('--music-embed-width')).toBe('300px');
		expect(embed.style.getPropertyValue('--music-embed-height')).toBe('220px');
		expect(embed.style.getPropertyValue('--music-embedded-layout-width')).toBe('345px');
		expect(embed.style.getPropertyValue('--music-embedded-layout-height')).toBe('253px');
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].width).toBe(300);
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].height).toBe(220);
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].scale).toBe(1.15);
	});

	it('records pointer resize as one undoable Quill edit', function() {
		const payload = {
			id: 'keyboard-resize-undo-spec',
			label: 'C major',
			notes: ['C4', 'E4', 'G4'],
			width: 300,
			height: 220,
		};

		act(() => {
			quill.setContents([
				{ insert: { [KEYBOARD_EMBED_BLOT]: payload } },
				{ insert: '\n' },
			]);
			quill.history.clear();
		});

		let resizeHandle = container.querySelector('.music-embed-resize-handle');

		act(() => {
			dispatchPointerEvent(resizeHandle, 'pointerdown', { clientX: 10, clientY: 20, pointerId: 1 });
			dispatchPointerEvent(document, 'pointermove', { clientX: 55, clientY: 50, pointerId: 1 });
			dispatchPointerEvent(document, 'pointerup', { clientX: 55, clientY: 50, pointerId: 1 });
		});

		let keyboardOperation = quill.getContents().ops.find((operation) => operation.insert?.[KEYBOARD_EMBED_BLOT]);

		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].scale).toBe(1.15);

		act(() => {
			quill.history.undo();
		});

		keyboardOperation = quill.getContents().ops.find((operation) => operation.insert?.[KEYBOARD_EMBED_BLOT]);
		resizeHandle = container.querySelector('.music-embed-resize-handle');

		expect(resizeHandle).toBeTruthy();
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].scale).toBeUndefined();
	});

	it('allows dense key-signature staff embeds to resize down to the shared minimum width', function() {
		const payload = {
			id: 'keyboard-staff-min-width-spec',
			displayKey: 'C#',
			displayMode: 'staff',
			label: 'C# key',
			notes: [],
			width: 300,
			height: 220,
		};

		act(() => {
			quill.setContents([
				{ insert: { [KEYBOARD_EMBED_BLOT]: payload } },
				{ insert: '\n' },
			]);
		});

		const embed = container.querySelector('.music-keyboard-embed');
		const resizeHandle = container.querySelector('.music-embed-resize-handle');

		act(() => {
			dispatchPointerEvent(resizeHandle, 'pointerdown', { clientX: 300, clientY: 20, pointerId: 1 });
			dispatchPointerEvent(document, 'pointermove', { clientX: 0, clientY: 20, pointerId: 1 });
			dispatchPointerEvent(document, 'pointerup', { clientX: 0, clientY: 20, pointerId: 1 });
		});

		const keyboardOperation = quill.getContents().ops.find((operation) => operation.insert?.[KEYBOARD_EMBED_BLOT]);

		expect(embed.style.getPropertyValue('--music-embed-width')).toBe('300px');
		expect(embed.style.getPropertyValue('--music-embedded-layout-width')).toBe('120px');
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].width).toBe(300);
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].scale).toBe(0.4);
	});

	[
		{ note: 'F#4', marker: 'F\u266f' },
		{ note: 'Bb4', marker: 'B\u266d' },
		{ note: 'E##4', marker: 'E\ud834\udd2a' },
		{ note: 'Cbb5', marker: 'C\ud834\udd2b' },
	].forEach(({ note, marker }) => {
		it(`uses the music accidental label for ${note}`, function() {
			const payload = {
				id: `keyboard-accidental-symbol-${note}`,
				label: 'Accidental',
				notes: [note],
				firstNote: 'c4',
				lastNote: 'b5',
			};

			act(() => {
				quill.setContents([
					{ insert: { [KEYBOARD_EMBED_BLOT]: payload } },
					{ insert: '\n' },
				]);
			});

			const accidentalMarker = container.querySelector(
				'.music-keyboard-key-highlighted .music-keyboard-accidental-marker',
			);

			expect(accidentalMarker).toBeTruthy();
			expect(accidentalMarker.textContent).toBe(marker);
		});
	});

	it('uses spelled labels when accidentals land on natural keys', function() {
		const payload = {
			id: 'keyboard-natural-spelling-spec',
			label: 'C diminished seventh',
			notes: ['C4', 'Eb4', 'Gb4', 'Bbb4'],
			firstNote: 'c4',
			lastNote: 'b4',
		};

		act(() => {
			quill.setContents([
				{ insert: { [KEYBOARD_EMBED_BLOT]: payload } },
				{ insert: '\n' },
			]);
		});

		const spelledLabels = Array.from(container.querySelectorAll(
			'.music-keyboard-key-highlighted .music-keyboard-spelled-label',
		)).map((label) => label.textContent);

		expect(spelledLabels).toContain('B\ud834\udd2b');
	});

	it('updates the embed payload when a chord is typed', function() {
		const payload = {
			id: 'keyboard-picker-spec',
			chordId: 'typed:Cdim7',
			label: 'Cdim7',
			notes: ['C4', 'Eb4', 'Gb4', 'Bbb4'],
		};

		act(() => {
			quill.setContents([
				{ insert: { [KEYBOARD_EMBED_BLOT]: payload } },
				{ insert: '\n' },
			]);
		});

		const editButton = container.querySelector('.music-keyboard-edit-button');

		act(() => {
			editButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});

		const dialog = getLatestDialog();
		const input = dialog.querySelector('.mn-chord-builder input');
		const helper = dialog.querySelector('.mn-chord-builder-helper');

		act(() => {
			setInputValue(input, 'D');
			input.dispatchEvent(new Event('input', { bubbles: true }));
		});

		expect(input).toBeTruthy();
		expect(helper.textContent).toBe('D major');
		expect(input.getAttribute('aria-describedby')).toBe(helper.id);

		closeOpenDialog();

		const contents = quill.getContents();
		const keyboardOperation = contents.ops.find((operation) => operation.insert?.[KEYBOARD_EMBED_BLOT]);

		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].chordId).toBe('typed:D:inv0');
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].label).toBe('D');
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].notes).toEqual(['D4', 'F#4', 'A4']);
	});

	it('removes a newly inserted music object when the first edit dialog is cancelled', async function() {
		const payload = {
			id: 'keyboard-cancel-insert-spec',
			label: 'C major key',
			notes: [],
			openEditor: true,
		};

		act(() => {
			quill.setContents([
				{ insert: { [KEYBOARD_EMBED_BLOT]: payload } },
				{ insert: '\n' },
			]);
		});

		expect(container.querySelector('.music-keyboard-embed')).toBeTruthy();

		cancelOpenDialog();
		await waitForNextTask();

		const contents = quill.getContents();
		const keyboardOperation = contents.ops.find((operation) => operation.insert?.[KEYBOARD_EMBED_BLOT]);

		expect(container.querySelector('.music-keyboard-embed')).toBeFalsy();
		expect(keyboardOperation).toBeUndefined();
	});

	it('restores the previous music object setup when edit is cancelled', function() {
		const payload = {
			id: 'keyboard-cancel-edit-spec',
			chordId: 'typed:Cdim7',
			label: 'Cdim7',
			notes: ['C4', 'Eb4', 'Gb4', 'Bbb4'],
		};

		act(() => {
			quill.setContents([
				{ insert: { [KEYBOARD_EMBED_BLOT]: payload } },
				{ insert: '\n' },
			]);
		});

		const editButton = container.querySelector('.music-keyboard-edit-button');

		act(() => {
			editButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});

		const dialog = getLatestDialog();
		const input = dialog.querySelector('.mn-chord-builder input');

		act(() => {
			setInputValue(input, 'D');
			input.dispatchEvent(new Event('input', { bubbles: true }));
		});

		let keyboardOperation = quill.getContents().ops.find((operation) => operation.insert?.[KEYBOARD_EMBED_BLOT]);

		expect(input.value).toBe('D');
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].label).toBe('Cdim7');

		cancelOpenDialog();

		keyboardOperation = quill.getContents().ops.find((operation) => operation.insert?.[KEYBOARD_EMBED_BLOT]);

		expect(container.querySelector('.music-keyboard-embed')).toBeTruthy();
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].chordId).toBe('typed:Cdim7');
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].label).toBe('Cdim7');
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].notes).toEqual(['C4', 'Eb4', 'Gb4', 'Bbb4']);
	});

	it('updates the embed payload when a chord inversion is selected', function() {
		const payload = {
			id: 'keyboard-inversion-spec',
			chordId: 'typed:Cdim7:inv0',
			inversion: 0,
			label: 'Cdim7',
			notes: ['C4', 'Eb4', 'Gb4', 'Bbb4'],
			rootNote: 'C4',
		};

		act(() => {
			quill.setContents([
				{ insert: { [KEYBOARD_EMBED_BLOT]: payload } },
				{ insert: '\n' },
			]);
		});

		const editButton = container.querySelector('.music-keyboard-edit-button');

		act(() => {
			editButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});

		const dialog = getLatestDialog();
		const inversionSelect = queryCombobox(dialog, '.mn-chord-builder-field');

		act(() => {
			selectValue(inversionSelect, '1');
		});

		closeOpenDialog();

		const contents = quill.getContents();
		const keyboardOperation = contents.ops.find((operation) => operation.insert?.[KEYBOARD_EMBED_BLOT]);

		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].chordId).toBe('typed:Cdim7/Eb:inv1');
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].inversion).toBe(1);
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].rootNote).toBe('C5');
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].notes).toEqual(['Eb4', 'Gb4', 'Bbb4', 'C5']);
	});

	it('shows chord editing controls only in chord edit mode', function() {
		const payload = {
			id: 'keyboard-mode-spec',
			label: 'Cdim7',
			notes: ['C4', 'Eb4', 'Gb4', 'Bbb4'],
		};

		act(() => {
			quill.setContents([
				{ insert: { [KEYBOARD_EMBED_BLOT]: payload } },
				{ insert: '\n' },
			]);
		});

		const editButton = container.querySelector('.music-keyboard-edit-button');

		act(() => {
			editButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});

		const dialog = getLatestDialog();
		const modeSelect = queryCombobox(dialog, '.music-keyboard-edit-mode');

		expect(modeSelect).toBeTruthy();
		expect(dialog.querySelector('.music-display-key-field input')).toBeTruthy();
		expect(dialog.querySelector('.mn-chord-builder input')).toBeTruthy();

		act(() => {
			selectValue(modeSelect, 'scale');
		});

		expect(dialog.querySelector('.mn-chord-builder input')).toBeFalsy();
		expect(dialog.querySelector('.mn-scale-builder')).toBeTruthy();

		closeOpenDialog();

		const contents = quill.getContents();
		const keyboardOperation = contents.ops.find((operation) => operation.insert?.[KEYBOARD_EMBED_BLOT]);

		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].scaleId).toBe('typed:C major');
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].chordId).toBeUndefined();
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].label).toBe('C major');
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].notes).toEqual(['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5']);
	});

	it('updates the embed payload when a chord degree Roman numeral is entered', function() {
		const payload = {
			id: 'keyboard-chord-degree-spec',
			label: 'C major',
			notes: ['C4', 'E4', 'G4'],
		};

		act(() => {
			quill.setContents([
				{ insert: { [KEYBOARD_EMBED_BLOT]: payload } },
				{ insert: '\n' },
			]);
		});

		const editButton = container.querySelector('.music-keyboard-edit-button');

		act(() => {
			editButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});

		const dialog = getLatestDialog();
		const chordInput = dialog.querySelector('.mn-chord-builder-field input');

		act(() => {
			setInputValue(chordInput, 'ii');
			chordInput.dispatchEvent(new Event('input', { bubbles: true }));
		});

		expect(dialog.querySelector('.mn-chord-builder-helper').textContent).toBe('D minor');

		closeOpenDialog();

		const contents = quill.getContents();
		const keyboardOperation = contents.ops.find((operation) => operation.insert?.[KEYBOARD_EMBED_BLOT]);

		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].progressionId).toBe('typed:C:ii');
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].sourceChordSymbol).toBe('Dm');
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].label).toBe('C: ii');
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].notes).toEqual(['D4', 'F4', 'A4']);
	});

	it('opens saved chord degree embeds in chord edit mode', function() {
		const payload = {
			id: 'keyboard-saved-chord-degree-mode-spec',
			displayKey: 'C',
			label: 'C: ii',
			notes: ['D4', 'F4', 'A4'],
			progressionId: 'typed:C:ii',
			progressionInput: 'ii',
			sourceChordSymbol: 'Dm',
		};

		act(() => {
			quill.setContents([
				{ insert: { [KEYBOARD_EMBED_BLOT]: payload } },
				{ insert: '\n' },
			]);
		});

		const editButton = container.querySelector('.music-keyboard-edit-button');

		act(() => {
			editButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});

		const dialog = getLatestDialog();
		const modeSelect = queryCombobox(dialog, '.music-keyboard-edit-mode');
		const chordInput = dialog.querySelector('.mn-chord-builder-field input');

		expect(modeSelect.textContent).toBe('Chord');
		expect(chordInput.value).toBe('ii');
		expect(dialog.querySelector('.mn-chord-builder')).toBeTruthy();
		expect(dialog.querySelector('.mn-progression-builder')).toBeFalsy();
	});

	it('uses minor key mode when a numeric chord degree is entered in chord mode', function() {
		const payload = {
			id: 'keyboard-numeric-chord-spec',
			label: 'C major',
			notes: ['C4', 'E4', 'G4'],
		};

		act(() => {
			quill.setContents([
				{ insert: { [KEYBOARD_EMBED_BLOT]: payload } },
				{ insert: '\n' },
			]);
		});

		const editButton = container.querySelector('.music-keyboard-edit-button');

		act(() => {
			editButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});

		const dialog = getLatestDialog();
		const keyModeSelect = queryCombobox(dialog, '.music-display-key-mode-field');
		const chordInput = dialog.querySelector('.mn-chord-builder-field input');

		act(() => {
			selectValue(keyModeSelect, 'minor');
		});

		act(() => {
			setInputValue(chordInput, '2');
			chordInput.dispatchEvent(new Event('input', { bubbles: true }));
		});

		expect(dialog.querySelector('.mn-chord-builder-helper').textContent).toBe('D diminished');

		closeOpenDialog();

		const contents = quill.getContents();
		const keyboardOperation = contents.ops.find((operation) => operation.insert?.[KEYBOARD_EMBED_BLOT]);

		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].displayKeyMode).toBe('minor');
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].progressionId).toBe('typed:C:ii\u00b0');
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].progressionInput).toBe('2');
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].sourceChordSymbol).toBe('Ddim');
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].label).toBe('C: ii\u00b0');
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].notes).toEqual(['D4', 'F4', 'Ab4']);
	});

	it('allows the shared key field to be cleared while editing chord degrees in chord mode', function() {
		const payload = {
			id: 'keyboard-clear-key-spec',
			label: 'C: I',
			notes: ['C4', 'E4', 'G4'],
		};

		act(() => {
			quill.setContents([
				{ insert: { [KEYBOARD_EMBED_BLOT]: payload } },
				{ insert: '\n' },
			]);
		});

		const editButton = container.querySelector('.music-keyboard-edit-button');

		act(() => {
			editButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});

		const dialog = getLatestDialog();
		const keyInput = dialog.querySelector('.music-display-key-field input');

		act(() => {
			setInputValue(keyInput, '');
			keyInput.dispatchEvent(new Event('input', { bubbles: true }));
		});

		expect(keyInput.value).toBe('');

		closeOpenDialog();
	});

	it('updates the embed payload when a chord degree inversion is selected', function() {
		const payload = {
			id: 'keyboard-degree-inversion-spec',
			label: 'C: I',
			notes: ['C4', 'E4', 'G4'],
		};

		act(() => {
			quill.setContents([
				{ insert: { [KEYBOARD_EMBED_BLOT]: payload } },
				{ insert: '\n' },
			]);
		});

		const editButton = container.querySelector('.music-keyboard-edit-button');

		act(() => {
			editButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});

		const dialog = getLatestDialog();
		const fields = dialog.querySelectorAll('.mn-chord-builder-field');
		const romanInput = fields[0].querySelector('input');
		const inversionSelect = fields[1].querySelector('[role="combobox"]');

		act(() => {
			setInputValue(romanInput, 'V');
			romanInput.dispatchEvent(new Event('input', { bubbles: true }));
		});

		act(() => {
			selectValue(inversionSelect, '2');
		});

		closeOpenDialog();

		const contents = quill.getContents();
		const keyboardOperation = contents.ops.find((operation) => operation.insert?.[KEYBOARD_EMBED_BLOT]);

		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].progressionId).toBe('typed:C:V');
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].sourceChordSymbol).toBe('G');
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].inversion).toBe(2);
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].rootNote).toBe('G4');
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].notes).toEqual(['D4', 'G4', 'B4']);
	});

	it('uses direct chord values after entering a chord degree', function() {
		const payload = {
			id: 'keyboard-degree-to-chord-spec',
			label: 'C: I',
			notes: ['C4', 'E4', 'G4'],
		};

		act(() => {
			quill.setContents([
				{ insert: { [KEYBOARD_EMBED_BLOT]: payload } },
				{ insert: '\n' },
			]);
		});

		const editButton = container.querySelector('.music-keyboard-edit-button');

		act(() => {
			editButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});

		const dialog = getLatestDialog();
		const chordInput = dialog.querySelector('.mn-chord-builder input');

		act(() => {
			setInputValue(chordInput, 'V');
			chordInput.dispatchEvent(new Event('input', { bubbles: true }));
		});

		act(() => {
			setInputValue(chordInput, 'C');
			chordInput.dispatchEvent(new Event('input', { bubbles: true }));
		});

		expect(chordInput.value).toBe('C');
		expect(dialog.querySelector('.mn-chord-builder-helper').textContent).toBe('C major');

		closeOpenDialog();

		const contents = quill.getContents();
		const keyboardOperation = contents.ops.find((operation) => operation.insert?.[KEYBOARD_EMBED_BLOT]);

		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].label).toBe('C');
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].progressionId).toBeUndefined();
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].sourceChordSymbol).toBeUndefined();
	});

	it('updates the embed payload when a scale is selected', function() {
		const payload = {
			id: 'keyboard-scale-spec',
			label: 'C major',
			notes: ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4'],
		};

		act(() => {
			quill.setContents([
				{ insert: { [KEYBOARD_EMBED_BLOT]: payload } },
				{ insert: '\n' },
			]);
		});

		const editButton = container.querySelector('.music-keyboard-edit-button');

		act(() => {
			editButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});

		const dialog = getLatestDialog();
		const modeSelect = queryCombobox(dialog, '.music-keyboard-edit-mode');
		const keyModeSelect = queryCombobox(dialog, '.music-display-key-mode-field');

		act(() => {
			selectValue(modeSelect, 'scale');
		});

		const keyInput = dialog.querySelector('.music-display-key-field input');

		act(() => {
			setInputValue(keyInput, 'D');
			keyInput.dispatchEvent(new Event('input', { bubbles: true }));
		});

		act(() => {
			selectValue(keyModeSelect, 'dorian');
		});

		expect(dialog.querySelector('.mn-scale-builder-helper').textContent).toBe('D dorian');

		closeOpenDialog();

		const contents = quill.getContents();
		const keyboardOperation = contents.ops.find((operation) => operation.insert?.[KEYBOARD_EMBED_BLOT]);

		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].scaleId).toBe('typed:D dorian');
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].displayKeyMode).toBe('dorian');
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].label).toBe('D dorian');
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].rootNote).toBe('D4');
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].notes).toEqual(['D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5']);
	});

	it('opens saved scale embeds in scale edit mode', function() {
		const payload = {
			id: 'keyboard-saved-scale-mode-spec',
			displayKey: 'D',
			displayKeyMode: 'dorian',
			label: 'D dorian',
			notes: ['D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5'],
			rootNote: 'D4',
			scaleId: 'typed:D dorian',
		};

		act(() => {
			quill.setContents([
				{ insert: { [KEYBOARD_EMBED_BLOT]: payload } },
				{ insert: '\n' },
			]);
		});

		const editButton = container.querySelector('.music-keyboard-edit-button');

		act(() => {
			editButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});

		const dialog = getLatestDialog();
		const modeSelect = queryCombobox(dialog, '.music-keyboard-edit-mode');

		expect(modeSelect.textContent).toBe('Scale');
		expect(dialog.querySelector('.mn-scale-builder')).toBeTruthy();
		expect(dialog.querySelector('.mn-chord-builder')).toBeFalsy();
	});

	it('uses none edit mode to show an empty display in the selected key', function() {
		const payload = {
			id: 'keyboard-display-key-spec',
			label: 'C major',
			notes: ['C4', 'E4', 'G4'],
		};

		act(() => {
			quill.setContents([
				{ insert: { [KEYBOARD_EMBED_BLOT]: payload } },
				{ insert: '\n' },
			]);
		});

		const editButton = container.querySelector('.music-keyboard-edit-button');

		act(() => {
			editButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});

		const dialog = getLatestDialog();
		const modeSelect = queryCombobox(dialog, '.music-keyboard-edit-mode');

		act(() => {
			selectValue(modeSelect, 'none');
		});

		const keyInput = dialog.querySelector('.music-display-key-field input');
		const keyModeSelect = queryCombobox(dialog, '.music-display-key-mode-field');

		expect(keyModeSelect).toBeTruthy();

		act(() => {
			setInputValue(keyInput, '');
			keyInput.dispatchEvent(new Event('input', { bubbles: true }));
		});

		expect(keyInput.value).toBe('');

		act(() => {
			setInputValue(keyInput, 'D');
			keyInput.dispatchEvent(new Event('input', { bubbles: true }));
		});

		act(() => {
			selectValue(keyModeSelect, 'minor');
		});

		expect(dialog.querySelector('.mn-chord-builder')).toBeFalsy();
		expect(dialog.querySelector('.mn-scale-builder')).toBeFalsy();
		expect(dialog.querySelector('.mn-progression-builder')).toBeFalsy();
		expect(Array.from(dialog.querySelectorAll('label')).some((label) => label.textContent.includes('Arpeggiate'))).toBe(false);

		closeOpenDialog();

		const contents = quill.getContents();
		const keyboardOperation = contents.ops.find((operation) => operation.insert?.[KEYBOARD_EMBED_BLOT]);

		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].displayKey).toBe('D');
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].displayKeyMode).toBe('minor');
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].label).toBe('D minor key');
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].notes).toEqual([]);
	});

	it('renders staff display mode with an editable octave', function() {
		const payload = {
			id: 'keyboard-staff-display-spec',
			label: 'C major',
			notes: ['C4', 'E4', 'G4'],
		};

		act(() => {
			quill.setContents([
				{ insert: { [KEYBOARD_EMBED_BLOT]: payload } },
				{ insert: '\n' },
			]);
		});

		const editButton = container.querySelector('.music-keyboard-edit-button');

		act(() => {
			editButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});

		const dialog = getLatestDialog();
		const displaySelect = queryCombobox(dialog, '.music-display-options-field');

		act(() => {
			selectValue(displaySelect, 'staff');
		});

		const octaveInput = dialog.querySelector('.music-display-options input[type="number"]');
		const arpeggiateInput = dialog.querySelector('.mn-chord-builder input[type="checkbox"]');

		act(() => {
			setInputValue(octaveInput, '6');
			octaveInput.dispatchEvent(new Event('input', { bubbles: true }));
			octaveInput.dispatchEvent(new Event('change', { bubbles: true }));
		});

		act(() => {
			arpeggiateInput.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});

		expect(dialog.querySelector('.music-staff-preview')).toBeTruthy();
		expect(dialog.querySelector('.music-staff-osmd')).toBeTruthy();
		expect(octaveInput.min).toBe('0');
		expect(octaveInput.max).toBe('8');
		expect(arpeggiateInput).toBeTruthy();

		closeOpenDialog();

		const contents = quill.getContents();
		const keyboardOperation = contents.ops.find((operation) => operation.insert?.[KEYBOARD_EMBED_BLOT]);

		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].displayMode).toBe('staff');
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].staffOctave).toBe(6);
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].arpeggiate).toBe(true);
	});

	it('uses the chord arpeggiation option when building MusicXML', function() {
		const payload = {
			id: 'keyboard-arpeggiate-xml-spec',
			arpeggiate: true,
			chordId: 'typed:C:inv0',
			label: 'C',
			notes: ['C4', 'E4', 'G4'],
		};
		const staffNotes = getStaffNotes(payload.notes, 4, payload);
		const musicXml = buildMusicXml(payload, staffNotes);

		expect(musicXml).not.toContain('<chord/>');
		expect(musicXml.match(/<type>quarter<\/type>/g).length).toBe(3);
	});

	it('adds an octave-up staff sign when staff notes are above the practical staff range', function() {
		const payload = {
			id: 'keyboard-high-staff-xml-spec',
			displayMode: 'staff',
			label: 'High C',
			notes: ['C6', 'E6', 'G6'],
		};
		const staffNotes = getStaffNotes(payload.notes, 6, payload);
		const musicXml = buildMusicXml(payload, staffNotes);

		expect(musicXml).toContain('<words>8va</words>');
		expect(musicXml).not.toContain('<octave-shift');
		expect(musicXml).toContain('<octave>5</octave>');
	});

	it('adds a two-octave staff sign when staff notes are far above the practical staff range', function() {
		const payload = {
			id: 'keyboard-very-high-staff-xml-spec',
			displayMode: 'staff',
			label: 'Very high C',
			notes: ['C7', 'E7', 'G7'],
		};
		const staffNotes = getStaffNotes(payload.notes, 7, payload);
		const musicXml = buildMusicXml(payload, staffNotes);

		expect(musicXml).toContain('<words>15ma</words>');
		expect(musicXml).not.toContain('<octave-shift');
		expect(musicXml).toContain('<octave>5</octave>');
	});

	it('adds a three-octave staff sign when staff notes are extremely above the practical staff range', function() {
		const payload = {
			id: 'keyboard-extremely-high-staff-xml-spec',
			displayMode: 'staff',
			label: 'Extremely high C',
			notes: ['C8', 'E8', 'G8'],
		};
		const staffNotes = getStaffNotes(payload.notes, 8, payload);
		const musicXml = buildMusicXml(payload, staffNotes);

		expect(musicXml).toContain('<words>22ma</words>');
		expect(musicXml).not.toContain('<octave-shift');
		expect(musicXml).toContain('<octave>5</octave>');
	});

	it('does not add an octave staff sign when any note remains in the practical staff range', function() {
		const payload = {
			id: 'keyboard-partial-high-staff-xml-spec',
			displayMode: 'staff',
			label: 'Partially high chord',
			notes: ['G5', 'C6', 'E6'],
		};
		const staffNotes = [
			...getStaffNotes(['G'], 5, payload),
			...getStaffNotes(['C', 'E'], 6, payload),
		];
		const musicXml = buildMusicXml(payload, staffNotes);

		expect(musicXml).not.toContain('<words>');
		expect(musicXml).toContain('<octave>5</octave>');
		expect(musicXml).toContain('<octave>6</octave>');
	});

	it('adds an octave-down staff sign when staff notes are below the practical staff range', function() {
		const payload = {
			id: 'keyboard-low-staff-xml-spec',
			displayMode: 'staff',
			label: 'Low C',
			notes: ['C1', 'E1', 'G1'],
		};
		const staffNotes = getStaffNotes(payload.notes, 1, payload);
		const musicXml = buildMusicXml(payload, staffNotes);

		expect(musicXml).toContain('<words>8vb</words>');
		expect(musicXml).not.toContain('<octave-shift');
		expect(musicXml).toContain('<octave>2</octave>');
	});

	it('adds an invisible rest to give empty key-signature staff previews measure width', function() {
		const payload = {
			id: 'keyboard-empty-key-signature-width-spec',
			displayKey: 'C#',
			displayMode: 'staff',
			label: 'C# key',
			notes: [],
		};
		const staffNotes = getStaffNotes(payload.notes, 4, payload);
		const musicXml = buildMusicXml(payload, staffNotes);

		expect(musicXml).toContain('<fifths>7</fifths>');
		expect(musicXml).toContain('<note print-object="no">');
		expect(musicXml).toContain('<rest measure="yes"/>');
		expect(musicXml).toContain('<duration>4</duration>');
	});

	it('defaults unsupported keys to the associated enharmonic key', function() {
		const payload = {
			id: 'keyboard-enharmonic-key-spec',
			displayKey: 'A#',
			label: 'A# key',
			notes: [],
		};

		act(() => {
			quill.setContents([
				{ insert: { [KEYBOARD_EMBED_BLOT]: payload } },
				{ insert: '\n' },
			]);
		});

		const editButton = container.querySelector('.music-keyboard-edit-button');

		act(() => {
			editButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});

		const dialog = getLatestDialog();
		const enharmonicCheckbox = Array.from(dialog.querySelectorAll('input[type="checkbox"]'))
			.find((input) => input.closest('label')?.textContent.includes('Use B♭'));

		expect(enharmonicCheckbox).toBeTruthy();
		expect(enharmonicCheckbox.checked).toBe(true);

		act(() => {
			enharmonicCheckbox.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});

		closeOpenDialog();

		const contents = quill.getContents();
		const keyboardOperation = contents.ops.find((operation) => operation.insert?.[KEYBOARD_EMBED_BLOT]);

		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].displayKey).toBe('A#');
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].useEnharmonicKey).toBe(false);
	});

	it('uses the shared enharmonic key option when building scales', function() {
		const payload = {
			id: 'keyboard-enharmonic-scale-spec',
			displayKey: 'A#',
			label: 'A# key',
			notes: [],
		};

		act(() => {
			quill.setContents([
				{ insert: { [KEYBOARD_EMBED_BLOT]: payload } },
				{ insert: '\n' },
			]);
		});

		const editButton = container.querySelector('.music-keyboard-edit-button');

		act(() => {
			editButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});

		const dialog = getLatestDialog();
		const modeSelect = queryCombobox(dialog, '.music-keyboard-edit-mode');

		act(() => {
			selectValue(modeSelect, 'scale');
		});

		expect(dialog.querySelector('.mn-scale-builder-helper').textContent).toBe('Bb major');

		closeOpenDialog();

		const contents = quill.getContents();
		const keyboardOperation = contents.ops.find((operation) => operation.insert?.[KEYBOARD_EMBED_BLOT]);

		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].displayKey).toBe('A#');
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].scaleId).toBe('typed:Bb major');
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].label).toBe('Bb major');
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].notes).toEqual(['Bb4', 'C5', 'D5', 'Eb5', 'F5', 'G5', 'A5', 'Bb5']);
	});

	it('uses the enharmonic staff key to spell staff notes', function() {
		const payload = {
			displayKey: 'A#',
			displayMode: 'staff',
			label: 'A# major',
			notes: ['A#4', 'B#4', 'C##4', 'D#4', 'E#4', 'F##4', 'G##4'],
			scaleId: 'typed:A# major',
		};

		const staffNoteNames = getStaffNotes(payload.notes, 4, payload)
			.map((note) => note.note);
		const originalStaffNoteNames = getStaffNotes(payload.notes, 4, {
			...payload,
			useEnharmonicKey: false,
		}).map((note) => note.note);

		expect(staffNoteNames).toEqual(['B\u266d4', 'C4', 'D4', 'E\u266d4', 'F4', 'G4', 'A4']);
		expect(originalStaffNoteNames).toEqual(['A#4', 'B#4', 'C##4', 'D#4', 'E#4', 'F##4', 'G##4']);
	});

	it('uses the modal parent key signature that matches the scale spelling', function() {
		const payload = {
			displayKey: 'C',
			displayMode: 'staff',
			label: 'C locrian',
			notes: ['C4', 'Db4', 'Eb4', 'F4', 'Gb4', 'Ab4', 'Bb4'],
			scaleId: 'typed:C locrian',
		};

		expect(getPayloadKeyFifths(payload)).toBe(-5);
	});

	it('renders at least an octave from the outermost lower white key', function() {
		const payload = {
			id: 'keyboard-tight-range-spec',
			label: 'D major',
			notes: ['D4', 'F#4', 'A4'],
		};

		act(() => {
			quill.setContents([
				{ insert: { [KEYBOARD_EMBED_BLOT]: payload } },
				{ insert: '\n' },
			]);
		});

		expect(container.querySelectorAll('.ReactPiano__Key').length).toBe(13);
	});

	it('does not extend a populated keyboard back to the display key', function() {
		const payload = {
			id: 'keyboard-note-range-display-key-spec',
			displayKey: 'C',
			label: 'C: I7',
			notes: ['G4', 'Bb4', 'C5', 'E5'],
		};

		act(() => {
			quill.setContents([
				{ insert: { [KEYBOARD_EMBED_BLOT]: payload } },
				{ insert: '\n' },
			]);
		});

		const firstLabel = container.querySelector('[data-midi-number]')?.textContent;

		expect(firstLabel).toBe('G');
		expect(container.querySelectorAll('.ReactPiano__Key').length).toBe(13);
	});

	it('anchors accidental display keys on a natural piano key', function() {
		const payload = {
			id: 'keyboard-display-key-accidental-spec',
			displayKey: 'C#',
			label: 'C# major',
			notes: [],
		};

		act(() => {
			quill.setContents([
				{ insert: { [KEYBOARD_EMBED_BLOT]: payload } },
				{ insert: '\n' },
			]);
		});

		const keys = container.querySelectorAll('.ReactPiano__Key');

		expect(keys.length).toBe(13);
		expect(keys[0].classList.contains('ReactPiano__Key--natural')).toBe(true);
	});

	it('spells visible keyboard note names in the selected major key', function() {
		const payload = {
			id: 'keyboard-key-spelling-spec',
			displayKey: 'Cb',
			label: 'Cb key',
			notes: [],
		};

		act(() => {
			quill.setContents([
				{ insert: { [KEYBOARD_EMBED_BLOT]: payload } },
				{ insert: '\n' },
			]);
		});

		const labels = Array.from(container.querySelectorAll('[data-midi-number]'))
			.map((label) => label.textContent)
			.filter(Boolean);

		expect(labels).toContain('C\u266d');
		expect(labels).toContain('D\u266d');
		expect(labels).toContain('E\u266d');
		expect(labels).toContain('F\u266d');
		expect(labels).toContain('G\u266d');
		expect(labels).toContain('A\u266d');
		expect(labels).toContain('B\u266d');
		expect(labels).toContain('C');
	});

	it('renders visible keyboard note names with non-zero text size', function() {
		const payload = {
			id: 'keyboard-note-name-size-spec',
			displayKey: 'C',
			label: 'C key',
			notes: [],
		};

		act(() => {
			quill.setContents([
				{ insert: { [KEYBOARD_EMBED_BLOT]: payload } },
				{ insert: '\n' },
			]);
		});

		const label = Array.from(container.querySelectorAll('[data-midi-number]'))
			.find((candidate) => candidate.textContent);
		const fontSize = Number.parseFloat(window.getComputedStyle(label).fontSize);

		expect(label.textContent).toBeTruthy();
		expect(fontSize).toBeGreaterThan(0);
	});

	it('can hide keyboard note names', function() {
		const payload = {
			id: 'keyboard-hide-note-names-spec',
			displayKey: 'C',
			keyboardShowNoteNames: false,
			label: 'C key',
			notes: [],
		};

		act(() => {
			quill.setContents([
				{ insert: { [KEYBOARD_EMBED_BLOT]: payload } },
				{ insert: '\n' },
			]);
		});

		const labelText = Array.from(container.querySelectorAll('.ReactPiano__NoteLabel'))
			.map((label) => label.textContent)
			.join('');
		const contents = quill.getContents();
		const keyboardOperation = contents.ops.find((operation) => operation.insert?.[KEYBOARD_EMBED_BLOT]);

		expect(labelText).toBe('');
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].keyboardShowNoteNames).toBe(false);
	});

	it('uses surrounding white keys around black keys before applying the octave minimum', function() {
		const payload = {
			id: 'keyboard-black-key-range-spec',
			label: 'Tritone',
			notes: ['C#4', 'F#4'],
		};

		act(() => {
			quill.setContents([
				{ insert: { [KEYBOARD_EMBED_BLOT]: payload } },
				{ insert: '\n' },
			]);
		});

		expect(container.querySelectorAll('.ReactPiano__Key').length).toBe(13);
	});

	it('stretches beyond an octave when the notes require it', function() {
		const payload = {
			id: 'keyboard-cross-octave-range-spec',
			label: 'F major first inversion',
			notes: ['A3', 'C4', 'F4'],
		};

		act(() => {
			quill.setContents([
				{ insert: { [KEYBOARD_EMBED_BLOT]: payload } },
				{ insert: '\n' },
			]);
		});

		expect(container.querySelectorAll('.ReactPiano__Key').length).toBe(13);
	});
});

function setInputValue(input, value) {
	const valueSetter = Object.getOwnPropertyDescriptor(input, 'value')?.set;
	const prototypeValueSetter = Object.getOwnPropertyDescriptor(
		Object.getPrototypeOf(input),
		'value',
	)?.set;

	if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
		prototypeValueSetter.call(input, value);
		return;
	}

	valueSetter?.call(input, value);
}

function selectValue(select, value) {
	const input = select.parentElement.querySelector('input');

	setInputValue(input, value);
	input.dispatchEvent(new Event('change', { bubbles: true }));
}

function queryCombobox(container, selector) {
	return container.querySelector(`${selector} [role="combobox"]`);
}

function dispatchPointerEvent(target, type, options = {}) {
	const hasPointerEvent = typeof PointerEvent === 'function';
	const event = hasPointerEvent
		? new PointerEvent(type, { bubbles: true, ...options })
		: new Event(type, { bubbles: true });

	if (!hasPointerEvent) {
		Object.entries(options).forEach(([key, value]) => {
			Object.defineProperty(event, key, { value });
		});
	}

	target.dispatchEvent(event);
}

function makeMusicObjectControllerMock() {
	return {
		attachEmbed() {
			return {
				closeDialog() {},
				detach() {},
				getState() {
					return {};
				},
				listen() {},
				performAction() {
					return false;
				},
				setHovered() {},
				setSelected() {},
				unlisten() {},
			};
		},
	};
}

function makeAppDataMock(initialValues = {}) {
	const values = { ...initialValues };
	const listeners = {};

	return {
		get(name, defaultValue) {
			return values[name] === undefined ? defaultValue : values[name];
		},
		listen(eventName, listener) {
			listeners[eventName] = listeners[eventName] || [];
			listeners[eventName].push(listener);
			return listener;
		},
		unlisten(eventName, listener) {
			listeners[eventName] = (listeners[eventName] || [])
				.filter((existingListener) => existingListener !== listener);
		},
		update(name, value) {
			values[name] = value;
			(listeners.updated || []).forEach((listener) => listener(name, value));
			(listeners[`updated:${name}`] || []).forEach((listener) => listener(value));
		},
		watch(name, defaultValue) {
			if (values[name] === undefined) {
				values[name] = defaultValue;
			}

			return values[name];
		},
	};
}

function closeOpenDialog() {
	const dialog = getLatestDialog();
	const doneButton = dialog?.querySelector('#done');

	if (!doneButton) {
		return;
	}

	act(() => {
		doneButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
	});
}

function cancelOpenDialog() {
	const dialog = getLatestDialog();
	const closeButton = dialog?.querySelector('.mn-base-dialog__close');

	if (!closeButton) {
		return;
	}

	act(() => {
		closeButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
	});
}

async function waitForNextTask() {
	await act(() => new Promise((resolve) => {
		setTimeout(resolve, 0);
	}));
}

function getLatestDialog() {
	const dialogs = Array.from(document.body.querySelectorAll('[role="dialog"]'));
	return dialogs[dialogs.length - 1];
}
