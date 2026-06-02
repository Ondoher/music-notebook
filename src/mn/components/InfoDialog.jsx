/// <reference path="./types/InfoDialog.d.ts" />

import React, { Component } from 'react';

import BaseDialog from './BaseDialog.jsx';
import LocaleString from './LocaleString.jsx';
import Markdown from './Markdown.jsx';

/**
 * Renders localized phrase or markdown information in a dismissible dialog.
 *
 * @extends {Component<InfoDialogProps>}
 */
export default class InfoDialog extends Component {
	getButtons() {
		return this.props.buttons || [
			{
				id: 'done',
				labelKey: this.props.closeLabel || 'common.close',
				priority: 'primary',
			},
		];
	}

	handleAction(buttonId) {
		if (buttonId === 'close' || buttonId === 'done') {
			this.props.onClose?.();
			return;
		}

		this.props.onAction?.(buttonId);
	}

	renderContent() {
		if (!this.props.content) {
			return null;
		}

		if (this.props.markdown) {
			return (
				<Markdown
					name={String(this.props.content)}
					replacements={this.props.replacements}
				/>
			);
		}

		const localeProps = typeof this.props.content === 'object'
			? this.props.content
			: {
				phrase: this.props.content,
				replacements: this.props.replacements,
			};

		return (
			<LocaleString
				{...localeProps}
				html={this.props.html === true || localeProps.html === true}
			/>
		);
	}

	render() {
		return (
			<BaseDialog
				className={`info-dialog ${this.props.className || ''}`.trim()}
				buttons={this.getButtons()}
				maxWidth={this.props.maxWidth || 'sm'}
				onButtonPress={this.handleAction.bind(this)}
				open={this.props.open !== false}
				showClose
				titleKey={this.props.title}
			>
				<div className="info-dialog__body">
					{this.renderContent()}
				</div>
			</BaseDialog>
		);
	}
}
