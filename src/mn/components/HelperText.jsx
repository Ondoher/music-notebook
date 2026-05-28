import React, { Component } from 'react';
import FormHelperText from '@mui/material/FormHelperText';

import LocaleString from './LocaleString.jsx';

/**
 * Renders accessible helper or validation text for a form control.
 *
 * @extends {Component<HelperTextProps>}
 */
export default class HelperText extends Component {
	/**
	 * Gets the semantic helper-text status.
	 *
	 * @returns {HelperTextStatus}
	 */
	getStatus() {
		return this.props.status || 'default';
	}

	/**
	 * Checks whether the helper text is a blocking validation error.
	 *
	 * @returns {boolean}
	 */
	isError() {
		return this.getStatus() === 'error';
	}

	/**
	 * Builds the helper text class list for semantic statuses.
	 *
	 * @returns {string | undefined}
	 */
	getClassName() {
		const classNames = [];
		const { className } = this.props;

		if (className) {
			classNames.push(className);
		}

		if (this.getStatus() === 'warning') {
			classNames.push('mn-helper-text-warning');
		}

		return classNames.length ? classNames.join(' ') : undefined;
	}

	/**
	 * Checks whether child content was supplied.
	 *
	 * @returns {boolean}
	 */
	hasChildren() {
		return this.props.children !== undefined && this.props.children !== null;
	}

	/**
	 * Chooses literal, child, or localized helper content.
	 *
	 * @returns {React.ReactNode}
	 */
	renderContent() {
		const {
			children,
			helperText,
			localize = true,
		} = this.props;

		if (this.hasChildren()) {
			return children;
		}

		if (!localize) {
			return helperText;
		}

		const localeProps = typeof helperText === 'object'
			? helperText
			: { phrase: helperText };

		return <LocaleString {...localeProps} />;
	}

	/**
	 * Renders helper text or null when no content is available.
	 *
	 * @returns {React.ReactElement | null}
	 */
	render() {
		const {
			children,
			helperText,
			id,
			localize,
			status,
			...formHelperTextProps
		} = this.props;
		const isError = this.isError();

		if (!this.hasChildren() && !helperText) {
			return null;
		}

		return (
			<FormHelperText
				{...formHelperTextProps}
				aria-live={isError ? 'assertive' : 'polite'}
				className={this.getClassName()}
				error={isError}
				id={id}
				role={isError ? 'alert' : undefined}
			>
				{this.renderContent()}
			</FormHelperText>
		);
	}
}
