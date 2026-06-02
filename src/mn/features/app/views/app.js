import React from 'react';
import { Service } from '@polylith/core';
import AppShell from '../components/AppShell.jsx';

export default class AppView extends Service {
	constructor(registry) {
		super('app-view', registry);
		this.implement(['ready', 'getComponent', 'getShellState', 'requestPage']);
	}

	ready() {
		this.controller = this.registry.subscribe('app-controller');
		this.accounts = this.registry.subscribe('accounts-controller');
		this.document = this.registry.subscribe('document-controller');
		this.documentFormat = this.registry.subscribe('document-format-controller');
		this.documentModel = this.registry.subscribe('document-model');
		this.localize = this.registry.subscribe('localize');
		this.mainMenu = this.registry.subscribe('main-menu');
		this.paragraphFormat = this.registry.subscribe('paragraph-format-controller');
		this.controller.listen('pages-updated', (pages) => this.fire('pages-updated', pages));
		this.controller.listen('page-mounted', (details) => this.fire('page-mounted', details));
		this.subscribeToDocumentTitle();
		this.updatePageTitle();
	}

	subscribeToDocumentTitle() {
		if (!this.documentModel?.listen) {
			return;
		}

		this.documentModel.listen('document-changed', this.updatePageTitle.bind(this));
		this.documentModel.listen('document-loaded', this.updatePageTitle.bind(this));
		this.documentModel.listen('document-saved', this.updatePageTitle.bind(this));
		this.documentModel.listen('title-changed', this.updatePageTitle.bind(this));
	}

	getPageTitle() {
		const title = String(this.documentModel?.getTitle?.() || '').trim();
		const hasSavedDocument = Boolean(this.documentModel?.getId?.());
		const normalizedTitle = title && (hasSavedDocument || title !== 'Untitled notebook')
			? title
			: 'untitled';
		const dirtyPrefix = this.documentModel?.isDirty?.() === true ? '*' : '';

		return `${dirtyPrefix}${normalizedTitle}`;
	}

	updatePageTitle() {
		if (typeof document === 'undefined') {
			return;
		}

		document.title = this.getPageTitle();
	}

	getComponent(props = {}) {
		const featureComponents = [
			['document', this.document?.getComponent?.()],
			['document-format', this.documentFormat?.getComponent?.()],
			['paragraph-format', this.paragraphFormat?.getComponent?.()],
		]
			.filter(([, component]) => Boolean(component))
			.map(([key, component]) => React.cloneElement(component, { key }));

		return React.createElement(AppShell, {
			...props,
			appView: this,
			documentModel: this.documentModel,
			mainMenu: this.mainMenu,
			accountComponent: this.accounts?.getComponent?.() || null,
			featureComponents,
			appTitle: this.localize.translate('app.title'),
		});
	}

	getShellState(preferredPageId = '') {
		return this.controller.getShellState(preferredPageId);
	}

	requestPage(pageId) {
		return this.controller.requestPage(pageId);
	}
}

new AppView();
