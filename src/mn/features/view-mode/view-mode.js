import { Service } from '@polylith/core';
import { preparePagedEditorContent } from './paged-content.js';

export default class ViewModeService extends Service {
	constructor(registry) {
		super('view-mode', registry);
		this.implement(['start', 'preparePagedContent']);
	}

	start() {
		this.state = {};
	}

	preparePagedContent(options = {}) {
		return preparePagedEditorContent(options);
	}
}

new ViewModeService();
