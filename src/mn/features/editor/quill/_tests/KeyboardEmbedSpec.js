import Quill from 'quill';
import { act } from 'react';
import { buildMusicXml, getPayloadKeyFifths, getStaffNotes } from '../../../../shared/music_helper.js';
import { configureKeyboardEmbedContext, KEYBOARD_EMBED_BLOT, registerKeyboardEmbed } from '../keyboard-embed.js';

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
		expect(embed.style.getPropertyValue('--music-embed-height')).toBe('266px');
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT]).toEqual({
			...payload,
			displayMode: 'keyboard',
			height: 266,
			staffOctave: 4,
			width: 456,
		});
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
			height: 266,
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

	it('updates localized embed controls when the watched locale changes', function() {
		let locale = 'en-US-u-ms-ussystem';
		const appData = makeAppDataMock({ locale });
		const localize = {
			getLocale() {
				return locale;
			},
			t(phrase) {
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
					return serviceName === 'app-data' ? appData : localize;
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

	it('persists embed dimensions from the resize handle pointer drag', function() {
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

		expect(embed.style.getPropertyValue('--music-embed-width')).toBe('345px');
		expect(embed.style.getPropertyValue('--music-embed-height')).toBe('250px');
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].width).toBe(345);
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].height).toBe(250);
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

		const contents = quill.getContents();
		const keyboardOperation = contents.ops.find((operation) => operation.insert?.[KEYBOARD_EMBED_BLOT]);

		expect(input).toBeTruthy();
		expect(helper.textContent).toBe('D major');
		expect(input.getAttribute('aria-describedby')).toBe(helper.id);
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].chordId).toBe('typed:D:inv0');
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].label).toBe('D');
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].notes).toEqual(['D4', 'F#4', 'A4']);

		closeOpenDialog();
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

		const contents = quill.getContents();
		const keyboardOperation = contents.ops.find((operation) => operation.insert?.[KEYBOARD_EMBED_BLOT]);

		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].chordId).toBe('typed:Cdim7/Eb:inv1');
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].inversion).toBe(1);
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].rootNote).toBe('C5');
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].notes).toEqual(['Eb4', 'Gb4', 'Bbb4', 'C5']);

		closeOpenDialog();
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

		const contents = quill.getContents();
		const keyboardOperation = contents.ops.find((operation) => operation.insert?.[KEYBOARD_EMBED_BLOT]);

		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].scaleId).toBe('typed:C major');
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].chordId).toBeUndefined();
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].label).toBe('C major');
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].notes).toEqual(['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4']);

		closeOpenDialog();
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

		const contents = quill.getContents();
		const keyboardOperation = contents.ops.find((operation) => operation.insert?.[KEYBOARD_EMBED_BLOT]);

		expect(dialog.querySelector('.mn-chord-builder-helper').textContent).toBe('D minor');
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].progressionId).toBe('typed:C:ii');
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].sourceChordSymbol).toBe('Dm');
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].label).toBe('C: ii');
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].notes).toEqual(['D4', 'F4', 'A4']);

		closeOpenDialog();
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

		const contents = quill.getContents();
		const keyboardOperation = contents.ops.find((operation) => operation.insert?.[KEYBOARD_EMBED_BLOT]);

		expect(dialog.querySelector('.mn-chord-builder-helper').textContent).toBe('D diminished');
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].displayKeyMode).toBe('minor');
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].progressionId).toBe('typed:C:ii\u00b0');
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].progressionInput).toBe('2');
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].sourceChordSymbol).toBe('Ddim');
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].label).toBe('C: ii\u00b0');
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].notes).toEqual(['D4', 'F4', 'Ab4']);

		closeOpenDialog();
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

		const contents = quill.getContents();
		const keyboardOperation = contents.ops.find((operation) => operation.insert?.[KEYBOARD_EMBED_BLOT]);

		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].progressionId).toBe('typed:C:V');
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].sourceChordSymbol).toBe('G');
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].inversion).toBe(2);
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].rootNote).toBe('G4');
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].notes).toEqual(['D4', 'G4', 'B4']);

		closeOpenDialog();
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

		const contents = quill.getContents();
		const keyboardOperation = contents.ops.find((operation) => operation.insert?.[KEYBOARD_EMBED_BLOT]);

		expect(chordInput.value).toBe('C');
		expect(dialog.querySelector('.mn-chord-builder-helper').textContent).toBe('C major');
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].label).toBe('C');
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].progressionId).toBeUndefined();
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].sourceChordSymbol).toBeUndefined();

		closeOpenDialog();
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

		act(() => {
			selectValue(modeSelect, 'scale');
		});

		const keyInput = dialog.querySelector('.music-display-key-field input');
		const scaleFields = dialog.querySelectorAll('.mn-scale-builder-field');
		const typeSelect = scaleFields[0].querySelector('[role="combobox"]');

		act(() => {
			setInputValue(keyInput, 'D');
			keyInput.dispatchEvent(new Event('input', { bubbles: true }));
		});

		act(() => {
			selectValue(typeSelect, 'mode');
		});

		const modeScaleSelect = dialog.querySelectorAll('.mn-scale-builder-field')[1].querySelector('[role="combobox"]');

		act(() => {
			selectValue(modeScaleSelect, 'dorian');
		});

		const contents = quill.getContents();
		const keyboardOperation = contents.ops.find((operation) => operation.insert?.[KEYBOARD_EMBED_BLOT]);

		expect(dialog.querySelector('.mn-scale-builder-helper').textContent).toBe('D dorian');
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].scaleId).toBe('typed:D dorian');
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].label).toBe('D dorian');
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].rootNote).toBe('D4');
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].notes).toEqual(['D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C4']);

		closeOpenDialog();
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

		const contents = quill.getContents();
		const keyboardOperation = contents.ops.find((operation) => operation.insert?.[KEYBOARD_EMBED_BLOT]);

		expect(dialog.querySelector('.mn-chord-builder')).toBeFalsy();
		expect(dialog.querySelector('.mn-scale-builder')).toBeFalsy();
		expect(dialog.querySelector('.mn-progression-builder')).toBeFalsy();
		expect(Array.from(dialog.querySelectorAll('label')).some((label) => label.textContent.includes('Arpeggiate'))).toBe(false);
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].displayKey).toBe('D');
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].displayKeyMode).toBe('minor');
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].label).toBe('D minor key');
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].notes).toEqual([]);

		closeOpenDialog();
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

		const contents = quill.getContents();
		const keyboardOperation = contents.ops.find((operation) => operation.insert?.[KEYBOARD_EMBED_BLOT]);

		expect(dialog.querySelector('.music-staff-preview')).toBeTruthy();
		expect(dialog.querySelector('.music-staff-osmd')).toBeTruthy();
		expect(octaveInput.min).toBe('0');
		expect(octaveInput.max).toBe('8');
		expect(arpeggiateInput).toBeTruthy();
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].displayMode).toBe('staff');
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].staffOctave).toBe(6);
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].arpeggiate).toBe(true);

		closeOpenDialog();
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

		const contents = quill.getContents();
		const keyboardOperation = contents.ops.find((operation) => operation.insert?.[KEYBOARD_EMBED_BLOT]);

		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].displayKey).toBe('A#');
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].useEnharmonicKey).toBe(false);

		closeOpenDialog();
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

		const contents = quill.getContents();
		const keyboardOperation = contents.ops.find((operation) => operation.insert?.[KEYBOARD_EMBED_BLOT]);

		expect(dialog.querySelector('.mn-scale-builder-helper').textContent).toBe('Bb major');
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].displayKey).toBe('A#');
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].scaleId).toBe('typed:Bb major');
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].label).toBe('Bb major');
		expect(keyboardOperation.insert[KEYBOARD_EMBED_BLOT].notes).toEqual(['Bb4', 'C4', 'D4', 'Eb4', 'F4', 'G4', 'A4']);

		closeOpenDialog();
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
	const doneButton = Array.from(dialog?.querySelectorAll('button') || [])
		.find((button) => button.textContent === 'Done');

	if (!doneButton) {
		return;
	}

	act(() => {
		doneButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
	});
}

function getLatestDialog() {
	const dialogs = Array.from(document.body.querySelectorAll('[role="dialog"]'));
	return dialogs[dialogs.length - 1];
}
