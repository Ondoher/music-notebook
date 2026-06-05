import { Service } from '@polylith/core';

const DEFAULT_ACTION_STATE = 'default';

/**
 * Stores app-wide action presentation component registrations by id and state.
 */
export default class ActionRegistryService extends Service {
	constructor(registry) {
		super('action-registry', registry);
		this.implement([
			'start',
			'registerAction',
			'getActionComponent',
			'getActionHoverTextStringId',
			'getActionSet',
			'getActions',
			'updateActionHoverText',
			'removeAction',
		]);
	}

	start() {
		this.actions = {};
	}

	normalizeState(state = DEFAULT_ACTION_STATE) {
		return String(state || DEFAULT_ACTION_STATE);
	}

	copyEntry(entry) {
		return {
			id: entry.id,
			states: { ...entry.states },
			hoverTextStringIds: { ...entry.hoverTextStringIds },
		};
	}

	registerAction(id, component, state = DEFAULT_ACTION_STATE, hoverTextStringId = '') {
		if (!id) {
			console.warn('Cannot register an action without an id.');
			return null;
		}

		const stateName = this.normalizeState(state);

		if (!this.actions[id]) {
			this.actions[id] = {
				id,
				states: {},
				hoverTextStringIds: {},
			};
		}

		this.actions[id].states[stateName] = component;
		if (hoverTextStringId) {
			this.actions[id].hoverTextStringIds[stateName] = hoverTextStringId;
		}

		const entry = this.copyEntry(this.actions[id]);

		this.fire('action-registered', {
			id,
			state: stateName,
			component,
			hoverTextStringId: entry.hoverTextStringIds[stateName] || '',
			entry,
			actions: this.getActions(),
		});
		return entry;
	}

	getActionComponent(id, state = DEFAULT_ACTION_STATE) {
		const entry = this.actions[id];

		if (!entry) {
			return null;
		}

		return entry.states[this.normalizeState(state)] || entry.states[DEFAULT_ACTION_STATE] || null;
	}

	getActionHoverTextStringId(id, state = DEFAULT_ACTION_STATE) {
		const entry = this.actions[id];

		if (!entry) {
			return '';
		}

		return entry.hoverTextStringIds[this.normalizeState(state)] || entry.hoverTextStringIds[DEFAULT_ACTION_STATE] || '';
	}

	getActionSet(id) {
		const entry = this.actions[id];

		return entry ? this.copyEntry(entry) : null;
	}

	getActions() {
		return Object.values(this.actions)
			.map((entry) => this.copyEntry(entry))
			.sort((left, right) => String(left.id).localeCompare(String(right.id)));
	}

	updateActionHoverText(id, hoverTextStringId, state = DEFAULT_ACTION_STATE) {
		const entry = this.actions[id];

		if (!entry) {
			console.warn(`Cannot update hover text for action "${id}" because it does not exist.`);
			return null;
		}

		const stateName = this.normalizeState(state);

		if (hoverTextStringId) {
			entry.hoverTextStringIds[stateName] = hoverTextStringId;
		} else {
			delete entry.hoverTextStringIds[stateName];
		}

		const nextEntry = this.copyEntry(entry);

		this.fire('action-hover-text-updated', {
			id,
			state: stateName,
			hoverTextStringId: nextEntry.hoverTextStringIds[stateName] || '',
			entry: nextEntry,
			actions: this.getActions(),
		});
		return nextEntry;
	}

	removeAction(id, state = '') {
		const entry = this.actions[id];

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
				delete this.actions[id];
			}
		} else {
			delete this.actions[id];
		}

		this.fire('action-removed', {
			id,
			state: stateName,
			actions: this.getActions(),
		});
		return true;
	}
}

new ActionRegistryService();
