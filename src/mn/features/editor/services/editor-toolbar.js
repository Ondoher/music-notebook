import { Service } from '@polylith/core';

export const EDITOR_TOOLBAR_SECTIONS = Object.freeze({
	TEXT: 10,
	STRUCTURE: 20,
	PARAGRAPH: 30,
	INSERT: 40,
});

export default class EditorToolbarService extends Service {
	constructor(registry) {
		super('editor-toolbar', registry);
		this.implement(['start', 'addItem', 'updateItem', 'removeItem', 'selectItem', 'getToolbar']);
	}

	start() {
		this.items = [];
	}

	sortByPriority(left, right) {
		return left.priority === right.priority
			? String(left.id || '').localeCompare(String(right.id || ''))
			: left.priority - right.priority;
	}

	normalizeItem(sectionNumber, priority, id, stringId, iconId, options = {}) {
		return {
			id,
			sectionNumber,
			priority,
			stringId,
			iconId,
			controlType: options.controlType || 'button',
			commandId: options.commandId || id,
			commandPayload: options.commandPayload,
			options: Array.isArray(options.options) ? options.options : [],
			value: options.value,
			ownerFeature: options.ownerFeature || '',
			tooltipStringId: options.tooltipStringId || stringId,
			enabled: options.enabled !== false,
			visible: options.visible !== false,
			...(options.pressed === undefined ? {} : { pressed: Boolean(options.pressed) }),
		};
	}

	copyItem(item) {
		return { ...item };
	}

	getItem(id) {
		const item = this.items.find((candidate) => candidate.id === id);

		return item ? this.copyItem(item) : null;
	}

	addItem(sectionNumber, priority, id, stringId, iconId, options = {}) {
		const nextItem = this.normalizeItem(sectionNumber, priority, id, stringId, iconId, options);
		const existingIndex = this.items.findIndex((item) => item.id === id);

		if (existingIndex === -1) {
			this.items.push(nextItem);
		} else {
			this.items[existingIndex] = {
				...this.items[existingIndex],
				...nextItem,
			};
		}

		const item = this.getItem(id);

		this.fire('item-added', {
			item,
			toolbar: this.getToolbar(),
		});
		return item;
	}

	updateItem(id, patch = {}) {
		const index = this.items.findIndex((item) => item.id === id);

		if (index === -1) {
			return null;
		}

		this.items[index] = {
			...this.items[index],
			...patch,
			id,
		};

		const item = this.getItem(id);

		this.fire('item-updated', {
			item,
			toolbar: this.getToolbar(),
		});
		return item;
	}

	removeItem(id) {
		const initialLength = this.items.length;

		this.items = this.items.filter((item) => item.id !== id);

		if (this.items.length === initialLength) {
			return false;
		}

		this.fire('item-removed', {
			id,
			toolbar: this.getToolbar(),
		});
		return true;
	}

	selectItem(id, commandPayload = undefined) {
		const item = this.getItem(id);

		if (!item) {
			console.warn(`Cannot select editor toolbar item "${id}" because it does not exist.`);
			return null;
		}

		if (!item.enabled) {
			this.fire('disabled-item-selected', {
				item,
				toolbar: this.getToolbar(),
			});
			return item;
		}

		this.fire('item-selected', {
			item: commandPayload === undefined ? item : { ...item, commandPayload },
			toolbar: this.getToolbar(),
		});
		return item;
	}

	getToolbar() {
		const sectionNumbers = [
			...new Set(this.items
				.filter((item) => item.visible !== false)
				.map((item) => item.sectionNumber)),
		].sort((left, right) => left - right);

		return sectionNumbers.map((sectionNumber) => ({
			sectionNumber,
			items: this.items
				.filter((item) => item.visible !== false && item.sectionNumber === sectionNumber)
				.map((item) => this.copyItem(item))
				.sort(this.sortByPriority),
		}));
	}
}

new EditorToolbarService();
