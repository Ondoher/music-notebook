import React from 'react';
import FormHelperText from '@mui/material/FormHelperText';

import LocaleString from './LocaleString.jsx';

export default function HelperText({
	children,
	className,
	error = false,
	helperText,
	id,
	localize = true,
	...formHelperTextProps
}) {
	const hasChildren = children !== undefined && children !== null;

	if (!hasChildren && !helperText) {
		return null;
	}

	return (
		<FormHelperText
			{...formHelperTextProps}
			aria-live={error ? 'assertive' : 'polite'}
			className={className}
			error={error}
			id={id}
			role={error ? 'alert' : undefined}
		>
			{renderContent()}
		</FormHelperText>
	);

	function renderContent() {
		if (hasChildren) {
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
}
