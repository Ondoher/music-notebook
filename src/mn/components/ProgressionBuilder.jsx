import React, { Component } from 'react';

import ChordInput from './ChordInput.jsx';

/**
 * Compatibility wrapper for degree editing through the unified chord input.
 *
 * @extends {Component<ProgressionBuilderProps>}
 */
export default class ProgressionBuilder extends Component {
	/**
	 * Reports unified chord input results through the legacy callback.
	 *
	 * @param {MusicBuildResult} result
	 * @returns {void}
	 */
	handleResultChange = (result) => {
		this.props.onProgressionChange?.(result);
	};

	/**
	 * Renders the unified chord input with legacy progression-builder defaults.
	 *
	 * @returns {React.ReactElement}
	 */
	render() {
		const {
			initialArpeggiate = false,
			initialKey = 'C',
			initialKeyMode = 'major',
			initialRomanNumeral = 'I',
			label = 'Chord degree',
			selectedKey,
			selectedKeyMode,
			showKey = true,
			size,
		} = this.props;

		return (
			<ChordInput
				checkboxClassName="mn-progression-builder-field mn-progression-builder-checkbox music-display-options-field-checkbox"
				fieldClassName="mn-progression-builder-field"
				helperClassName="mn-progression-builder-helper"
				initialArpeggiate={initialArpeggiate}
				initialKey={initialKey}
				initialKeyMode={initialKeyMode}
				initialValue={initialRomanNumeral}
				label={label}
				labelClassName="mn-progression-builder-label"
				onResultChange={this.handleResultChange}
				rootClassName="mn-progression-builder"
				selectedKey={selectedKey}
				selectedKeyMode={selectedKeyMode}
				showKey={showKey}
				showKeyMode
				size={size}
			/>
		);
	}
}
