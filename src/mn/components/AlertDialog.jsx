/// <reference path="./types/AlertDialog.d.ts" />

import React, { Component } from 'react';

import BaseDialog from './BaseDialog.jsx';
import LocaleString from './LocaleString.jsx';

/**
 * Renders a simple localized two-action alert or confirmation dialog.
 *
 * @extends {Component<AlertDialogProps>}
 */
export default class AlertDialog extends Component {
	getButtons() {
		return [
			{
				id: 'secondary',
				labelKey: this.props.secondaryText,
				priority: 'secondary',
			},
			{
				id: 'primary',
				labelKey: this.props.primaryText,
				priority: 'primary',
			},
		];
	}

	handleAction(buttonId) {
		if (buttonId === 'close') {
			this.props.onClose?.();
			return;
		}

		if (buttonId === 'primary') {
			this.props.onPrimary?.();
			return;
		}

		if (buttonId === 'secondary') {
			this.props.onSecondary?.();
		}
	}

	renderContentItem(content, index) {
		const localeProps = typeof content === 'object'
			? content
			: {phrase: content};

		return (
			<div className="alert-dialog__content-line" key={index}>
				<LocaleString
					{...localeProps}
					html={this.props.html === true || localeProps.html === true}
				/>
			</div>
		);
	}

	renderBody() {
		const content = Array.isArray(this.props.content)
			? this.props.content
			: [this.props.content];

		return (
			<div className="alert-dialog__body">
				{content.map((item, index) => this.renderContentItem(item, index))}
			</div>
		);
	}

	render() {
		return (
			<BaseDialog
				buttons={this.getButtons()}
				className={`alert-dialog ${this.props.className || ''}`.trim()}
				maxWidth="xs"
				onButtonPress={this.handleAction.bind(this)}
				open={this.props.open !== false}
				showClose
				titleKey={this.props.title}
			>
				{this.renderBody()}
			</BaseDialog>
		);
	}
}
