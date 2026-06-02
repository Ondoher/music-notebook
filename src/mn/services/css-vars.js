import { Service } from '@polylith/core';

/**
 * Reads and writes CSS custom properties on DOM elements.
 */
export default class CssVarsService extends Service {
	constructor(registry) {
		super('css-vars', registry);
		this.implement(['start', 'get', 'set', 'remove', 'apply', 'getSnapshot']);
	}

	start() {
		this.defaultTarget = document.documentElement;
	}

	getTarget(target = this.defaultTarget) {
		return target || document.documentElement;
	}

	isValidName(name) {
		return typeof name === 'string' && name.startsWith('--') && name.length > 2;
	}

	get(name, target = this.defaultTarget) {
		if (!this.isValidName(name)) {
			console.warn('Cannot read a CSS variable without a valid custom property name.');
			return '';
		}

		return getComputedStyle(this.getTarget(target)).getPropertyValue(name).trim();
	}

	set(name, value, target = this.defaultTarget) {
		if (!this.isValidName(name)) {
			console.warn('Cannot set a CSS variable without a valid custom property name.');
			return false;
		}

		const resolvedTarget = this.getTarget(target);
		const nextValue = String(value);

		resolvedTarget.style.setProperty(name, nextValue);
		this.fire('changed', { name, value: nextValue, target: resolvedTarget });
		return true;
	}

	remove(name, target = this.defaultTarget) {
		if (!this.isValidName(name)) {
			console.warn('Cannot remove a CSS variable without a valid custom property name.');
			return false;
		}

		const resolvedTarget = this.getTarget(target);

		resolvedTarget.style.removeProperty(name);
		this.fire('changed', { name, value: undefined, target: resolvedTarget });
		return true;
	}

	apply(values = {}, target = this.defaultTarget) {
		const resolvedTarget = this.getTarget(target);
		const applied = {};

		Object.entries(values || {}).forEach(([name, value]) => {
			if (!this.isValidName(name)) {
				console.warn('Cannot apply a CSS variable without a valid custom property name.');
				return;
			}

			if (value === undefined || value === null || value === '') {
				resolvedTarget.style.removeProperty(name);
				applied[name] = undefined;
				return;
			}

			const nextValue = String(value);

			resolvedTarget.style.setProperty(name, nextValue);
			applied[name] = nextValue;
		});

		this.fire('changed-many', { values: applied, target: resolvedTarget });
		return applied;
	}

	getSnapshot(names = [], target = this.defaultTarget) {
		return names.reduce((snapshot, name) => {
			snapshot[name] = this.get(name, target);
			return snapshot;
		}, {});
	}
}

new CssVarsService();
