import React, { useContext } from 'react';
import TextField from '@mui/material/TextField';

import MusicNotebookContext from '../common/MusicNotebookContext.js';
import { getLocalizedText } from './localized-text.js';

export default function BaseTextInput({
	ariaLabel,
	autoComplete,
	autocomplete,
	className,
	helperText,
	label,
	labelFallback = '',
	localizeHelperText = true,
	slotProps,
	variant,
	...textFieldProps
}) {
	const { localize } = useContext(MusicNotebookContext);
	const resolvedLabel = getLocalizedText(localize, label, labelFallback);
	const resolvedAriaLabel = ariaLabel
		? getLocalizedText(localize, ariaLabel, resolvedLabel)
		: undefined;
	const resolvedHelperText = localizeHelperText
		? getLocalizedText(localize, helperText)
		: helperText;
	const inputSlotProps = {
		...(slotProps?.htmlInput || {}),
		...(resolvedAriaLabel ? { 'aria-label': resolvedAriaLabel } : {}),
		...(autoComplete || autocomplete ? { autoComplete: autoComplete || autocomplete } : {}),
	};

	return (
		<TextField
			{...textFieldProps}
			className={className ? `base-text-input ${className}` : 'base-text-input'}
			helperText={resolvedHelperText || undefined}
			label={resolvedLabel}
			slotProps={{
				...slotProps,
				htmlInput: inputSlotProps,
			}}
			variant={variant || 'outlined'}
		/>
	);
}
