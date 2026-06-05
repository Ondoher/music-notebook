import { Service } from '@polylith/core';

export default class AppController extends Service {
	constructor(registry) {
		super('app-controller', registry);
		this.implement([
			'ready',
			'getPages',
			'getShellState',
			'getDocumentTabsState',
			'selectDocumentTab',
			'renameDocumentTab',
			'addDocumentTabAfter',
			'moveDocumentTab',
			'getPageTitle',
			'ensureActivePage',
			'requestPage',
			'getComponent',
		]);
	}

	ready() {
		this.view = this.registry.subscribe('app-view');
		this.pages = this.registry.subscribe('app-pages');
		this.mainMenu = this.registry.subscribe('main-menu');
		this.documentModel = this.registry.subscribe('document-model');
		this.url = this.registry.subscribe('url');
		this.activePageId = null;
		this.activePageComponent = null;
		this.registryReady = false;
		this.pages.listen('updated', this.onPagesUpdated.bind(this));
		this.pages.listen('page-added', this.onPageAvailable.bind(this));
		this.pages.listen('page-updated', this.onPageAvailable.bind(this));
		this.url.listen('changed', this.onUrlChanged.bind(this));
		this.registry.listen('ready', this.onRegistryReady.bind(this));
		this.subscribeToDocumentModel();
		this.configureMainMenu();
		this.reconcilePages();
		this.updatePageTitle();
	}

	subscribeToDocumentModel() {
		if (!this.documentModel?.listen) {
			return;
		}

		this.documentModel.listen('tabs-changed', this.onDocumentTabsChanged.bind(this));
		this.documentModel.listen('tabs-joined', this.onDocumentTabsChanged.bind(this));
		this.documentModel.listen('active-tab-changed', this.onDocumentTabsChanged.bind(this));
		this.documentModel.listen('document-loaded', this.onDocumentLoaded.bind(this));
		this.documentModel.listen('document-changed', this.updatePageTitle.bind(this));
		this.documentModel.listen('document-saved', this.updatePageTitle.bind(this));
		this.documentModel.listen('title-changed', this.updatePageTitle.bind(this));
	}

	onDocumentLoaded() {
		this.onDocumentTabsChanged();
		this.updatePageTitle();
	}

	onDocumentTabsChanged() {
		this.fire('document-tabs-updated', this.getDocumentTabsState());
	}

	configureMainMenu() {
		this.mainMenu.addMainItem(100, 'document', 'app.menu.document');
		this.mainMenu.addMainItem(200, 'insert', 'app.menu.insert');
		this.mainMenu.addMainItem(300, 'format', 'app.menu.format');
		this.mainMenu.addMainItem(400, 'view', 'app.menu.view');
		this.mainMenu.addMainItem(600, 'help', 'app.menu.help');
	}

	onPagesUpdated(pages) {
		this.fire('pages-updated', pages);

		if (!this.activePageId && pages.length > 0) {
			this.ensureActivePage();
		}
	}

	onUrlChanged() {
		const page = this.pageForCurrentUrl() || this.getPages()[0] || null;

		if (page) {
			this.requestPage(page.id, { history: 'none' });
		}
	}

	onPageAvailable(page) {
		if (this.pageForCurrentUrl()?.id === page.id && this.activePageId !== page.id) {
			this.requestPage(page.id, { history: 'none' });
			return;
		}

		this.reconcilePages(page.id);
	}

	onRegistryReady() {
		this.registryReady = true;
		this.reconcilePages(this.activePageId);
	}

	reconcilePages(preferredPageId = '') {
		const pages = this.getPages();

		this.fire('pages-updated', pages);
		this.ensureActivePage(preferredPageId);
	}

	ensureActivePage(preferredPageId = '') {
		if (this.activePageComponent && this.activePageId) {
			return this.pages.getById(this.activePageId);
		}

		const pages = this.getPages();

		if (pages.length === 0) {
			return null;
		}

		const preferredPage = preferredPageId
			? pages.find((page) => page.id === preferredPageId)
			: null;
		const urlSlug = this.url.getPageSlug();
		const urlPage = this.pageForCurrentUrl();

		if (urlSlug && !urlPage && !this.registryReady) {
			return null;
		}

		const candidates = [
			urlPage,
			preferredPage,
			this.activePageId ? pages.find((page) => page.id === this.activePageId) : null,
			...pages,
		].filter(Boolean);
		const tried = new Set();

		for (const page of candidates) {
			if (tried.has(page.id)) {
				continue;
			}

			tried.add(page.id);

			if (this.requestPage(page.id, { history: 'replace' })) {
				return page;
			}
		}

		return null;
	}

	getPages() {
		return this.pages.get();
	}

	pageForCurrentUrl() {
		const slug = this.url.getPageSlug();

		return slug
			? this.pages.getBySlug(slug)
			: null;
	}

	pageSlug(page) {
		return page.urlSlug || page.id;
	}

	getShellState(preferredPageId = '') {
		this.ensureActivePage(preferredPageId);

		return {
			activePageId: this.activePageId,
			documentTabs: this.getDocumentTabsState(),
			pageComponent: this.activePageComponent,
			pages: this.getPages(),
		};
	}

	getDocumentTabsState() {
		return {
			activeTabId: this.documentModel?.getActiveTabId?.() || '',
			tabs: this.documentModel?.getTabs?.() || [],
		};
	}

	selectDocumentTab(tabId) {
		return this.documentModel?.setActiveTab?.(tabId) || null;
	}

	renameDocumentTab(tabId, title) {
		return this.documentModel?.updateTab?.(tabId, { title }) || null;
	}

	addDocumentTabAfter(tabId) {
		return this.documentModel?.addTab?.({ afterTabId: tabId }) || null;
	}

	moveDocumentTab(tabId, targetIndex) {
		return this.documentModel?.moveTab?.(tabId, targetIndex) || null;
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
		this.fire('page-title-updated', this.getPageTitle());
	}

	requestPage(pageId, options = {}) {
		const page = this.pages.getById(pageId);

		if (!page) {
			return null;
		}

		const pageController = this.registry.subscribe(page.controller);

		if (!pageController) {
			throw new Error(`Page controller "${page.controller}" is not registered for page "${page.id}".`);
		}

		const component = pageController.mount({
			appController: this,
			page,
		});

		if (!component) {
			return null;
		}

		this.activePageId = page.id;
		this.activePageComponent = component;
		this.updateUrlForPage(page, options.history || 'push');
		this.fire('page-requested', page);
		this.fire('page-mounted', {
			component,
			page,
		});
		return page;
	}

	updateUrlForPage(page, historyMode) {
		if (historyMode === 'none') {
			return;
		}

		const slug = this.pageSlug(page);

		if (historyMode === 'replace') {
			this.url.replacePageSlug(slug);
			return;
		}

		this.url.pushPageSlug(slug);
	}

	getComponent(props = {}) {
		const shellState = this.getShellState();

		return this.view.getComponent({
			...props,
			activePageId: shellState.activePageId,
			pageComponent: shellState.pageComponent,
			pages: shellState.pages,
			registry: this.registry,
		});
	}
}

new AppController();
