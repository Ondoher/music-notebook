import React, { useContext, useId } from 'react';
import Checkbox from '@mui/material/Checkbox';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormHelperText from '@mui/material/FormHelperText';

import MusicNotebookContext from '../common/MusicNotebookContext.js';
import { getLocalizedText } from './localized-text.js';

export default function BaseCheckbox({
	ariaLabel,
	checked = false,
	checkboxProps = {},
	className,
	error = false,
	helperText,
	id,
	label,
	labelFallback = '',
	onChange,
	size,
	variant,
	...formControlProps
}) {
	const fallbackId = useId();
	const { localize } = useContext(MusicNotebookContext);
	const checkboxId = id || `base-checkbox-${fallbackId}`;
	const helperId = helperText ? `${checkboxId}-helper` : undefined;
	const resolvedLabel = getLocalizedText(localize, label, labelFallback);
	const resolvedAriaLabel = getLocalizedText(localize, ariaLabel, resolvedLabel);
	const resolvedHelperText = getLocalizedText(localize, helperText);

	return (
		<FormControl
			{...formControlProps}
			className={className ? `base-checkbox ${className}` : 'base-checkbox'}
			error={Boolean(error)}
			fullWidth={formControlProps.fullWidth ?? true}
			size={size}
			variant={variant}
		>
			<FormControlLabel
				control={(
					<Checkbox
						{...checkboxProps}
						checked={checked}
						id={checkboxId}
						slotProps={{
							...checkboxProps.slotProps,
							input: {
								...(checkboxProps.slotProps?.input || {}),
								'aria-describedby': helperId,
								'aria-label': resolvedAriaLabel,
							},
						}}
						onChange={(event) => onChange?.(event.target.checked, event)}
						size={size}
					/>
				)}
				label={resolvedLabel}
			/>
			{resolvedHelperText ? (
				<FormHelperText id={helperId}>{resolvedHelperText}</FormHelperText>
			) : null}
		</FormControl>
	);
}
