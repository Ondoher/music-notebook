import { act } from 'react';
import { createTestHarness } from '../../../../testing/TestHarness.js';
import EditorPage from '../../components/EditorPage.jsx';
import { KEYBOARD_EMBED_BLOT } from '../keyboard-embed.js';

describe('EditorToolbar', function() {
	let harness;

	afterEach(function() {
		harness?.unmount();
		harness = null;
	});

	[
		{
			buttonSelector: '.ql-musicKeyboard',
			displayMode: 'keyboard',
			label: 'Insert keyboard object',
		},
		{
			buttonSelector: '.ql-musicStaff',
			displayMode: 'staff',
			label: 'Insert staff object',
		},
	].forEach(({ buttonSelector, displayMode, label }) => {
		it(`inserts a ${displayMode} music object from the Quill toolbar`, function() {
			harness = createTestHarness();

			const result = harness.render(EditorPage, {
				pageView: makePageView(),
			});
			const button = result.container.querySelector(buttonSelector);

			act(() => {
				button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
			});

			const embed = result.container.querySelector('.music-keyboard-embed');
			const payload = JSON.parse(embed.dataset.keyboardPayload);
			const dialog = getLatestDialog();
			const contentTypeSelect = dialog.querySelector('.music-keyboard-edit-mode [role="combobox"]');
			const displaySelect = dialog.querySelector('.music-display-options-field [role="combobox"]');

			expect(button).toBeTruthy();
			expect(button.getAttribute('aria-label')).toBe(label);
			expect(button.querySelector('svg')).toBeTruthy();
			expect(payload.displayMode).toBe(displayMode);
			expect(payload.chordId).toBeUndefined();
			expect(payload.displayKey).toBe('C');
			expect(payload.initialEditMode).toBeUndefined();
			expect(payload.label).toBe('C major key');
			expect(payload.notes).toEqual([]);
			expect(payload.openEditor).toBeUndefined();
			expect(contentTypeSelect.textContent).toBe('None');
			expect(dialog.querySelector('.mn-chord-builder')).toBeFalsy();
			expect(displaySelect.textContent).toBe(displayMode === 'keyboard' ? 'Keyboard' : 'Staff');
			expect(getInsertedMusicPayload(result.container).displayMode).toBe(displayMode);
		});
	});
});

function getLatestDialog() {
	const dialogs = Array.from(document.body.querySelectorAll('[role="dialog"]'));
	return dialogs[dialogs.length - 1];
}

function makePageView() {
	return {
		getState() {
			return {
				debugDocumentLabel: 'Document JSON',
				document: {
					ops: [{ insert: 'Start\n' }],
				},
				insertKeyboardObjectLabel: 'Insert keyboard object',
				insertStaffObjectLabel: 'Insert staff object',
				placeholder: 'Write...',
				status: 'POC',
				title: 'Notebook',
			};
		},
		listen() {},
		unlisten() {},
	};
}

function getInsertedMusicPayload(container) {
	const documentJson = JSON.parse(container.querySelector('.editor-debug-document pre').textContent);
	const operation = documentJson.ops.find((op) => op.insert?.[KEYBOARD_EMBED_BLOT]);
	return operation.insert[KEYBOARD_EMBED_BLOT];
}
