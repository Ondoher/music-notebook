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
		super('app-controller', registry, ['listen']);
	}
}

class DocumentModelMock extends Service {
	constructor(registry) {
		super('document-model', registry);
		this.implement(['getId', 'getTitle', 'isDirty']);
		this.id = null;
		this.title = 'Untitled notebook';
		this.dirty = false;
	}

	getId() {
		return this.id;
	}

	getTitle() {
		return this.title;
	}

	isDirty() {
		return this.dirty;
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
	let documentModel;
	let originalTitle;
	let registry;
	let view;

	beforeEach(function() {
		originalTitle = document.title;
		registry = new Registry();
		new AppControllerMock(registry);
		new EmptyService('accounts-controller', registry, ['getComponent']);
		new EmptyService('document-controller', registry, ['getComponent']);
		new EmptyService('document-format-controller', registry, ['getComponent']);
		documentModel = new DocumentModelMock(registry);
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

		documentModel.title = 'Lesson 1';
		documentModel.fire('document-loaded', documentModel);
		expect(document.title).toBe('Lesson 1');

		documentModel.dirty = true;
		documentModel.fire('document-changed', documentModel);
		expect(document.title).toBe('*Lesson 1');
	});

	it('uses a saved document title even when it matches the default title', function() {
		documentModel.id = 'doc-1';
		documentModel.title = 'Untitled notebook';

		view.ready();

		expect(document.title).toBe('Untitled notebook');
	});
});
