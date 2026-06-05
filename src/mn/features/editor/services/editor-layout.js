import { Service } from '@polylith/core';

/**
 * Coordinates editor layout contributions that are not owned by the base editor.
 *
 * @extends {Service}
 */
export default class EditorLayoutService extends Service {
	constructor(registry) {
		super('editor-layout', registry);
		this.implement([
			'start',
			'registerWideContentContributor',
			'unregisterWideContentContributor',
			'getWideContentWidth',
		]);
	}

	/**
	 * Initializes service state.
	 *
	 * @returns {void}
	 */
	start() {
		this.wideContentContributors = new Map();
	}

	/**
	 * Registers a feature-owned wide-content measurement contribution.
	 *
	 * @param {Partial<EditorWideContentContributor>} contributor - Contributor settings.
	 * @returns {() => boolean | null} Function that unregisters the contributor.
	 */
	registerWideContentContributor(contributor = {}) {
		const normalized = this.normalizeWideContentContributor(contributor);

		if (!normalized) {
			console.warn('Cannot register an editor wide-content contributor without an id and selector or measure function.');
			return () => null;
		}

		this.wideContentContributors.set(normalized.id, normalized);
		return () => this.unregisterWideContentContributor(normalized.id);
	}

	/**
	 * Unregisters a feature-owned wide-content contribution.
	 *
	 * @param {string} id - Contributor id.
	 * @returns {boolean} Whether a contributor was removed.
	 */
	unregisterWideContentContributor(id) {
		return this.wideContentContributors.delete(id);
	}

	/**
	 * Gets the widest contributed content width for the editor surface.
	 *
	 * @param {EditorWideContentMeasurementContext} context - Measurement context.
	 * @returns {number | null} Width in pixels, or null when measurement is unavailable.
	 */
	getWideContentWidth(context = {}) {
		const baseWidth = Number(context.baseWidth);

		if (!Number.isFinite(baseWidth) || baseWidth <= 0) {
			return null;
		}

		return Array.from(this.wideContentContributors.values())
			.reduce((width, contributor) => {
				const measuredWidth = this.measureContributor(contributor, context);

				if (!Number.isFinite(measuredWidth)) {
					return width;
				}

				return Math.max(width, measuredWidth);
			}, baseWidth);
	}

	/**
	 * Normalizes a wide-content contributor registration.
	 *
	 * @param {Partial<EditorWideContentContributor>} contributor - Contributor settings.
	 * @returns {EditorWideContentContributor | null}
	 */
	normalizeWideContentContributor(contributor) {
		const id = String(contributor?.id || '').trim();
		const selector = String(contributor?.selector || '').trim();
		const measure = typeof contributor?.measure === 'function'
			? contributor.measure
			: null;
		const padding = Number(contributor?.padding ?? 0);

		if (!id || (!selector && !measure)) {
			return null;
		}

		return {
			id,
			measure,
			padding: Number.isFinite(padding) ? padding : 0,
			selector,
		};
	}

	/**
	 * Measures one contributor.
	 *
	 * @param {EditorWideContentContributor} contributor - Contributor definition.
	 * @param {EditorWideContentMeasurementContext} context - Measurement context.
	 * @returns {number | null} Width in pixels, or null when unavailable.
	 */
	measureContributor(contributor, context) {
		if (contributor.measure) {
			return Number(contributor.measure(context));
		}

		const root = context.editorRoot;

		if (!root || !contributor.selector) {
			return null;
		}

		const contentLeft = Number(context.contentRect?.left || 0);

		return Array.from(root.querySelectorAll(contributor.selector))
			.reduce((width, element) => {
				const rect = element.getBoundingClientRect?.();
				const right = Number(rect?.right);

				if (!Number.isFinite(right)) {
					return width;
				}

				return Math.max(width, Math.ceil(right - contentLeft + contributor.padding));
			}, null);
	}
}

new EditorLayoutService();
