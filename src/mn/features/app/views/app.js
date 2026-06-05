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
		this.localize = this.registry.subscribe('localize');
		this.mainMenu = this.registry.subscribe('main-menu');
		this.paragraphFormat = this.registry.subscribe('paragraph-format-controller');
		this.controller.listen('pages-updated', (pages) => this.fire('pages-updated', pages));
		this.controller.listen('page-mounted', (details) => this.fire('page-mounted', details));
		this.controller.listen('document-tabs-updated', (documentTabs) => this.fire('document-tabs-updated', documentTabs));
		this.controller.listen('page-title-updated', (title) => this.updatePageTitle(title));
		this.updatePageTitle(this.controller.getPageTitle?.() || 'untitled');
	}

	updatePageTitle(title) {
		if (typeof document === 'undefined') {
			return;
		}

		document.title = String(title || 'untitled');
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
			documentTabs: this.controller.getDocumentTabsState?.() || { activeTabId: '', tabs: [] },
			mainMenu: this.mainMenu,
			onAddDocumentTab: (afterTabId) => this.controller.addDocumentTabAfter?.(afterTabId),
			onMoveDocumentTab: (tabId, targetIndex) => this.controller.moveDocumentTab?.(tabId, targetIndex),
			onRenameDocumentTab: (tabId, title) => this.controller.renameDocumentTab?.(tabId, title),
			onSelectDocumentTab: (tabId) => this.controller.selectDocumentTab?.(tabId),
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
