/// <reference path="./types/InfoTextInput.d.ts" />

import React, { Component } from 'react';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import InfoIcon from '@mui/icons-material/Info';

import InfoDialog from './InfoDialog.jsx';
import MusicNotebookContext from '../common/MusicNotebookContext.js';
import TextInput from './TextInput.jsx';
import { getLocalizedText } from './localized-text.js';

/**
 * Renders a localized text input with an optional contextual information dialog.
 *
 * @extends {Component<InfoTextInputProps, InfoTextInputState>}
 */
export default class InfoTextInput extends Component {
	static contextType = MusicNotebookContext;

	constructor(props) {
		super(props);
		this.state = {
			showDialog: false,
		};
	}

	showInfo() {
		this.setState({showDialog: true});
	}

	closeInfo() {
		this.setState({showDialog: false});
	}

	getInfoButtonLabel() {
		return getLocalizedText(
			this.context?.localize,
			this.props.title || this.props.label,
			'More information',
		);
	}

	renderInfoButton(className = '') {
		return (
			<IconButton
				aria-label={this.getInfoButtonLabel()}
				className={className}
				onClick={this.showInfo.bind(this)}
				size="small"
				type="button"
			>
				<InfoIcon />
			</IconButton>
		);
	}

	renderInput() {
		const {
			content,
			infoPlacement = 'end',
			markdown,
			replacements,
			title,
			slotProps,
			...textInputProps
		} = this.props;

		if (!content) {
			return <TextInput {...textInputProps} slotProps={slotProps} />;
		}

		if (infoPlacement === 'top-right') {
			return (
				<div className="info-text-input info-text-input--top-right">
					<TextInput {...textInputProps} slotProps={slotProps} />
					{this.renderInfoButton('info-text-input__info-button info-text-input__info-button--top-right')}
				</div>
			);
		}

		return (
			<TextInput
				{...textInputProps}
				slotProps={{
					...slotProps,
					input: {
						...(slotProps?.input || {}),
						endAdornment: (
							<InputAdornment position="end">
								{this.renderInfoButton('info-text-input__info-button')}
							</InputAdornment>
						),
					},
				}}
			/>
		);
	}

	renderDialog() {
		if (!this.state.showDialog || !this.props.content) {
			return null;
		}

		return (
			<InfoDialog
				content={this.props.content}
				markdown={this.props.markdown}
				onClose={this.closeInfo.bind(this)}
				replacements={this.props.replacements}
				title={this.props.title}
			/>
		);
	}

	render() {
		return (
			<React.Fragment>
				{this.renderInput()}
				{this.renderDialog()}
			</React.Fragment>
		);
	}
}
