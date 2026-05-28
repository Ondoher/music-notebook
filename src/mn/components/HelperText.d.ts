/**
 * Semantic helper text status.
 *
 * - **default** - Presents neutral helper text or a valid resolved value.
 * - **warning** - Presents non-blocking uncertainty while input is still being edited.
 * - **error** - Presents a blocking validation error.
 */
type HelperTextStatus = 'default' | 'warning' | 'error';

/** Props for accessible helper or validation text under a form control. */
type HelperTextProps = {
	/** Literal helper content, used when helperText is not provided. */
	children?: React.ReactNode;
	/** CSS class name applied to the helper element. */
	className?: string;
	/** Helper content, either localized text or a React node. */
	helperText?: LocalizedText | React.ReactNode;
	/** DOM id used by aria-describedby relationships. */
	id?: string;
	/** Whether phrase-like helper text should be localized. */
	localize?: boolean;
	/** ARIA role for the helper element. */
	role?: string;
	/** Semantic status used for visual styling and accessibility behavior. */
	status?: HelperTextStatus;
	/** Additional props forwarded to the rendered helper element. */
	[key: string]: unknown;
};
