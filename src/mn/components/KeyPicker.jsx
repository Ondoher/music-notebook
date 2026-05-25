import React, { useId } from 'react';
import LocaleString from './LocaleString.jsx';
import { KEY_OPTIONS } from '../shared/keys/key-options.js';

export default function KeyPicker({
	className,
	label = { fallback: 'Key', phrase: 'music.controls.key' },
	onKeyChange,
	options = KEY_OPTIONS,
	value,
}) {
	const fallbackId = useId();
	const listId = `mn-key-picker-options-${fallbackId}`;

	return (
		<label className={className || 'mn-key-picker'}>
			<span>{renderLabel(label)}</span>
			<input
				list={listId}
				onChange={(event) => onKeyChange?.(event.target.value)}
				value={value}
			/>
			<datalist id={listId}>
				{options.map((option) => (
					<option key={option} value={option} />
				))}
			</datalist>
		</label>
	);
}

function renderLabel(label) {
	return typeof label === 'object'
		? <LocaleString {...label} />
		: label;
}
