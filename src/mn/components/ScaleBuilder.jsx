import React, { Component } from 'react';

import ScaleInput from './ScaleInput.jsx';

/**
 * Compatibility wrapper for scale editing through the unified scale input.
 *
 * @extends {Component<ScaleBuilderProps>}
 */
export default class ScaleBuilder extends Component {
	/**
	 * Reports unified scale input results through the legacy callback.
	 *
	 * @param {MusicBuildResult} result
	 * @returns {void}
	 */
	handleResultChange = (result) => {
		this.props.onScaleChange?.(result);
	};

	/**
	 * Renders the unified scale input with legacy scale-builder defaults.
	 *
	 * @returns {React.ReactElement}
	 */
	render() {
		const {
			initialKey = 'C',
			initialMode = 'ionian',
			initialScaleType = 'major',
			label = 'Scale',
			selectedKey,
			showKey = true,
			size,
		} = this.props;

		return (
			<ScaleInput
				fieldClassName="mn-scale-builder-field"
				helperClassName="mn-scale-builder-helper"
				initialKey={initialKey}
				initialMode={initialMode}
				initialScaleType={initialScaleType}
				label={label}
				labelClassName="mn-scale-builder-label"
				onResultChange={this.handleResultChange}
				rootClassName="mn-scale-builder"
				selectedKey={selectedKey}
				showKey={showKey}
				size={size}
			/>
		);
	}
}
