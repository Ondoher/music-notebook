/** Payload emitted when one CSS variable changes. */
type CssVarChangedEvent = {
	/** CSS custom property name, including the leading --. */
	name: string;
	/** Applied string value, or undefined when removed. */
	value?: string;
	/** DOM element where the custom property changed. */
	target: Element;
};

/** Payload emitted when multiple CSS variables change. */
type CssVarsChangedManyEvent = {
	/** Applied values keyed by CSS custom property name. */
	values: Record<string, string | undefined>;
	/** DOM element where the custom properties changed. */
	target: Element;
};

/** Service for reading and writing CSS custom properties. */
type CssVarsService = {
	/** Reads a computed CSS custom property value. */
	get: (name: string, target?: HTMLElement) => string;
	/** Writes a CSS custom property value. */
	set: (name: string, value: unknown, target?: HTMLElement) => boolean;
	/** Removes an inline CSS custom property value. */
	remove: (name: string, target?: HTMLElement) => boolean;
	/** Writes or removes multiple CSS custom properties on the same target. */
	apply: (
		values: Record<string, unknown>,
		target?: HTMLElement,
	) => Record<string, string | undefined>;
	/** Reads a computed snapshot of CSS custom properties. */
	getSnapshot: (names: string[], target?: HTMLElement) => Record<string, string>;
	/** Subscribes to css-vars events. */
	listen?: (eventName: string, listener: (...args: any[]) => void) => unknown;
	/** Removes a css-vars event subscription. */
	unlisten?: (eventName: string, listener: unknown) => void;
};
