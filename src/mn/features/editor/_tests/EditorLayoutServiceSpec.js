import { Registry } from '@polylith/core';
import EditorLayoutService from '../services/editor-layout.js';

describe('EditorLayoutService', function() {
	function createService() {
		const registry = new Registry();
		const service = new EditorLayoutService(registry);

		service.start();
		return service;
	}

	it('measures selector-based wide content relative to the content element', function() {
		const service = createService();
		const root = document.createElement('div');
		const wideElement = document.createElement('div');

		wideElement.className = 'feature-wide-content';
		root.appendChild(wideElement);
		wideElement.getBoundingClientRect = () => ({
			right: 610,
		});

		service.registerWideContentContributor({
			id: 'feature.wide-content',
			padding: 24,
			selector: '.feature-wide-content',
		});

		const width = service.getWideContentWidth({
			baseWidth: 400,
			contentRect: {
				left: 10,
			},
			editorRoot: root,
		});

		expect(width).toBe(624);
	});

	it('keeps the base width when registered content fits', function() {
		const service = createService();
		const root = document.createElement('div');
		const wideElement = document.createElement('div');

		wideElement.className = 'feature-wide-content';
		root.appendChild(wideElement);
		wideElement.getBoundingClientRect = () => ({
			right: 360,
		});

		service.registerWideContentContributor({
			id: 'feature.wide-content',
			padding: 24,
			selector: '.feature-wide-content',
		});

		const width = service.getWideContentWidth({
			baseWidth: 400,
			contentRect: {
				left: 10,
			},
			editorRoot: root,
		});

		expect(width).toBe(404);
	});

	it('supports custom feature measurement and unregistering', function() {
		const service = createService();
		const unregister = service.registerWideContentContributor({
			id: 'feature.custom',
			measure: ({ baseWidth }) => baseWidth + 120,
		});

		expect(service.getWideContentWidth({ baseWidth: 400 })).toBe(520);
		expect(unregister()).toBeTrue();
		expect(service.getWideContentWidth({ baseWidth: 400 })).toBe(400);
	});
});
