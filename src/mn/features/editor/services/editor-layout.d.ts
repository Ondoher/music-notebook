/** Context passed to an editor wide-content contributor during measurement. */
type EditorWideContentMeasurementContext = {
	/** Base editor content width in pixels. */
	baseWidth: number;
	/** Element that owns editor content layout variables. */
	content?: HTMLElement | null;
	/** Current content element bounds. */
	contentRect?: DOMRect | Record<string, number> | null;
	/** Active editor root element. */
	editorRoot?: HTMLElement | null;
};

/** Feature-owned contribution for editor content that may exceed page width. */
type EditorWideContentContributor = {
	/** Stable contribution id. */
	id: string;
	/** Optional measurement function for custom feature-owned layout. */
	measure?: ((context: EditorWideContentMeasurementContext) => number | null | undefined) | null;
	/** Extra pixels to include after a selector-based measurement. */
	padding?: number;
	/** Selector resolved from the active editor root for selector-based measurement. */
	selector?: string;
};

/** Service that collects editor layout contributions from features. */
type EditorLayoutService = {
	/** Registers a feature-owned wide-content measurement contribution. */
	registerWideContentContributor: (contributor?: Partial<EditorWideContentContributor>) => () => boolean | null;
	/** Removes a wide-content contribution. */
	unregisterWideContentContributor: (id: string) => boolean;
	/** Gets the widest contributed content width for the active editor surface. */
	getWideContentWidth: (context?: Partial<EditorWideContentMeasurementContext>) => number | null;
	/** Subscribes to editor-layout events. */
	listen?: (eventName: string, listener: (...args: unknown[]) => void) => unknown;
	/** Removes an editor-layout event subscription. */
	unlisten?: (eventName: string, listener: unknown) => void;
};
