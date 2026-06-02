/// <reference path="../common/types.d.ts" />

import React, { Component } from 'react';
import AddIcon from '@mui/icons-material/Add';
import IconButton from '@mui/material/IconButton';
import RemoveIcon from '@mui/icons-material/Remove';
import Tooltip from '@mui/material/Tooltip';

import MusicNotebookContext from '../common/MusicNotebookContext.js';
import TextInput from './TextInput.jsx';
import LocaleString from './LocaleString.jsx';
import { getLocalizedText } from './localized-text.js';

const DEFAULT_MIN = 6;
const DEFAULT_MAX = 144;
const DEFAULT_STEP = 1;

/**
 * Renders a localized font-size number field with increment and decrement buttons.
 *
 * @extends {Component<FontSizePickerProps, FontSizePickerState>}
 */
export default class FontSizePicker extends Component {
	static contextType = MusicNotebookContext;

	constructor(props) {
		super(props);

		this.state = {
			inputValue: this.formatValue(props.value),
		};
	}

	componentDidUpdate(prevProps) {
		if (prevProps.value !== this.props.value) {
			this.setState({ inputValue: this.formatValue(this.props.value) });
		}
	}

	getMusicNotebookContext() {
		return /** @type {MusicNotebookContextValue} */ (this.context);
	}

	getLocalizedText(value, fallback = '') {
		return getLocalizedText(this.getMusicNotebookContext().localize, value, fallback);
	}

	getMin() {
		return Number.isFinite(Number(this.props.min)) ? Number(this.props.min) : DEFAULT_MIN;
	}

	getMax() {
		return Number.isFinite(Number(this.props.max)) ? Number(this.props.max) : DEFAULT_MAX;
	}

	getStep() {
		const step = Number(this.props.step);

		return Number.isFinite(step) && step > 0 ? step : DEFAULT_STEP;
	}

	getNumericValue(fallback = this.getMin()) {
		const draftValue = Number(this.state.inputValue);
		const propValue = Number(this.props.value);

		if (Number.isFinite(draftValue)) {
			return draftValue;
		}

		if (Number.isFinite(propValue)) {
			return propValue;
		}

		return fallback;
	}

	formatValue(value) {
		if (!Number.isFinite(Number(value))) {
			return '';
		}

		return String(value);
	}

	clamp(value) {
		const min = this.getMin();
		const max = this.getMax();

		return Math.min(Math.max(value, min), max);
	}

	emitChange(value, event) {
		const nextValue = this.clamp(roundToStep(value, this.getStep()));

		this.setState({ inputValue: String(nextValue) });
		this.props.onChange?.(nextValue, event);
	}

	handleInputChange = (event) => {
		const inputValue = event.target.value;
		const numericValue = Number(inputValue);

		this.setState({ inputValue });

		if (Number.isFinite(numericValue)) {
			this.props.onChange?.(this.clamp(numericValue), event);
		}
	};

	handleInputBlur = (event) => {
		this.emitChange(this.getNumericValue(), event);
		this.props.onBlur?.(event);
	};

	handleDecrement = (event) => {
		this.emitChange(this.getNumericValue() - this.getStep(), event);
	};

	handleIncrement = (event) => {
		this.emitChange(this.getNumericValue() + this.getStep(), event);
	};

	isAtMinimum() {
		return this.getNumericValue() <= this.getMin();
	}

	isAtMaximum() {
		return this.getNumericValue() >= this.getMax();
	}

	renderIconButton({ ariaLabel, fallback, icon, onClick, disabled }) {
		const labelText = this.getLocalizedText(ariaLabel, fallback);
		const label = <LocaleString phrase={ariaLabel} />;

		return (
			<Tooltip title={label} describeChild>
				<span className="font-size-picker__button-wrap">
					<IconButton
						aria-label={labelText}
						className="font-size-picker__button"
						disabled={disabled}
						onClick={onClick}
						size="small"
						type="button"
					>
						{icon}
					</IconButton>
				</span>
			</Tooltip>
		);
	}

	render() {
		const {
			className,
			decrementLabel = 'format.font_size.decrease',
			disabled = false,
			helperText,
			incrementLabel = 'format.font_size.increase',
			label = 'format.font_size',
			labelFallback = 'Font size',
			size = 'small',
		} = this.props;
		const labelText = this.getLocalizedText(label, labelFallback);

		return (
			<div className={className ? `font-size-picker ${className}` : 'font-size-picker'}>
				<span className="font-size-picker__label">
					<LocaleString phrase={label} />
				</span>
				<div className="font-size-picker__stepper" role="group" aria-label={labelText}>
					{this.renderIconButton({
						ariaLabel: decrementLabel,
						disabled: disabled || this.isAtMinimum(),
						fallback: 'Decrease font size',
						icon: <RemoveIcon aria-hidden="true" fontSize="small" />,
						onClick: this.handleDecrement,
					})}
					<TextInput
						ariaLabel={label}
						className="font-size-picker__input"
						disabled={disabled}
						fullWidth={false}
						helperText={helperText}
						label=""
						onBlur={this.handleInputBlur}
						onChange={this.handleInputChange}
						size={size}
						slotProps={{
							htmlInput: {
								inputMode: 'decimal',
								max: this.getMax(),
								min: this.getMin(),
								step: this.getStep(),
								type: 'number',
							},
						}}
						value={this.state.inputValue}
					/>
					{this.renderIconButton({
						ariaLabel: incrementLabel,
						disabled: disabled || this.isAtMaximum(),
						fallback: 'Increase font size',
						icon: <AddIcon aria-hidden="true" fontSize="small" />,
						onClick: this.handleIncrement,
					})}
				</div>
			</div>
		);
	}
}

function roundToStep(value, step) {
	return Math.round(value / step) * step;
}
