/** Props for rendering a localized MUI tooltip. */
type LocalizedTooltipProps = Omit<LocalizedPhrase, 'fallback' | 'phrase'> & {
	/** Translation key or full phrase request to show in the tooltip. */
	phrase: LocalizedText;
	/** Tooltip child element. */
	children: React.ReactElement;
	/** Whether MUI should describe rather than label the child. */
	describeChild?: boolean;
	/** Whether to apply the resolved translation as the child aria-label. */
	labelChild?: boolean;
	/** MUI tooltip placement. */
	placement?: string;
	/** Whether the tooltip arrow should be rendered. */
	arrow?: boolean;
};
