import React from 'react';
import BaseDialog from '../../../components/BaseDialog.jsx';
import BaseSelect from '../../../components/BaseSelect.jsx';
import TextInput from '../../../components/TextInput.jsx';
import ChordBuilder from '../../../components/ChordBuilder.jsx';
import KeyPicker from '../../../components/KeyPicker.jsx';
import MusicPreview from '../../../components/MusicPreview.jsx';
import ScaleBuilder from '../../../components/ScaleBuilder.jsx';

/**
 * Renders the music embed edit dialog body.
 *
 * @extends {React.Component<MusicEmbedDialogProps>}
 */
class MusicEmbedDialogBody extends React.Component {
	/**
	 * Creates local dialog presentation state.
	 *
	 * @param {MusicEmbedDialogProps} props
	 */
	constructor(props) {
		super(props);

		this.state = {
			previewHeight: null,
		};
	}

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
					showMode
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
			onChordChange,
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
					initialKeyMode={displayKeyMode}
					label={{ fallback: 'Scale', phrase: 'music.edit_mode.scale' }}
					onScaleChange={onScaleChange}
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
		const style = Number.isFinite(this.state.previewHeight)
			? { height: `${this.state.previewHeight}px` }
			: undefined;

		return (
			<div className="music-embed-dialog-preview" style={style}>
				<MusicPreview payload={this.props.currentPayload} onNaturalHeight={this.handlePreviewNaturalHeight} />
			</div>
		);
	}

	/**
	 * Applies the same fitted staff height used by document embeds.
	 *
	 * @param {number} height
	 * @returns {void}
	 */
	handlePreviewNaturalHeight = (height) => {
		const nextHeight = Math.ceil(Number(height));

		if (!Number.isFinite(nextHeight) || nextHeight <= 0 || Math.abs(nextHeight - this.state.previewHeight) < 2) {
			return;
		}

		this.setState({ previewHeight: nextHeight });
	};

	/**
	 * Updates the caption template through the owning embed view.
	 *
	 * @param {React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>} event
	 * @returns {void}
	 */
	handleCaptionTemplateChange = (event) => {
		this.props.onCaptionTemplateChange?.(event.target.value);
	};

	/**
	 * Renders the caption template input.
	 *
	 * @returns {React.ReactElement}
	 */
	renderCaptionSection() {
		return (
			<div className="music-embed-caption-section">
				<TextInput
					className="music-embed-caption-template"
					helperText="music.caption.template_helper"
					label="music.caption.template"
					labelFallback="Caption"
					minRows={2}
					multiline
					onChange={this.handleCaptionTemplateChange}
					placeholder="{{short}} - {{long}} ({{key}})"
					size="small"
					value={this.props.currentPayload.caption?.template || ''}
				/>
			</div>
		);
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
				{this.renderCaptionSection()}
			</div>
		);
	}
}

/**
 * Renders the music embed edit dialog.
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
		if (buttonId === 'done') {
			(this.props.onCommit || this.props.onClose)?.();
			return;
		}

		if (buttonId === 'close') {
			(this.props.onCancel || this.props.onClose)?.();
		}
	}

	/**
	 * Renders the music embed dialog.
	 *
	 * @returns {React.ReactElement}
	 */
	render() {
		const {
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
