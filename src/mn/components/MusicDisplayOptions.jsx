import React from 'react';
import BaseCheckbox from './BaseCheckbox.jsx';
import BaseSelect from './BaseSelect.jsx';
import BaseTextInput from './BaseTextInput.jsx';

/**
 * Renders shared display controls for keyboard and staff music embeds.
 *
 * @extends {React.Component<MusicDisplayOptionsProps>}
 */
export default class MusicDisplayOptions extends React.Component {
	/**
	 * Renders the optional staff octave control.
	 *
	 * @param {KeyboardDisplayMode} displayMode
	 * @returns {React.ReactElement | null}
	 */
	renderStaffOctave(displayMode) {
		if (displayMode !== 'staff') {
			return null;
		}

		return (
			<BaseTextInput
				className="music-display-options-field"
				label="music.controls.octave"
				labelFallback="Octave"
				onChange={(event) => this.props.onStaffOctaveChange(event.target.value)}
				slotProps={{
					htmlInput: {
						max: 8,
						min: 0,
						type: 'number',
					},
				}}
				size="small"
				value={this.props.payload.staffOctave ?? 4}
			/>
		);
	}

	/**
	 * Renders the optional keyboard note-name toggle.
	 *
	 * @param {KeyboardDisplayMode} displayMode
	 * @returns {React.ReactElement | null}
	 */
	renderKeyboardNoteNames(displayMode) {
		if (displayMode !== 'keyboard') {
			return null;
		}

		return (
			<BaseCheckbox
				checked={this.props.payload.keyboardShowNoteNames !== false}
				className="music-display-options-field music-display-options-field-checkbox"
				label="music.controls.show_note_names"
				labelFallback="Show note names"
				onChange={this.props.onKeyboardShowNoteNamesChange}
				size="small"
			/>
		);
	}

	/**
	 * Renders the music display options.
	 *
	 * @returns {React.ReactElement}
	 */
	render() {
		const displayMode = this.props.payload.displayMode || 'keyboard';

		return (
			<div className="music-display-options">
				<BaseSelect
					className="music-display-options-field"
					label="music.controls.display"
					labelFallback="Display"
					onChange={this.props.onDisplayModeChange}
					options={[
						{ fallback: 'Keyboard', label: 'music.display.keyboard', value: 'keyboard' },
						{ fallback: 'Staff', label: 'music.display.staff', value: 'staff' },
					]}
					size="small"
					value={displayMode}
				/>
				{this.renderStaffOctave(displayMode)}
				{this.renderKeyboardNoteNames(displayMode)}
			</div>
		);
	}
}
