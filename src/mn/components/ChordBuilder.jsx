import React, { useId, useMemo, useState } from 'react';
import {
	buildKeyboardChordPayload,
	getChordInversionOptions,
} from '../shared/chords/chord-builder.js';
import HelperText from './HelperText.jsx';
import LocaleString from './LocaleString.jsx';

export default function ChordBuilder({
	initialArpeggiate = false,
	initialInversion = 0,
	initialValue = 'Cdim7',
	label = 'Chord',
	onChordChange,
	value,
}) {
	const fallbackId = useId();
	const [uncontrolledValue, setUncontrolledValue] = useState(initialValue);
	const [arpeggiate, setArpeggiate] = useState(initialArpeggiate);
	const [inversion, setInversion] = useState(initialInversion);
	const chordText = value === undefined ? uncontrolledValue : value;
	const result = useMemo(
		() => buildKeyboardChordPayload(chordText, { arpeggiate, inversion }),
		[chordText, arpeggiate, inversion],
	);
	const helperId = `mn-chord-builder-helper-${fallbackId}`;
	const friendlyName = result.chord?.name || '';
	const helperText = result.error || friendlyName;
	const inversionOptions = getChordInversionOptions(result.chord?.notes.length || 1);

	return (
		<div
			className={result.error ? 'mn-chord-builder invalid' : 'mn-chord-builder'}
			onClick={stopEditorEvent}
			onKeyDown={stopEditorEvent}
			onMouseDown={stopEditorEvent}
			onPointerDown={stopEditorEvent}
		>
			<label className="mn-chord-builder-field">
				<span className="mn-chord-builder-label">{renderLabel(label)}</span>
				<input
					aria-describedby={helperText ? helperId : undefined}
					aria-invalid={Boolean(result.error)}
					onChange={handleChordChange}
					value={chordText}
				/>
			</label>
			<label className="mn-chord-builder-field">
				<span className="mn-chord-builder-label">
					<LocaleString fallback="Inversion" phrase="music.controls.inversion" />
				</span>
				<select
					onChange={handleInversionChange}
					onInput={handleInversionChange}
					value={result.inversion}
				>
					{inversionOptions.map((option) => (
						<option key={option.value} value={option.value}>
							<LocaleString fallback={option.label} phrase={option.phrase} />
						</option>
					))}
				</select>
			</label>
			<label className="mn-chord-builder-field mn-chord-builder-checkbox music-display-options-field-checkbox">
				<input
					checked={arpeggiate}
					onChange={handleArpeggiateChange}
					type="checkbox"
				/>
				<span><LocaleString fallback="Arpeggiate" phrase="music.controls.arpeggiate" /></span>
			</label>
			<HelperText
				className="mn-chord-builder-helper"
				error={Boolean(result.error)}
				helperText={helperText}
				id={helperId}
				localize={false}
			/>
		</div>
	);

	function handleChordChange(event) {
		const nextValue = event.target.value;
		const nextResult = buildKeyboardChordPayload(nextValue, { arpeggiate, inversion });

		setUncontrolledValue(nextValue);
		setInversion(nextResult.inversion);
		onChordChange?.(nextResult);
	}

	function handleInversionChange(event) {
		const nextInversion = Number(event.target.value);
		const nextResult = buildKeyboardChordPayload(chordText, { arpeggiate, inversion: nextInversion });

		setInversion(nextResult.inversion);
		onChordChange?.(nextResult);
	}

	function handleArpeggiateChange(event) {
		const nextArpeggiate = event.target.checked;
		const nextResult = buildKeyboardChordPayload(chordText, {
			arpeggiate: nextArpeggiate,
			inversion,
		});

		setArpeggiate(nextArpeggiate);
		onChordChange?.(nextResult);
	}
}

function stopEditorEvent(event) {
	event.stopPropagation();
}

function renderLabel(label) {
	return typeof label === 'object'
		? <LocaleString {...label} />
		: label;
}
