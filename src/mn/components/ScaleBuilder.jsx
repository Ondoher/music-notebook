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
			initialKeyMode = 'major',
			label = 'Scale',
			selectedKey,
			selectedKeyMode,
			showKey = true,
			size,
		} = this.props;

		return (
			<ScaleInput
				fieldClassName="mn-scale-builder-field"
				helperClassName="mn-scale-builder-helper"
				initialKey={initialKey}
				initialKeyMode={initialKeyMode}
				label={label}
				labelClassName="mn-scale-builder-label"
				onResultChange={this.handleResultChange}
				rootClassName="mn-scale-builder"
				selectedKey={selectedKey}
				selectedKeyMode={selectedKeyMode}
				showKey={showKey}
				size={size}
			/>
		);
	}
}
