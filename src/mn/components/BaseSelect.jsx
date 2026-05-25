import React, { useContext, useId } from 'react';
import FormControl from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';

import MusicNotebookContext from '../common/MusicNotebookContext.js';
import { getLocalizedText } from './localized-text.js';

export default function BaseSelect({
	className,
	error = false,
	helperText,
	id,
	label,
	labelFallback = '',
	localizeOptions = true,
	onChange,
	options = [],
	selectProps = {},
	size,
	value,
	variant = 'outlined',
	...formControlProps
}) {
	const fallbackId = useId();
	const { localize } = useContext(MusicNotebookContext);
	const selectId = id || `base-select-${fallbackId}`;
	const labelId = `${selectId}-label`;
	const helperId = helperText ? `${selectId}-helper` : undefined;
	const resolvedLabel = getLocalizedText(localize, label, labelFallback);
	const resolvedHelperText = getLocalizedText(localize, helperText);

	return (
		<FormControl
			{...formControlProps}
			className={className ? `base-select ${className}` : 'base-select'}
			error={Boolean(error)}
			fullWidth={formControlProps.fullWidth ?? true}
			size={size}
			variant={variant}
		>
			<InputLabel id={labelId}>{resolvedLabel}</InputLabel>
			<Select
				{...selectProps}
				aria-describedby={helperId}
				id={selectId}
				label={resolvedLabel}
				labelId={labelId}
				onChange={(event, child) => onChange?.(event.target.value, event, child)}
				value={value}
			>
				{options.map((option) => {
					const optionLabel = localizeOptions
						? getLocalizedText(localize, option.label, option.fallback)
						: option.label;
					const ariaLabel = getLocalizedText(localize, option.ariaLabel, optionLabel);

					return (
						<MenuItem
							{...option.props}
							aria-label={ariaLabel}
							key={option.value ?? 'empty'}
							value={option.value}
						>
							{optionLabel}
						</MenuItem>
					);
				})}
			</Select>
			{resolvedHelperText ? (
				<FormHelperText id={helperId}>{resolvedHelperText}</FormHelperText>
			) : null}
		</FormControl>
	);
}
