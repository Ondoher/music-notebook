import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import HelperText from './HelperText.jsx';
import KeyPicker from './KeyPicker.jsx';
import LocaleString from './LocaleString.jsx';
import { getChordInversionOptions } from '../shared/chords/chord-builder.js';
import {
	buildKeyboardProgressionPayload,
} from '../shared/progressions/progression-builder.js';

export default function ProgressionBuilder({
	initialArpeggiate = false,
	initialKey = 'C',
	initialRomanNumeral = 'I',
	label = 'Chord degree',
	onProgressionChange,
	selectedKey,
	showKey = true,
}) {
	const fallbackId = useId();
	const [progressionKey, setProgressionKey] = useState(initialKey);
	const [romanNumeral, setRomanNumeral] = useState(initialRomanNumeral);
	const [arpeggiate, setArpeggiate] = useState(initialArpeggiate);
	const [inversionOverride, setInversionOverride] = useState(null);
	const activeKey = selectedKey ?? progressionKey;
	const result = useMemo(
		() => buildKeyboardProgressionPayload(
			{ key: activeKey, romanNumeral },
			getProgressionOptions(inversionOverride, arpeggiate),
		),
		[activeKey, romanNumeral, arpeggiate, inversionOverride],
	);
	const hasMountedRef = useRef(false);
	const helperId = `mn-progression-builder-helper-${fallbackId}`;
	const helperText = result.error || result.chord?.name || '';
	const inversionOptions = getChordInversionOptions(result.chord?.notes.length || 1);
	const selectedInversion = result.payload?.inversion || 0;

	useEffect(() => {
		if (selectedKey === undefined) {
			return;
		}

		if (hasMountedRef.current) {
			onProgressionChange?.(buildKeyboardProgressionPayload(
				{ key: selectedKey, romanNumeral },
				getProgressionOptions(inversionOverride, arpeggiate),
			));
		}

		hasMountedRef.current = true;
	}, [arpeggiate, inversionOverride, romanNumeral, selectedKey]);

	return (
		<div
			className={result.error ? 'mn-progression-builder invalid' : 'mn-progression-builder'}
			onClick={stopEditorEvent}
			onKeyDown={stopEditorEvent}
			onMouseDown={stopEditorEvent}
			onPointerDown={stopEditorEvent}
		>
			<div className="mn-progression-builder-label">{renderLabel(label)}</div>
			{showKey ? (
				<KeyPicker
					className="mn-progression-builder-field"
					onKeyChange={(key) => updateProgression({ key })}
					value={activeKey}
				/>
			) : null}
			<label className="mn-progression-builder-field">
				<span><LocaleString fallback="Roman numeral" phrase="music.controls.roman_numeral" /></span>
				<input
					aria-describedby={helperText ? helperId : undefined}
					aria-invalid={Boolean(result.error)}
					onChange={(event) => updateProgression({ romanNumeral: event.target.value })}
					value={romanNumeral}
				/>
			</label>
			<label className="mn-progression-builder-field">
				<span><LocaleString fallback="Inversion" phrase="music.controls.inversion" /></span>
				<select
					onChange={(event) => updateProgression({ inversion: Number(event.target.value) })}
					onInput={(event) => updateProgression({ inversion: Number(event.target.value) })}
					value={selectedInversion}
				>
					{inversionOptions.map((option) => (
						<option key={option.value} value={option.value}>
							<LocaleString fallback={option.label} phrase={option.phrase} />
						</option>
					))}
				</select>
			</label>
			<label className="mn-progression-builder-field mn-progression-builder-checkbox music-display-options-field-checkbox">
				<input
					checked={arpeggiate}
					onChange={(event) => updateProgression({ arpeggiate: event.target.checked })}
					type="checkbox"
				/>
				<span><LocaleString fallback="Arpeggiate" phrase="music.controls.arpeggiate" /></span>
			</label>
			<HelperText
				className="mn-progression-builder-helper"
				error={Boolean(result.error)}
				helperText={helperText}
				id={helperId}
				localize={false}
			/>
		</div>
	);

	function updateProgression(nextValues) {
		const nextKey = nextValues.key ?? activeKey;
		const nextRomanNumeral = nextValues.romanNumeral ?? romanNumeral;
		const nextArpeggiate = nextValues.arpeggiate ?? arpeggiate;
		const nextInversionOverride = nextValues.inversion ?? inversionOverride;
		const nextResult = buildKeyboardProgressionPayload({
			key: nextKey,
			romanNumeral: nextRomanNumeral,
		}, getProgressionOptions(nextInversionOverride, nextArpeggiate));

		if (selectedKey === undefined && nextValues.key !== undefined) {
			setProgressionKey(nextValues.key);
		}

		if (nextValues.romanNumeral !== undefined) {
			setRomanNumeral(nextValues.romanNumeral);
		}

		if (nextValues.inversion !== undefined) {
			setInversionOverride(nextResult.payload?.inversion ?? nextValues.inversion);
		}

		if (nextValues.arpeggiate !== undefined) {
			setArpeggiate(nextArpeggiate);
		}

		onProgressionChange?.(nextResult);
	}
}

function getProgressionOptions(inversionOverride, arpeggiate) {
	return {
		...(arpeggiate === true ? { arpeggiate: true } : {}),
		...(Number.isInteger(inversionOverride) ? { inversion: inversionOverride } : {}),
	};
}

function stopEditorEvent(event) {
	event.stopPropagation();
}

function renderLabel(label) {
	return typeof label === 'object'
		? <LocaleString {...label} />
		: label;
}
