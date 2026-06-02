import { Service } from '@polylith/core';

const DEFAULT_ICON_STATE = 'default';

/**
 * Stores app-wide icon component registrations by id and optional state.
 */
export default class IconRegistryService extends Service {
	constructor(registry) {
		super('icon-registry', registry);
		this.implement([
			'start',
			'registerIcon',
			'getIcon',
			'getIconHoverTextStringId',
			'getIconSet',
			'getIcons',
			'updateIconHoverText',
			'removeIcon',
		]);
	}

	start() {
		this.icons = {};
	}

	normalizeState(state = DEFAULT_ICON_STATE) {
		return String(state || DEFAULT_ICON_STATE);
	}

	copyEntry(entry) {
		return {
			id: entry.id,
			states: { ...entry.states },
			hoverTextStringIds: { ...entry.hoverTextStringIds },
		};
	}

	registerIcon(id, icon, state = DEFAULT_ICON_STATE, hoverTextStringId = '') {
		if (!id) {
			console.warn('Cannot register an icon without an id.');
			return null;
		}

		const stateName = this.normalizeState(state);

		if (!this.icons[id]) {
			this.icons[id] = {
				id,
				states: {},
				hoverTextStringIds: {},
			};
		}

		this.icons[id].states[stateName] = icon;
		if (hoverTextStringId) {
			this.icons[id].hoverTextStringIds[stateName] = hoverTextStringId;
		}

		const entry = this.copyEntry(this.icons[id]);

		this.fire('icon-registered', {
			id,
			state: stateName,
			icon,
			hoverTextStringId: entry.hoverTextStringIds[stateName] || '',
			entry,
			icons: this.getIcons(),
		});
		return entry;
	}

	getIcon(id, state = DEFAULT_ICON_STATE) {
		const entry = this.icons[id];

		if (!entry) {
			return null;
		}

		return entry.states[this.normalizeState(state)] || entry.states[DEFAULT_ICON_STATE] || null;
	}

	getIconHoverTextStringId(id, state = DEFAULT_ICON_STATE) {
		const entry = this.icons[id];

		if (!entry) {
			return '';
		}

		return entry.hoverTextStringIds[this.normalizeState(state)] || entry.hoverTextStringIds[DEFAULT_ICON_STATE] || '';
	}

	getIconSet(id) {
		const entry = this.icons[id];

		return entry ? this.copyEntry(entry) : null;
	}

	getIcons() {
		return Object.values(this.icons)
			.map((entry) => this.copyEntry(entry))
			.sort((left, right) => String(left.id).localeCompare(String(right.id)));
	}

	updateIconHoverText(id, hoverTextStringId, state = DEFAULT_ICON_STATE) {
		const entry = this.icons[id];

		if (!entry) {
			console.warn(`Cannot update hover text for icon "${id}" because it does not exist.`);
			return null;
		}

		const stateName = this.normalizeState(state);

		if (hoverTextStringId) {
			entry.hoverTextStringIds[stateName] = hoverTextStringId;
		} else {
			delete entry.hoverTextStringIds[stateName];
		}

		const nextEntry = this.copyEntry(entry);

		this.fire('icon-hover-text-updated', {
			id,
			state: stateName,
			hoverTextStringId: nextEntry.hoverTextStringIds[stateName] || '',
			entry: nextEntry,
			icons: this.getIcons(),
		});
		return nextEntry;
	}

	removeIcon(id, state = '') {
		const entry = this.icons[id];

		if (!entry) {
			return false;
		}

		const stateName = state ? this.normalizeState(state) : '';

		if (stateName) {
			if (!(stateName in entry.states)) {
				return false;
			}

			delete entry.states[stateName];
			delete entry.hoverTextStringIds[stateName];

			if (Object.keys(entry.states).length === 0) {
				delete this.icons[id];
			}
		} else {
			delete this.icons[id];
		}

		this.fire('icon-removed', {
			id,
			state: stateName,
			icons: this.getIcons(),
		});
		return true;
	}
}

new IconRegistryService();
