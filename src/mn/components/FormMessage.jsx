/// <reference path="./types/FormMessage.d.ts" />

import React, { Component } from 'react';
import Alert from '@mui/material/Alert';

import LocaleString from './LocaleString.jsx';

/**
 * Renders a prominent localized message for a form or dialog.
 *
 * @extends {Component<FormMessageProps>}
 */
export default class FormMessage extends Component {
	/**
	 * Gets the MUI alert severity.
	 *
	 * @returns {FormMessageType}
	 */
	getType() {
		return this.props.type || 'info';
	}

	/**
	 * Renders the localized message content.
	 *
	 * @returns {React.ReactElement | null}
	 */
	renderMessage() {
		const {message} = this.props;

		if (!message) {
			return null;
		}

		const localeProps = typeof message === 'object'
			? message
			: {phrase: message};

		return (
			<LocaleString
				id={this.props.messageId || 'form-message-text'}
				{...localeProps}
				html={this.props.html === true}
			/>
		);
	}

	/**
	 * Renders the form message or null when no message is available.
	 *
	 * @returns {React.ReactElement | null}
	 */
	render() {
		if (!this.props.message) {
			return null;
		}

		return (
			<Alert
				className={this.props.className}
				onClose={this.props.onClose}
				severity={this.getType()}
				variant={this.props.variant || 'outlined'}
			>
				{this.renderMessage()}
			</Alert>
		);
	}
}
