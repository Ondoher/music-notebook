import React, { Component } from 'react';

import ChordInput from './ChordInput.jsx';

/**
 * Compatibility wrapper for chord-name editing through the unified chord input.
 *
 * @extends {Component<ChordBuilderProps>}
 */
export default class ChordBuilder extends Component {
	/**
	 * Reports unified chord input results through the legacy callback.
	 *
	 * @param {MusicBuildResult} result
	 * @returns {void}
	 */
	handleResultChange = (result) => {
		this.props.onChordChange?.(result);
	};

	/**
	 * Renders the unified chord input with legacy chord-builder defaults.
	 *
	 * @returns {React.ReactElement}
	 */
	render() {
		const {
			initialArpeggiate = false,
			initialInversion = 0,
			initialKey = 'C',
			initialKeyMode = 'major',
			initialValue = 'C',
			label = 'Chord',
			selectedKey,
			selectedKeyMode,
			size,
			value,
		} = this.props;

		return (
			<ChordInput
				checkboxClassName="mn-chord-builder-field mn-chord-builder-checkbox music-display-options-field-checkbox"
				fieldClassName="mn-chord-builder-field"
				helperClassName="mn-chord-builder-helper"
				initialArpeggiate={initialArpeggiate}
				initialInversion={initialInversion}
				initialKey={initialKey}
				initialKeyMode={initialKeyMode}
				initialValue={initialValue}
				label={label}
				labelClassName="mn-chord-builder-label"
				onResultChange={this.handleResultChange}
				rootClassName="mn-chord-builder"
				selectedKey={selectedKey}
				selectedKeyMode={selectedKeyMode}
				size={size}
				value={value}
			/>
		);
	}
}
