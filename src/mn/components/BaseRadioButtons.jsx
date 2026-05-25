import React, { useContext, useId } from 'react';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormHelperText from '@mui/material/FormHelperText';
import FormLabel from '@mui/material/FormLabel';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';

import MusicNotebookContext from '../common/MusicNotebookContext.js';
import { getLocalizedText } from './localized-text.js';

export default function BaseRadioButtons({
	className,
	error = false,
	helperText,
	id,
	label,
	labelFallback = '',
	onChange,
	options = [],
	radioProps = {},
	row = false,
	value,
	variant,
	...formControlProps
}) {
	const fallbackId = useId();
	const { localize } = useContext(MusicNotebookContext);
	const groupId = id || `base-radio-buttons-${fallbackId}`;
	const helperId = helperText ? `${groupId}-helper` : undefined;
	const resolvedLabel = getLocalizedText(localize, label, labelFallback);
	const resolvedHelperText = getLocalizedText(localize, helperText);

	return (
		<FormControl
			{...formControlProps}
			className={className ? `base-radio-buttons ${className}` : 'base-radio-buttons'}
			error={Boolean(error)}
			variant={variant}
		>
			<FormLabel id={groupId}>{resolvedLabel}</FormLabel>
			<RadioGroup
				aria-describedby={helperId}
				aria-labelledby={groupId}
				onChange={(event) => onChange?.(event.target.value, event)}
				row={row}
				value={value}
			>
				{options.map((option) => (
					<FormControlLabel
						control={<Radio {...radioProps} />}
						disabled={option.disabled}
						key={option.value}
						label={getLocalizedText(localize, option.label, option.fallback)}
						value={option.value}
					/>
				))}
			</RadioGroup>
			{resolvedHelperText ? (
				<FormHelperText id={helperId}>{resolvedHelperText}</FormHelperText>
			) : null}
		</FormControl>
	);
}
