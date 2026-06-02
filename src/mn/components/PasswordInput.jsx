/// <reference path="./types/PasswordInput.d.ts" />
/// <reference path="../common/types.d.ts" />

import React, { Component } from 'react';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';

import MusicNotebookContext from '../common/MusicNotebookContext.js';
import TextInput from './TextInput.jsx';
import PasswordComplexity from './PasswordComplexity.jsx';
import { getLocalizedText } from './localized-text.js';

/** Renders a localized password input with visibility and rule feedback. */
export default class PasswordInput extends Component {
	static contextType = MusicNotebookContext;

	/**
	 * Initializes visibility and rule state.
	 *
	 * @param {PasswordInputProps} props
	 */
	constructor(props) {
		super(props);

		this.state = {
			showRules: false,
			visible: false,
			passed: this.checkRules(props.value || ''),
		};
	}

	/**
	 * Gets the typed Music Notebook context value.
	 *
	 * @returns {MusicNotebookContextValue}
	 */
	getMusicNotebookContext() {
		return /** @type {MusicNotebookContextValue} */ (this.context);
	}

	/**
	 * Resolves localized text through the current localization service.
	 *
	 * @param {LocalizedText} value
	 * @param {string} [fallback]
	 * @returns {string}
	 */
	getLocalizedText(value, fallback = '') {
		return getLocalizedText(this.getMusicNotebookContext().localize, value, fallback);
	}

	/**
	 * Gets password rules supplied to the component.
	 *
	 * @returns {PasswordComplexityRule[]} Returns configured rules.
	 */
	getRules() {
		return Array.isArray(this.props.rules) ? this.props.rules : [];
	}

	/**
	 * Checks password complexity rules.
	 *
	 * @param {unknown} value - Supplies the password value.
	 * @returns {Record<string, boolean>} Returns pass/fail state by rule name.
	 */
	checkRules(value) {
		const password = typeof value === 'string' ? value : '';
		const passed = {};

		this.getRules().forEach((rule) => {
			passed[rule.name] = Boolean(password.match(rule.pattern));
		});

		return passed;
	}

	/**
	 * Checks whether all configured rules pass.
	 *
	 * @param {Record<string, boolean>} passed - Supplies pass/fail state by rule name.
	 * @returns {boolean} Returns true when all rules pass.
	 */
	isValid(passed = this.state.passed) {
		const rules = this.getRules();

		return rules.length ? rules.every((rule) => passed[rule.name]) : true;
	}

	/**
	 * Handles password field changes.
	 *
	 * @param {React.ChangeEvent<HTMLInputElement>} event - Supplies the field change event.
	 * @returns {void}
	 */
	onChange(event) {
		const passed = this.checkRules(event.target.value);
		const valid = this.isValid(passed);

		this.setState({
			passed,
			showRules: this.getRules().length > 0,
		});

		this.props.onChange?.(event);
		this.props.onValidityChange?.(valid, passed);
	}

	/**
	 * Handles password field focus.
	 *
	 * @param {React.FocusEvent<HTMLInputElement>} event - Supplies the focus event.
	 * @returns {void}
	 */
	onFocus(event) {
		this.props.onFocus?.(event);
	}

	/**
	 * Handles password field blur.
	 *
	 * @param {React.FocusEvent<HTMLInputElement>} event - Supplies the blur event.
	 * @returns {void}
	 */
	onBlur(event) {
		this.setState({showRules: false});
		this.props.onBlur?.(event);
	}

	/** Toggles plain text password visibility. */
	toggleVisibility() {
		this.setState({visible: !this.state.visible});
	}

	/**
	 * Keeps the password field focused when the visibility button is pressed.
	 *
	 * @param {React.MouseEvent<HTMLButtonElement>} event - Supplies the mouse event.
	 * @returns {void}
	 */
	preventToggleMouseDownDefault(event) {
		event.preventDefault();
	}

	/**
	 * Renders the visibility toggle adornment.
	 *
	 * @returns {React.ReactElement}
	 */
	renderAdornment() {
		const visible = this.state.visible;
		const label = this.getLocalizedText(
			this.props.toggleVisibilityLabel || 'password.toggle_visibility',
			'Toggle password visibility',
		);
		const Icon = visible ? VisibilityIcon : VisibilityOffIcon;

		return (
			<InputAdornment position="end">
				<IconButton
					aria-label={label}
					aria-pressed={visible ? 'true' : 'false'}
					edge="end"
					onClick={this.toggleVisibility.bind(this)}
					onMouseDown={this.preventToggleMouseDownDefault}
				>
					<Icon />
				</IconButton>
			</InputAdornment>
		);
	}

	/**
	 * Renders optional password complexity feedback.
	 *
	 * @returns {React.ReactElement | null}
	 */
	renderComplexity() {
		if (!this.state.showRules) {
			return null;
		}

		return (
			<PasswordComplexity
				passed={this.state.passed}
				rules={this.getRules()}
			/>
		);
	}

	/**
	 * Renders the password input.
	 *
	 * @returns {React.ReactElement}
	 */
	render() {
		const {
			className,
			rules,
			toggleVisibilityLabel,
			onValidityChange,
			...textInputProps
		} = this.props;
		const nextClassName = className
			? `mn-password-input ${className}`
			: 'mn-password-input';

		return (
			<div className={nextClassName}>
				<TextInput
					{...textInputProps}
					className="mn-password-input__field"
					onBlur={this.onBlur.bind(this)}
					onChange={this.onChange.bind(this)}
					onFocus={this.onFocus.bind(this)}
					type={this.state.visible ? 'text' : 'password'}
					slotProps={{
						...(textInputProps.slotProps || {}),
						input: {
							...(textInputProps.slotProps?.input || {}),
							endAdornment: this.renderAdornment(),
						},
					}}
				/>
				{this.renderComplexity()}
			</div>
		);
	}
}
