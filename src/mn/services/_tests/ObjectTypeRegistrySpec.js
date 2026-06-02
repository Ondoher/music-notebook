import { Registry } from '@polylith/core';
import ObjectTypeRegistryService from '../object-type-registry.js';

describe('ObjectTypeRegistryService', function() {
	function createService() {
		const registry = new Registry();
		const service = new ObjectTypeRegistryService(registry);

		service.start();
		return service;
	}

	it('registers and retrieves object type definitions', function() {
		const service = createService();
		const createDefaultObject = () => ({ type: 'music-object' });

		const type = service.registerType('music-object', {
			blotName: 'music-keyboard',
			createDefaultObject,
		});

		expect(type.type).toBe('music-object');
		expect(type.blotName).toBe('music-keyboard');
		expect(service.getType('music-object').createDefaultObject).toBe(createDefaultObject);
		expect(service.getTypes().map((definition) => definition.type)).toEqual(['music-object']);
	});

	it('emits events when object types are registered and removed', function() {
		const service = createService();
		const registered = [];
		const removed = [];

		service.listen('type-registered', (event) => registered.push(event));
		service.listen('type-removed', (event) => removed.push(event));

		service.registerType('music-object', { blotName: 'music-keyboard' });
		service.removeType('music-object');

		expect(registered[0].typeId).toBe('music-object');
		expect(registered[0].type.blotName).toBe('music-keyboard');
		expect(removed[0].typeId).toBe('music-object');
		expect(removed[0].types).toEqual([]);
	});

	it('warns and returns null when registering without a type id', function() {
		const service = createService();

		spyOn(console, 'warn');

		expect(service.registerType('', {})).toBeNull();
		expect(console.warn).toHaveBeenCalledWith('Cannot register an object type without a type id.');
	});
});
