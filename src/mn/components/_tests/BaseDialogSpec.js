import React from 'react';
import { act } from 'react';

import BaseDialog from '../BaseDialog.jsx';
import { createTestHarness } from '../../testing/TestHarness.js';

function makeLocalizeMock() {
	return {
		getLocale() {
			return 'en-US';
		},
		listen() {},
		translate(phrase) {
			return {
				'action.apply': 'Apply',
				'action.cancel': 'Cancel',
				'action.extra': 'Extra',
				'action.save': 'Save',
				'action.toggle': 'Toggle',
				'common.close': 'Close',
				'description.changed': 'Changed description',
				'description.main': 'Dialog description',
				'title.changed': 'Changed title',
				'title.main': 'Main title',
				'title.reset': 'Reset title',
				'status.changed': 'Dialog mode changed',
			}[phrase] || '';
		},
		unlisten() {},
	};
}

class DialogChild extends React.Component {
	render() {
		const { dialog } = this.props;

		return (
			<div>
				<input aria-label="Child input" />
				<button
					onClick={() => dialog.setTitle({ labelKey: 'title.changed' })}
					type="button"
				>
					Change title
				</button>
				<button
					onClick={() => dialog.setDescription({ labelKey: 'description.changed' })}
					type="button"
				>
					Change description
				</button>
				<button
					onClick={() => dialog.setButtonState('save', { enabled: 'disabled' })}
					type="button"
				>
					Disable save
				</button>
				<button
					onClick={() => dialog.announce({ labelKey: 'status.changed' })}
					type="button"
				>
					Announce
				</button>
				<button
					onClick={() => dialog.submit()}
					type="button"
				>
					Submit
				</button>
			</div>
		);
	}
}

function renderDialog(harness, props = {}) {
	return harness.render(BaseDialog, {
		buttons: [
			{ id: 'cancel', labelKey: 'action.cancel', priority: 'secondary' },
			{ id: 'save', labelKey: 'action.save', priority: 'primary' },
		],
		className: 'base-dialog-spec',
		descriptionKey: 'description.main',
		onButtonPress() {},
		open: true,
		showClose: true,
		titleKey: 'title.main',
		...props,
		children: props.children || <DialogChild />,
	});
}

function getDialog() {
	return document.body.querySelector('.base-dialog-spec [role="dialog"]');
}

function getButtonByText(text) {
	return Array.from(document.body.querySelectorAll('.base-dialog-spec button'))
		.find((button) => button.textContent.trim() === text);
}

describe('BaseDialog', function() {
	let harness;

	beforeEach(function() {
		const localize = makeLocalizeMock();

		harness = createTestHarness()
			.withService('localize', localize)
			.withContext({ localize });
	});

	afterEach(function() {
		harness?.unmount();
		harness = null;
	});

	it('renders localized title, description, close affordance, and ordered buttons', function() {
		renderDialog(harness, {
			className: 'base-dialog-spec custom-dialog',
			titleId: 'title-id',
			descriptionId: 'description-id',
		});

		const dialog = getDialog();
		const buttons = Array.from(document.body.querySelectorAll('.base-dialog-spec .mn-base-dialog__actions button'));

		expect(dialog.getAttribute('aria-labelledby')).toBe('title-id');
		expect(dialog.getAttribute('aria-describedby')).toBe('description-id');
		expect(document.getElementById('title-id').textContent).toContain('Main title');
		expect(document.getElementById('description-id').textContent).toBe('Dialog description');
		expect(document.body.querySelector('.base-dialog-spec.custom-dialog')).toBeTruthy();
		expect(document.body.querySelector('.base-dialog-spec .mn-base-dialog__close').getAttribute('aria-label')).toBe('Close');
		expect(buttons.map((button) => button.textContent.trim()).join(',')).toBe('Cancel,Save');
	});

	it('routes action, close, and submit callbacks through button ids', function() {
		const pressed = [];

		renderDialog(harness, {
			onButtonPress(buttonId) {
				pressed.push(buttonId);
			},
		});

		act(() => {
			getButtonByText('Save').dispatchEvent(new MouseEvent('click', { bubbles: true }));
			document.body.querySelector('.base-dialog-spec .mn-base-dialog__close').dispatchEvent(new MouseEvent('click', { bubbles: true }));
			getButtonByText('Submit').dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});

		expect(pressed.join(',')).toBe('save,close,submit');
	});

	it('keeps disabled buttons focusable while blocking activation', function() {
		const pressed = [];

		renderDialog(harness, {
			buttons: [
				{ enabled: 'disabled', id: 'save', labelKey: 'action.save', priority: 'primary' },
			],
			onButtonPress(buttonId) {
				pressed.push(buttonId);
			},
		});

		const saveButton = getButtonByText('Save');

		act(() => {
			saveButton.focus();
			saveButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});

		expect(document.activeElement).toBe(saveButton);
		expect(saveButton.hasAttribute('disabled')).toBe(false);
		expect(saveButton.getAttribute('aria-disabled')).toBe('true');
		expect(pressed.length).toBe(0);
	});

	it('renders pressable state with aria-pressed and hides hidden buttons', function() {
		renderDialog(harness, {
			buttons: [
				{
					id: 'toggle',
					labelKey: 'action.toggle',
					pressable: true,
					pressed: 'pressed',
					priority: 'secondary',
				},
				{
					id: 'extra',
					labelKey: 'action.extra',
					visibility: 'hide',
				},
			],
		});

		const toggleButton = getButtonByText('Toggle');

		expect(toggleButton.getAttribute('aria-pressed')).toBe('true');
		expect(getButtonByText('Extra')).toBeUndefined();
	});

	it('preserves child-driven state across same-key rerenders and resets on resetToken changes', function() {
		renderDialog(harness, {
			resetToken: 1,
			titleKey: 'title.main',
		});

		act(() => {
			getButtonByText('Change title').dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});

		expect(document.body.textContent).toContain('Changed title');

		renderDialog(harness, {
			resetToken: 1,
			titleKey: 'title.reset',
		});

		expect(document.body.textContent).toContain('Changed title');
		expect(document.body.textContent).not.toContain('Reset title');

		renderDialog(harness, {
			resetToken: 2,
			titleKey: 'title.reset',
		});

		expect(document.body.textContent).toContain('Reset title');
	});

	it('preserves focus across same-dialog rerenders', function() {
		renderDialog(harness);

		const input = document.body.querySelector('.base-dialog-spec input[aria-label="Child input"]');

		act(() => {
			input.focus();
		});

		renderDialog(harness, {
			descriptionKey: 'description.changed',
		});

		expect(document.activeElement).toBe(input);
	});

	it('supports explicit announcements without announcing title changes', function() {
		renderDialog(harness);

		const announcement = document.body.querySelector('.base-dialog-spec .mn-base-dialog__announcement');

		expect(announcement.textContent).toBe('');

		act(() => {
			getButtonByText('Change title').dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});

		expect(announcement.textContent).toBe('');

		act(() => {
			getButtonByText('Announce').dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});

		expect(announcement.getAttribute('aria-live')).toBe('polite');
		expect(announcement.textContent).toBe('Dialog mode changed');
	});

	it('renders link-style actions without the base button class', function() {
		renderDialog(harness, {
			buttonStyle: 'link',
		});

		const saveButton = getButtonByText('Save');

		expect(saveButton.classList.contains('mn-base-dialog__link-action')).toBe(true);
		expect(saveButton.classList.contains('mn-base-dialog__button')).toBe(false);
	});

	it('warns for duplicate ids, reserved close id, and additional primary buttons', function() {
		const originalWarn = console.warn;
		const warnings = [];

		console.warn = (message) => {
			warnings.push(message);
		};

		try {
			renderDialog(harness, {
				buttons: [
					{ id: 'save', labelKey: 'action.save', priority: 'primary' },
					{ id: 'save', labelKey: 'action.apply', priority: 'primary' },
					{ id: 'close', labelKey: 'action.cancel', priority: 'secondary' },
				],
			});
		} finally {
			console.warn = originalWarn;
		}

		expect(warnings.some((message) => message.includes('duplicate button id'))).toBe(true);
		expect(warnings.some((message) => message.includes('more than one primary'))).toBe(true);
		expect(warnings.some((message) => message.includes('reserved'))).toBe(true);
	});
});
