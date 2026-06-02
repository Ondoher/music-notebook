import { Registry } from '@polylith/core';
import CssVarsService from '../css-vars.js';

describe('CssVarsService', function() {
	function createService() {
		const registry = new Registry();
		const service = new CssVarsService(registry);

		service.start();
		return service;
	}

	function createTarget() {
		const target = document.createElement('div');

		document.body.appendChild(target);
		return target;
	}

	it('sets and reads CSS variables on the default target', function() {
		const service = createService();

		service.set('--mn-test-css-var', '24px');

		expect(service.get('--mn-test-css-var')).toBe('24px');

		service.remove('--mn-test-css-var');
	});

	it('applies and removes CSS variables on a supplied target', function() {
		const service = createService();
		const target = createTarget();

		const applied = service.apply({
			'--mn-test-width': 42,
			'--mn-test-height': '120px',
		}, target);

		expect(applied).toEqual({
			'--mn-test-width': '42',
			'--mn-test-height': '120px',
		});
		expect(service.getSnapshot(['--mn-test-width', '--mn-test-height'], target)).toEqual({
			'--mn-test-width': '42',
			'--mn-test-height': '120px',
		});

		service.apply({ '--mn-test-width': undefined }, target);

		expect(service.get('--mn-test-width', target)).toBe('');

		target.remove();
	});

	it('emits events when variables change', function() {
		const service = createService();
		const changed = [];
		const changedMany = [];

		service.listen('changed', (event) => changed.push(event));
		service.listen('changed-many', (event) => changedMany.push(event));

		service.set('--mn-test-event', 'value');
		service.apply({ '--mn-test-event': 'next' });

		expect(changed.length).toBe(1);
		expect(changed[0].name).toBe('--mn-test-event');
		expect(changed[0].value).toBe('value');
		expect(changedMany.length).toBe(1);
		expect(changedMany[0].values).toEqual({ '--mn-test-event': 'next' });

		service.remove('--mn-test-event');
	});

	it('warns and returns a safe value for invalid CSS variable names', function() {
		const service = createService();

		spyOn(console, 'warn');

		expect(service.get('mn-test')).toBe('');
		expect(service.set('mn-test', 'value')).toBeFalse();
		expect(service.remove('mn-test')).toBeFalse();
		expect(service.apply({ 'mn-test': 'value' })).toEqual({});
		expect(console.warn).toHaveBeenCalledTimes(4);
	});
});
