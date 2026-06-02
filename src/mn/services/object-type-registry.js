import { Service } from '@polylith/core';

export default class ObjectTypeRegistryService extends Service {
	constructor(registry) {
		super('object-type-registry', registry);
		this.implement(['start', 'registerType', 'getType', 'getTypes', 'removeType']);
	}

	start() {
		this.types = {};
	}

	copyDefinition(definition) {
		return { ...definition };
	}

	registerType(typeId, definition = {}) {
		if (!typeId) {
			console.warn('Cannot register an object type without a type id.');
			return null;
		}

		const typeDefinition = {
			...definition,
			type: typeId,
		};

		this.types[typeId] = typeDefinition;

		const registeredType = this.copyDefinition(typeDefinition);

		this.fire('type-registered', {
			typeId,
			type: registeredType,
			types: this.getTypes(),
		});
		return registeredType;
	}

	getType(typeId) {
		const definition = this.types[typeId];

		return definition ? this.copyDefinition(definition) : null;
	}

	getTypes() {
		return Object.values(this.types)
			.map((definition) => this.copyDefinition(definition))
			.sort((left, right) => String(left.type).localeCompare(String(right.type)));
	}

	removeType(typeId) {
		if (!this.types[typeId]) {
			return false;
		}

		delete this.types[typeId];
		this.fire('type-removed', {
			typeId,
			types: this.getTypes(),
		});
		return true;
	}
}

new ObjectTypeRegistryService();
