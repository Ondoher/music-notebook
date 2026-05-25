import React, { useEffect, useRef, useState } from 'react';
import HelperText from './HelperText.jsx';
import KeyPicker from './KeyPicker.jsx';
import LocaleString from './LocaleString.jsx';
import {
	MODE_OPTIONS,
	SCALE_TYPE_OPTIONS,
	buildKeyboardScalePayload,
} from '../shared/scales/scale-builder.js';

export default function ScaleBuilder({
	initialKey = 'C',
	initialMode = 'ionian',
	initialScaleType = 'major',
	label = 'Scale',
	onScaleChange,
	selectedKey,
	showKey = true,
}) {
	const [scaleKey, setScaleKey] = useState(initialKey);
	const [scaleType, setScaleType] = useState(initialScaleType);
	const [mode, setMode] = useState(initialMode);
	const activeKey = selectedKey ?? scaleKey;
	const result = buildKeyboardScalePayload({ key: activeKey, mode, scaleType });
	const helperText = result.error || result.scale?.name || '';
	const hasMountedRef = useRef(false);

	useEffect(() => {
		if (selectedKey === undefined) {
			return;
		}

		if (hasMountedRef.current) {
			onScaleChange?.(buildKeyboardScalePayload({ key: selectedKey, mode, scaleType }));
		}

		hasMountedRef.current = true;
	}, [mode, scaleType, selectedKey]);

	return (
		<div
			className={result.error ? 'mn-scale-builder invalid' : 'mn-scale-builder'}
			onClick={stopEditorEvent}
			onKeyDown={stopEditorEvent}
			onMouseDown={stopEditorEvent}
			onPointerDown={stopEditorEvent}
		>
			<div className="mn-scale-builder-label">{renderLabel(label)}</div>
			{showKey ? (
				<KeyPicker
					className="mn-scale-builder-field"
					onKeyChange={(key) => updateScale({ key })}
					value={activeKey}
				/>
			) : null}
			<label className="mn-scale-builder-field">
				<span><LocaleString fallback="Type" phrase="music.controls.type" /></span>
				<select
					onChange={(event) => updateScale({ scaleType: event.target.value })}
					onInput={(event) => updateScale({ scaleType: event.target.value })}
					value={scaleType}
				>
					{SCALE_TYPE_OPTIONS.map((typeOption) => (
						<option key={typeOption.value} value={typeOption.value}>
							<LocaleString fallback={typeOption.label} phrase={typeOption.phrase} />
						</option>
					))}
				</select>
			</label>
			{scaleType === 'mode' ? (
				<label className="mn-scale-builder-field">
					<span><LocaleString fallback="Mode" phrase="music.controls.mode" /></span>
					<select
						onChange={(event) => updateScale({ mode: event.target.value })}
						onInput={(event) => updateScale({ mode: event.target.value })}
						value={mode}
					>
						{MODE_OPTIONS.map((modeOption) => (
							<option key={modeOption.value} value={modeOption.value}>
								<LocaleString fallback={modeOption.label} phrase={modeOption.phrase} />
							</option>
						))}
					</select>
				</label>
			) : null}
			<HelperText
				className="mn-scale-builder-helper"
				error={Boolean(result.error)}
				helperText={helperText}
				localize={false}
			/>
		</div>
	);

	function updateScale(nextValues) {
		const nextScaleKey = nextValues.key ?? activeKey;
		const nextScaleType = nextValues.scaleType || scaleType;
		const nextMode = nextValues.mode || mode;
		const nextResult = buildKeyboardScalePayload({
			key: nextScaleKey,
			mode: nextMode,
			scaleType: nextScaleType,
		});

		if (selectedKey === undefined && nextValues.key !== undefined) {
			setScaleKey(nextValues.key);
		}

		if (nextValues.scaleType) {
			setScaleType(nextValues.scaleType);
		}

		if (nextValues.mode) {
			setMode(nextValues.mode);
		}

		onScaleChange?.(nextResult);
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
