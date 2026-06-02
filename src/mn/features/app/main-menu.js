import { Service } from '@polylith/core';

export default class MainMenuService extends Service {
	constructor(registry) {
		super('main-menu', registry);
		this.implement(['start', 'addMainItem', 'addItem', 'selectItem', 'getMenu']);
	}

	start() {
		this.mainItems = [];
		this.items = [];
	}

	addMainItem(priority, id, stringId) {
		const nextItem = {
			id,
			priority,
			stringId,
		};
		const existingIndex = this.mainItems.findIndex((item) => item.id === id);

		if (existingIndex === -1) {
			this.mainItems.push(nextItem);
		} else {
			this.mainItems[existingIndex] = {
				...this.mainItems[existingIndex],
				...nextItem,
			};
		}

		const menuItem = this.getMainItem(id);

		this.fire('main-item-added', {
			item: menuItem,
			menu: this.getMenu(),
		});
		return menuItem;
	}

	addItem(mainMenuId, sectionNumber, priority, stringId, options = {}) {
		if (!this.mainItems.some((item) => item.id === mainMenuId)) {
			console.warn(`Cannot add main menu item "${stringId}" because main menu "${mainMenuId}" does not exist.`);
			return null;
		}

		const nextItem = {
			id: stringId,
			mainMenuId,
			sectionNumber,
			priority,
			stringId,
			enabled: options.enabled !== false,
		};
		const existingIndex = this.items.findIndex((item) => (
			item.mainMenuId === mainMenuId && item.id === nextItem.id
		));

		if (existingIndex === -1) {
			this.items.push(nextItem);
		} else {
			this.items[existingIndex] = {
				...this.items[existingIndex],
				...nextItem,
			};
		}

		const menuItem = this.getItem(mainMenuId, nextItem.id);

		this.fire('item-added', {
			item: menuItem,
			menu: this.getMenu(),
		});
		return menuItem;
	}

	sortByPriority(left, right) {
		return left.priority === right.priority
			? String(left.id || '').localeCompare(String(right.id || ''))
			: left.priority - right.priority;
	}

	getMainItem(id) {
		return this.getMenu().find((item) => item.id === id) || null;
	}

	getItem(mainMenuId, id) {
		const mainItem = this.getMainItem(mainMenuId);

		if (!mainItem) {
			return null;
		}

		for (const section of mainItem.sections) {
			const item = section.items.find((candidate) => candidate.id === id);

			if (item) {
				return item;
			}
		}

		return null;
	}

	getSections(mainMenuId) {
		const sectionNumbers = [
			...new Set(this.items
				.filter((item) => item.mainMenuId === mainMenuId)
				.map((item) => item.sectionNumber)),
		].sort((left, right) => left - right);

		return sectionNumbers.map((sectionNumber) => ({
			sectionNumber,
			items: this.items
				.filter((item) => item.mainMenuId === mainMenuId && item.sectionNumber === sectionNumber)
				.map((item) => ({ ...item }))
				.sort(this.sortByPriority),
		}));
	}

	selectItem(mainMenuId, itemId) {
		const item = this.getItem(mainMenuId, itemId);

		if (!item) {
			console.warn(`Cannot select main menu item "${itemId}" because it does not exist in main menu "${mainMenuId}".`);
			return null;
		}

		if (item.enabled === false) {
			return item;
		}

		this.fire('item-selected', {
			item,
			menu: this.getMenu(),
		});
		return item;
	}

	getMenu() {
		return this.mainItems
			.map((item) => ({
				...item,
				sections: this.getSections(item.id),
			}))
			.sort(this.sortByPriority);
	}
}

new MainMenuService();
