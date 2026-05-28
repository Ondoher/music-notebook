import React from 'react';
import BaseDialog from './BaseDialog.jsx';
import BaseSelect from './BaseSelect.jsx';
import ChordBuilder from './ChordBuilder.jsx';
import KeyPicker from './KeyPicker.jsx';
import MusicPreview from './MusicPreview.jsx';
import ProgressionBuilder from './ProgressionBuilder.jsx';
import ScaleBuilder from './ScaleBuilder.jsx';

/**
 * Renders the reusable music embed edit dialog body.
 *
 * @extends {React.Component<MusicEmbedDialogProps>}
 */
class MusicEmbedDialogBody extends React.Component {
	/**
	 * Renders the localized edit-mode selector.
	 *
	 * @returns {React.ReactElement}
	 */
	renderEditModeSelect() {
		return (
			<BaseSelect
				className="music-keyboard-edit-mode"
				label="music.controls.edit_mode"
				labelFallback="Content type"
				onChange={this.props.onEditModeChange}
				options={[
					{ fallback: 'None', label: 'music.edit_mode.none', value: 'none' },
					{ fallback: 'Chord', label: 'music.edit_mode.chord', value: 'chord' },
					{ fallback: 'Scale', label: 'music.edit_mode.scale', value: 'scale' },
				]}
				size="small"
				value={this.props.editMode}
			/>
		);
	}

	/**
	 * Renders shared key and enharmonic controls.
	 *
	 * @returns {React.ReactElement}
	 */
	renderKeyControls() {
		const {
			displayKeyInput,
			displayKeyMode,
			editMode,
			enharmonicDisplayKey,
			onDisplayKeyChange,
			onDisplayKeyModeChange,
			onUseEnharmonicKeyChange,
			useEnharmonicKey,
		} = this.props;

		return (
			<div className={enharmonicDisplayKey ? 'music-key-control-row' : 'music-key-control-row music-key-control-row-single'}>
				<KeyPicker
					className="music-display-key-picker"
					enharmonicFieldClassName="music-key-enharmonic-option music-display-options-field-checkbox"
					enharmonicKey={enharmonicDisplayKey}
					keyFieldClassName="music-display-key-field"
					label={{ fallback: 'Key', phrase: 'music.controls.key' }}
					mode={displayKeyMode}
					modeFieldClassName="music-display-key-mode-field"
					onModeChange={onDisplayKeyModeChange}
					onKeyChange={onDisplayKeyChange}
					onUseEnharmonicKeyChange={onUseEnharmonicKeyChange}
					showMode={editMode === 'none' || editMode === 'chord' || editMode === 'progression'}
					size="small"
					useEnharmonicKey={useEnharmonicKey}
					value={displayKeyInput}
				/>
			</div>
		);
	}

	/**
	 * Renders the active music edit panel.
	 *
	 * @returns {React.ReactElement | null}
	 */
	renderEditPanel() {
		const {
			currentPayload,
			displayKeyMode,
			editMode,
			effectiveSelectedDisplayKey,
			initialChordValue,
			initialProgressionValue,
			onChordChange,
			onProgressionChange,
			onScaleChange,
		} = this.props;

		if (editMode === 'chord') {
			return (
				<ChordBuilder
					initialArpeggiate={currentPayload.arpeggiate === true}
					initialInversion={currentPayload.inversion || 0}
					initialKey={effectiveSelectedDisplayKey}
					initialKeyMode={displayKeyMode}
					initialValue={initialChordValue}
					label={{ fallback: 'Chord', phrase: 'music.edit_mode.chord' }}
					onChordChange={onChordChange}
					selectedKey={effectiveSelectedDisplayKey}
					selectedKeyMode={displayKeyMode}
					size="small"
				/>
			);
		}

		if (editMode === 'scale') {
			return (
				<ScaleBuilder
					initialKey={effectiveSelectedDisplayKey}
					label={{ fallback: 'Scale', phrase: 'music.edit_mode.scale' }}
					onScaleChange={onScaleChange}
					selectedKey={effectiveSelectedDisplayKey}
					showKey={false}
					size="small"
				/>
			);
		}

		if (editMode === 'progression') {
			return (
				<ProgressionBuilder
					initialArpeggiate={currentPayload.arpeggiate === true}
					initialKey={effectiveSelectedDisplayKey}
					initialKeyMode={displayKeyMode}
					initialRomanNumeral={initialProgressionValue}
					label={{ fallback: 'Chord degree', phrase: 'music.edit_mode.chord_degree' }}
					onProgressionChange={onProgressionChange}
					selectedKey={effectiveSelectedDisplayKey}
					selectedKeyMode={displayKeyMode}
					showKey={false}
					size="small"
				/>
			);
		}

		return null;
	}

	/**
	 * Renders the shared music preview.
	 *
	 * @returns {React.ReactElement}
	 */
	renderPreview() {
		return <MusicPreview payload={this.props.currentPayload} />;
	}

	/**
	 * Renders the music embed dialog.
	 *
	 * @returns {React.ReactElement}
	 */
	render() {
		const {
			children,
		} = this.props;

		return (
			<div className="music-keyboard-editor-dialog">
				{this.renderEditModeSelect()}
				{this.renderKeyControls()}
				{this.renderEditPanel()}
				{this.renderPreview()}
				{children}
			</div>
		);
	}
}

/**
 * Renders the reusable music embed edit dialog.
 *
 * @extends {React.Component<MusicEmbedDialogProps>}
 */
export default class MusicEmbedDialog extends React.Component {
	/**
	 * Handles BaseDialog action buttons and close affordances.
	 *
	 * @param {string} buttonId
	 * @returns {void}
	 */
	handleButtonPress(buttonId) {
		if (buttonId === 'done' || buttonId === 'close') {
			this.props.onClose();
		}
	}

	/**
	 * Renders the music embed dialog.
	 *
	 * @returns {React.ReactElement}
	 */
	render() {
		const {
			currentPayload,
			open,
		} = this.props;

		return (
			<BaseDialog
				buttons={[
					{
						id: 'done',
						labelKey: 'music.controls.done',
						priority: 'primary',
					},
				]}
				className="music-keyboard-dialog"
				fullWidth
				maxWidth="sm"
				onButtonPress={this.handleButtonPress.bind(this)}
				open={open}
				showClose
				titleKey="music.embed_dialog.title"
				descriptionKey="music.embed_dialog.description"
			>
				<MusicEmbedDialogBody {...this.props} />
			</BaseDialog>
		);
	}
}
