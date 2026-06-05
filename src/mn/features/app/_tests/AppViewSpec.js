/* global describe it expect beforeEach afterEach */

import { Registry, Service } from '@polylith/core';

import AppView from '../views/app.js';

class EmptyService extends Service {
	constructor(name, registry, methods = []) {
		super(name, registry);
		this.implement(methods);
	}

	getComponent() {
		return null;
	}

	listen() {}
}

class AppControllerMock extends EmptyService {
	constructor(registry) {
		super('app-controller', registry, [
			'getDocumentTabsState',
			'getPageTitle',
			'listen',
		]);
		this.listeners = {};
		this.pageTitle = 'untitled';
	}

	getDocumentTabsState() {
		return { activeTabId: '', tabs: [] };
	}

	getPageTitle() {
		return this.pageTitle;
	}

	listen(eventName, listener) {
		this.listeners[eventName] = listener;
		return listener;
	}

	emit(eventName, payload) {
		this.listeners[eventName]?.(payload);
	}
}

class LocalizeMock extends EmptyService {
	constructor(registry) {
		super('localize', registry, ['translate']);
	}

	translate(phrase) {
		return phrase === 'app.title' ? 'Music Notebook' : phrase;
	}
}

describe('AppView', function() {
	let appController;
	let originalTitle;
	let registry;
	let view;

	beforeEach(function() {
		originalTitle = document.title;
		registry = new Registry();
		appController = new AppControllerMock(registry);
		new EmptyService('accounts-controller', registry, ['getComponent']);
		new EmptyService('document-controller', registry, ['getComponent']);
		new EmptyService('document-format-controller', registry, ['getComponent']);
		new LocalizeMock(registry);
		new EmptyService('main-menu', registry, []);
		new EmptyService('paragraph-format-controller', registry, ['getComponent']);
		view = new AppView(registry);
	});

	afterEach(function() {
		document.title = originalTitle;
	});

	it('sets the browser title from the document name and dirty state', function() {
		view.ready();

		expect(document.title).toBe('untitled');

		appController.pageTitle = 'Lesson 1';
		appController.emit('page-title-updated', 'Lesson 1');
		expect(document.title).toBe('Lesson 1');

		appController.pageTitle = '*Lesson 1';
		appController.emit('page-title-updated', '*Lesson 1');
		expect(document.title).toBe('*Lesson 1');
	});

	it('uses a saved document title even when it matches the default title', function() {
		appController.pageTitle = 'Untitled notebook';

		view.ready();

		expect(document.title).toBe('Untitled notebook');
	});
});
