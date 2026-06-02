/// <reference path="../common/types.d.ts" />
/// <reference path="./types/BaseDialog.d.ts" />

import React, { Component } from 'react';
import MuiButton from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';

import MusicNotebookContext from '../common/MusicNotebookContext.js';
import { getLocalizedText } from './localized-text.js';

let nextDialogId = 1;

/**
 * Renders the shared Music Notebook dialog shell.
 *
 * @extends {Component<BaseDialogProps, BaseDialogState>}
 */
export default class BaseDialog extends Component {
	static contextType = MusicNotebookContext;

	/**
	 * Initializes dialog shell state from the current props.
	 *
	 * @param {BaseDialogProps} props
	 */
	constructor(props) {
		super(props);

		this.instanceId = nextDialogId;
		nextDialogId += 1;

		this.titleId = props.titleId || `mn-base-dialog-${this.instanceId}-title`;
		this.descriptionId = props.descriptionId || `mn-base-dialog-${this.instanceId}-description`;
		this.announcementId = `mn-base-dialog-${this.instanceId}-announcement`;

		this.state = this.makeInitialState(props);

		this.handleCloseButton = this.handleCloseButton.bind(this);
		this.handleDialogClose = this.handleDialogClose.bind(this);
		this.handleSubmit = this.handleSubmit.bind(this);
	}

	/**
	 * Reinitializes shell state when the explicit reset token changes.
	 *
	 * @param {BaseDialogProps} prevProps
	 * @returns {void}
	 */
	componentDidUpdate(prevProps) {
		if (prevProps.resetToken !== this.props.resetToken) {
			this.setState(this.makeInitialState(this.props));
		}
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
	 * Builds the shell state initialized from props.
	 *
	 * @param {BaseDialogProps} props
	 * @returns {BaseDialogState}
	 */
	makeInitialState(props) {
		return {
			announcement: null,
			buttons: props.buttons || [],
			description: this.makeTextSpec(props.description, props.descriptionKey, props.descriptionId),
			title: this.makeTextSpec(props.title, props.titleKey, props.titleId),
		};
	}

	/**
	 * Creates a normalized text spec from literal-ish and phrase-key inputs.
	 *
	 * @param {BaseDialogTextSpec | undefined} value
	 * @param {string | undefined} key
	 * @param {string | undefined} id
	 * @returns {BaseDialogTextSpec | null}
	 */
	makeTextSpec(value, key, id) {
		if (value && typeof value === 'object') {
			return {
				...value,
				id: value.id || id,
			};
		}

		if (key) {
			return {
				id,
				labelKey: key,
			};
		}

		if (value) {
			return {
				id,
				labelKey: String(value),
			};
		}

		return id ? { id } : null;
	}

	/**
	 * Gets the CSS class list for the dialog root.
	 *
	 * @returns {string}
	 */
	getClassName() {
		return [
			'mn-base-dialog',
			this.props.className || '',
		].filter(Boolean).join(' ');
	}

	/**
	 * Resolves localized text through the current localization service.
	 *
	 * @param {BaseDialogTextSpec | string | undefined | null} spec
	 * @param {string} [fallback]
	 * @returns {string}
	 */
	getLocalizedText(spec, fallback = '') {
		const localize = this.getMusicNotebookContext().localize;

		if (!spec) {
			return fallback;
		}

		if (typeof spec === 'string') {
			return getLocalizedText(localize, spec, fallback);
		}

		return getLocalizedText(localize, spec.labelKey || spec.phrase, spec.label || spec.fallback || fallback);
	}

	/**
	 * Gets the current title text.
	 *
	 * @returns {string}
	 */
	getTitleText() {
		return this.getLocalizedText(this.state.title);
	}

	/**
	 * Gets the current description text.
	 *
	 * @returns {string}
	 */
	getDescriptionText() {
		return this.getLocalizedText(this.state.description);
	}

	/**
	 * Gets the current title id.
	 *
	 * @returns {string}
	 */
	getTitleId() {
		return this.state.title?.id || this.props.titleId || this.titleId;
	}

	/**
	 * Gets the current description id when a description is shown.
	 *
	 * @returns {string | undefined}
	 */
	getDescriptionId() {
		if (!this.getDescriptionText()) {
			return undefined;
		}

		return this.state.description?.id || this.props.descriptionId || this.descriptionId;
	}

	/**
	 * Sets the dialog title from a child component.
	 *
	 * @param {BaseDialogTextSpec} title
	 * @returns {void}
	 */
	setTitle(title) {
		this.setState({
			title: this.makeTextSpec(title, undefined, this.getTitleId()),
		});
	}

	/**
	 * Sets the dialog description from a child component.
	 *
	 * @param {BaseDialogTextSpec | null} description
	 * @returns {void}
	 */
	setDescription(description) {
		this.setState({
			description: description
				? this.makeTextSpec(description, undefined, this.getDescriptionId() || this.descriptionId)
				: null,
		});
	}

	/**
	 * Updates one dialog button from a child component.
	 *
	 * @param {string} buttonId
	 * @param {Partial<BaseDialogButton>} patch
	 * @returns {void}
	 */
	setButtonState(buttonId, patch) {
		this.setState((state) => ({
			buttons: state.buttons.map((button) => (
				button.id === buttonId
					? { ...button, ...patch }
					: button
			)),
		}));
	}

	/**
	 * Announces an important dialog state change.
	 *
	 * @param {BaseDialogAnnouncement | string} announcement
	 * @returns {void}
	 */
	announce(announcement) {
		const spec = typeof announcement === 'string'
			? { labelKey: announcement }
			: announcement;

		this.setState({
			announcement: {
				priority: 'polite',
				...spec,
			},
		});
	}

	/**
	 * Requests submit through the shared button callback.
	 *
	 * @returns {void}
	 */
	handleSubmit() {
		this.props.onButtonPress?.('submit');
	}

	/**
	 * Gets the injected child dialog API.
	 *
	 * @returns {BaseDialogController}
	 */
	getDialogController() {
		return {
			announce: this.announce.bind(this),
			setButtonState: this.setButtonState.bind(this),
			setDescription: this.setDescription.bind(this),
			setTitle: this.setTitle.bind(this),
			submit: this.handleSubmit,
		};
	}

	/**
	 * Normalizes and validates configured buttons.
	 *
	 * @returns {BaseDialogButton[]}
	 */
	getNormalizedButtons() {
		const seenIds = new Set();
		let primarySeen = false;

		return (this.state.buttons || []).map((button) => {
			const normalized = {
				enabled: true,
				pressable: false,
				pressed: 'unpressed',
				priority: 'secondary',
				visibility: 'show',
				...button,
			};

			if (seenIds.has(normalized.id)) {
				console.warn(`BaseDialog received a duplicate button id: ${normalized.id}`);
			}
			seenIds.add(normalized.id);

			if (normalized.id === 'close') {
				console.warn('BaseDialog action button id "close" is reserved for the close affordance.');
			}

			if (normalized.priority === 'primary') {
				if (primarySeen) {
					console.warn(`BaseDialog received more than one primary button; treating "${normalized.id}" as secondary.`);
					return {
						...normalized,
						priority: 'secondary',
					};
				}

				primarySeen = true;
			}

			return normalized;
		});
	}

	/**
	 * Handles dialog close requests from MUI.
	 *
	 * @returns {void}
	 */
	handleDialogClose() {
		if (this.props.showClose) {
			this.props.onButtonPress?.('close');
		}
	}

	/**
	 * Handles the visible close icon.
	 *
	 * @returns {void}
	 */
	handleCloseButton() {
		this.props.onButtonPress?.('close');
	}

	/**
	 * Handles action button activation.
	 *
	 * @param {BaseDialogButton} button
	 * @param {React.MouseEvent<HTMLElement>} event
	 * @returns {void}
	 */
	handleButtonPress(button, event) {
		if (button.enabled === false || button.enabled === 'disabled') {
			event.preventDefault();
			event.stopPropagation();
			return;
		}

		this.props.onButtonPress?.(button.id);
	}

	/**
	 * Renders the optional close affordance.
	 *
	 * @returns {React.ReactElement | null}
	 */
	renderCloseButton() {
		if (!this.props.showClose) {
			return null;
		}

		const label = this.getLocalizedText(
			this.props.closeLabelKey || 'common.close',
			'Close',
		);

		return (
			<IconButton
				aria-label={label}
				className="mn-base-dialog__close"
				onClick={this.handleCloseButton}
				title={label}
				type="button"
			>
				<CloseIcon />
			</IconButton>
		);
	}

	/**
	 * Renders the dialog title region.
	 *
	 * @returns {React.ReactElement}
	 */
	renderTitle() {
		return (
			<DialogTitle className="mn-base-dialog__title" id={this.getTitleId()}>
				<span className="mn-base-dialog__title-text">
					{this.getTitleText()}
				</span>
				{this.renderCloseButton()}
			</DialogTitle>
		);
	}

	/**
	 * Renders the optional description.
	 *
	 * @returns {React.ReactElement | null}
	 */
	renderDescription() {
		const description = this.getDescriptionText();

		if (!description) {
			return null;
		}

		return (
			<p className="mn-base-dialog__description" id={this.getDescriptionId()}>
				{description}
			</p>
		);
	}

	/**
	 * Renders the single child with the dialog controller injected.
	 *
	 * @returns {React.ReactNode}
	 */
	renderChild() {
		const child = React.Children.only(this.props.children);

		if (!React.isValidElement(child)) {
			return child;
		}

		return React.cloneElement(child, {
			dialog: this.getDialogController(),
		});
	}

	/**
	 * Renders one configured dialog action.
	 *
	 * @param {BaseDialogButton} button
	 * @returns {React.ReactElement | null}
	 */
	renderButton(button, index) {
		if (button.visibility === 'hide') {
			return null;
		}

		const isDisabled = button.enabled === false || button.enabled === 'disabled';
		const label = this.getLocalizedText(button.labelKey);
		const className = [
			this.props.buttonStyle === 'link' ? 'mn-base-dialog__link-action' : 'mn-base-dialog__button',
			`mn-base-dialog__button-${button.priority}`,
			button.pressed === 'pressed' ? 'mn-base-dialog__button-pressed' : '',
			isDisabled ? 'mn-base-dialog__button-disabled' : '',
		].filter(Boolean).join(' ');
		const ariaPressed = button.pressable
			? (button.pressed === 'pressed' ? 'true' : 'false')
			: undefined;

		if (this.props.buttonStyle === 'link') {
			return (
				<button
					aria-disabled={isDisabled ? 'true' : undefined}
					aria-pressed={ariaPressed}
					className={className}
					id={button.id}
					key={`${button.id}-${index}`}
					onClick={(event) => this.handleButtonPress(button, event)}
					type="button"
				>
					{label}
				</button>
			);
		}

		return (
			<MuiButton
				aria-disabled={isDisabled ? 'true' : undefined}
				aria-pressed={ariaPressed}
				className={className}
				id={button.id}
				key={`${button.id}-${index}`}
				onClick={(event) => this.handleButtonPress(button, event)}
				type="button"
				variant={button.priority === 'primary' ? 'contained' : 'outlined'}
			>
				{label}
			</MuiButton>
		);
	}

	/**
	 * Renders configured action buttons.
	 *
	 * @returns {React.ReactElement | null}
	 */
	renderActions() {
		const buttons = this.getNormalizedButtons();

		if (!buttons.length) {
			return null;
		}

		return (
			<DialogActions className={`mn-base-dialog__actions ${this.props.actionsClassName || ''}`.trim()}>
				{buttons.map((button, index) => this.renderButton(button, index))}
			</DialogActions>
		);
	}

	/**
	 * Renders the live announcement region.
	 *
	 * @returns {React.ReactElement}
	 */
	renderAnnouncement() {
		const announcement = this.state.announcement;
		const priority = announcement?.priority || 'polite';
		const text = this.getLocalizedText(announcement);

		return (
			<div
				aria-live={priority}
				className="mn-screen-reader-only mn-base-dialog__announcement"
				id={this.announcementId}
			>
				{text}
			</div>
		);
	}

	/**
	 * Renders the dialog.
	 *
	 * @returns {React.ReactElement}
	 */
	render() {
		return (
			<Dialog
				aria-describedby={this.getDescriptionId()}
				aria-labelledby={this.getTitleId()}
				className={this.getClassName()}
				fullWidth={this.props.fullWidth}
				maxWidth={this.props.maxWidth || 'sm'}
				onClose={this.handleDialogClose}
				open={this.props.open}
			>
				{this.renderTitle()}
				<DialogContent className={`mn-base-dialog__content ${this.props.contentClassName || ''}`.trim()}>
					{this.renderDescription()}
					{this.renderChild()}
				</DialogContent>
				{this.renderActions()}
				{this.renderAnnouncement()}
			</Dialog>
		);
	}
}
