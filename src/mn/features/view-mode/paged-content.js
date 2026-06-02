import { normalizeMusicEmbedSizing } from '../../shared/music-object-layout.js';

/**
 * Prepares a detached editor clone for paged/read rendering.
 *
 * This adapter is intentionally clone-only. The live Quill DOM can keep the
 * shape Quill needs for cursor behavior while the paged renderer gets a filtered
 * copy with editor-only controls removed and music-object sizing normalized.
 *
 * @param {{availableWidth?: number, contentRoot?: Element | null, contentHtml?: string, ownerDocument?: Document}} options
 * @returns {Element}
 */
export function preparePagedEditorContent(options = {}) {
	const ownerDocument = options.ownerDocument
		|| options.contentRoot?.ownerDocument
		|| globalThis.document;
	const editor = cloneEditorContent(options.contentRoot, options.contentHtml, ownerDocument);

	editor.setAttribute('data-mn-view-mode-source', options.contentRoot?.cloneNode ? 'live-clone' : 'html');
	normalizePagedEditorContent(editor, options);
	return editor;
}

function cloneEditorContent(contentRoot, contentHtml, ownerDocument) {
	if (contentRoot?.cloneNode) {
		const clone = contentRoot.cloneNode(true);

		clone.classList.add('ql-editor');
		return clone;
	}

	const template = ownerDocument.createElement('template');

	template.innerHTML = `<div class="ql-editor">${contentHtml || '<p><br></p>'}</div>`;
	return template.content.firstElementChild || ownerDocument.createElement('div');
}

/**
 * Normalizes a detached paged preview clone in place.
 *
 * @param {Element} editor
 * @param {{availableWidth?: number}} options
 * @returns {Element}
 */
export function normalizePagedEditorContent(editor, options = {}) {
	if (!editor) {
		return editor;
	}

	removeEditorOnlyNodes(editor);
	normalizePagedMusicEmbedElements(editor);
	normalizePagedMusicEmbeds(editor);
	wrapPagedMusicEmbedRuns(editor, options.availableWidth);
	return editor;
}

function removeEditorOnlyNodes(editor) {
	editor
		.querySelectorAll([
			'.music-embed-toolbar',
			'.music-embed-resize-handle',
			'.music-keyboard-dialog',
			'.music-embed-format-dialog',
			'.ql-cursor',
			'.ql-tooltip',
			'.ql-ui',
		].join(', '))
		.forEach((node) => node.remove());
}

function normalizePagedMusicEmbedElements(editor) {
	Array.from(editor.querySelectorAll('.music-keyboard-embed'))
		.forEach((embed) => {
			const pagedEmbed = convertElementTreeToPagedSpans(embed);

			removeMusicEmbedGuardText(pagedEmbed);
		});
}

function convertElementTreeToPagedSpans(root) {
	Array.from(root.querySelectorAll('div'))
		.reverse()
		.forEach((element) => replaceElementTag(element, 'span'));

	if (root.tagName?.toLowerCase() === 'div') {
		return replaceElementTag(root, 'span');
	}

	return root;
}

function replaceElementTag(element, tagName) {
	const replacement = element.ownerDocument.createElement(tagName);

	Array.from(element.attributes).forEach((attribute) => {
		replacement.setAttribute(attribute.name, attribute.value);
	});

	while (element.firstChild) {
		replacement.appendChild(element.firstChild);
	}

	element.replaceWith(replacement);
	return replacement;
}

function removeMusicEmbedGuardText(embed) {
	const walker = embed.ownerDocument.createTreeWalker(
		embed,
		NodeFilter.SHOW_TEXT,
		{
			acceptNode(node) {
				return node.nodeValue?.replace(/\uFEFF/g, '').trim()
					? NodeFilter.FILTER_REJECT
					: NodeFilter.FILTER_ACCEPT;
			},
		},
	);
	const nodes = [];

	while (walker.nextNode()) {
		nodes.push(walker.currentNode);
	}

	nodes.forEach((node) => node.remove());
}

function normalizePagedMusicEmbeds(editor) {
	editor.querySelectorAll('.music-keyboard-embed').forEach((embed) => {
		const size = getMusicEmbedSize(embed);
		const embedContent = embed.querySelector(':scope > .music-keyboard-embed-content')
			|| embed.querySelector('.music-keyboard-embed-content');

		embed.setAttribute('data-mn-paged-music-embed', 'true');
		applyMusicEmbedSize(embed, size);

		if (embedContent) {
			applyMusicEmbedContentSize(embedContent, size, embed.dataset.keyboardPayload);
		}

		applyPagedMusicEmbedDisplayStyles(embed);
	});

	editor.querySelectorAll('.music-keyboard-embed-content').forEach((embedContent) => {
		if (embedContent.style.getPropertyValue('--music-embed-width')) {
			return;
		}

		const embed = embedContent.closest('.music-keyboard-embed');
		const size = getMusicEmbedSize(embed || embedContent);

		applyMusicEmbedContentSize(embedContent, size, embed?.dataset.keyboardPayload);
		applyPagedMusicEmbedDisplayStyles(embedContent);
	});
}

function wrapPagedMusicEmbedRuns(editor, availableWidth) {
	const rowWidth = normalizeAvailableWidth(availableWidth);

	if (!rowWidth) {
		return;
	}

	Array.from(editor.querySelectorAll('p'))
		.forEach((paragraph) => wrapPagedMusicEmbedRunsInParagraph(paragraph, rowWidth));
}

function wrapPagedMusicEmbedRunsInParagraph(paragraph, availableWidth) {
	const fragments = [];
	let pendingParagraph = cloneParagraphShell(paragraph);
	let changed = false;
	const flushPendingParagraph = () => {
		if (hasVisibleParagraphContent(pendingParagraph)) {
			fragments.push(pendingParagraph);
		}

		pendingParagraph = cloneParagraphShell(paragraph);
	};
	const childNodes = Array.from(paragraph.childNodes);

	for (let index = 0; index < childNodes.length; index += 1) {
		const node = childNodes[index];

		if (!isMusicEmbedNode(node)) {
			pendingParagraph.appendChild(node);
			continue;
		}

		const run = [];

		while (index < childNodes.length && isMusicEmbedNode(childNodes[index])) {
			run.push(childNodes[index]);
			index += 1;
		}
		index -= 1;

		if (run.length <= 1) {
			pendingParagraph.appendChild(run[0]);
			continue;
		}

		flushPendingParagraph();
		createPagedMusicRows(paragraph, run, availableWidth)
			.forEach((row) => fragments.push(row));
		changed = true;
	}

	flushPendingParagraph();

	if (changed) {
		paragraph.replaceWith(...fragments);
	}
}

function createPagedMusicRows(paragraph, embeds, availableWidth) {
	const rows = [];
	let row = createPagedMusicRow(paragraph);
	let usedWidth = 0;

	embeds.forEach((embed) => {
		const embedWidth = getMusicEmbedOuterWidth(embed);

		if (row.childNodes.length && usedWidth + embedWidth > availableWidth) {
			rows.push(row);
			row = createPagedMusicRow(paragraph);
			usedWidth = 0;
		}

		row.appendChild(embed);
		usedWidth += embedWidth;
	});

	if (row.childNodes.length) {
		rows.push(row);
	}

	return rows;
}

function createPagedMusicRow(paragraph) {
	const row = cloneParagraphShell(paragraph);

	row.classList.add('mn-paged-music-row');
	return row;
}

function cloneParagraphShell(paragraph) {
	const clone = paragraph.ownerDocument.createElement('p');

	Array.from(paragraph.attributes).forEach((attribute) => {
		clone.setAttribute(attribute.name, attribute.value);
	});

	return clone;
}

function isMusicEmbedNode(node) {
	return node.nodeType === Node.ELEMENT_NODE
		&& node.classList.contains('music-keyboard-embed');
}

function hasVisibleParagraphContent(paragraph) {
	return Array.from(paragraph.childNodes).some((node) => {
		if (node.nodeType === Node.TEXT_NODE) {
			return Boolean(node.nodeValue?.replace(/\uFEFF/g, '').trim());
		}

		if (node.nodeType !== Node.ELEMENT_NODE) {
			return false;
		}

		if (node.tagName?.toLowerCase() === 'br') {
			return false;
		}

		return Boolean(node.textContent?.replace(/\uFEFF/g, '').trim())
			|| node.querySelector?.('img, svg, canvas, table, .music-keyboard-embed');
	});
}

function getMusicEmbedOuterWidth(embed) {
	const style = embed.style;
	const layoutWidth = parseCssPixelValue(style.getPropertyValue('--music-embedded-layout-width'));
	const embedWidth = parseCssPixelValue(style.getPropertyValue('--music-embed-width'));
	const marginRight = parseCssPixelValue(style.marginRight);

	return (layoutWidth || embedWidth || 0) + (Number.isFinite(marginRight) ? marginRight : 18);
}

function normalizeAvailableWidth(availableWidth) {
	const width = Number(availableWidth);

	return Number.isFinite(width) && width > 0 ? width : 0;
}

function parseCssPixelValue(value) {
	const match = String(value || '').match(/^(-?\d+(?:\.\d+)?)px$/);

	return match ? Number(match[1]) : 0;
}

function applyPagedMusicEmbedDisplayStyles(embed) {
	const styledElements = [embed, ...Array.from(embed.querySelectorAll('[style]'))];

	styledElements.forEach((element) => {
		if (element.style.display) {
			return;
		}

		if (element.classList.contains('music-keyboard-embed')) {
			element.style.display = 'var(--mn-paged-display, inline-block)';
			return;
		}

		element.style.display = getPagedDisplayFallback(element);
	});
}

function getPagedDisplayFallback(element) {
	if (
		element.classList.contains('ReactPiano__Keyboard')
		|| element.classList.contains('ReactPiano__Key')
		|| element.classList.contains('ReactPiano__NoteLabelContainer')
	) {
		return 'var(--mn-paged-display, flex)';
	}

	const tagName = element.tagName?.toLowerCase();

	if (tagName === 'span') {
		return 'var(--mn-paged-display, inline-block)';
	}

	if (tagName === 'svg') {
		return 'var(--mn-paged-display, block)';
	}

	return 'var(--mn-paged-display, block)';
}

function getMusicEmbedSize(embed) {
	const payload = parseMusicEmbedPayload(embed);
	const sizing = normalizeMusicEmbedSizing(payload);

	return {
		height: sizing.height,
		captionHeight: sizing.captionHeight,
		scale: sizing.scale,
		width: sizing.width,
		renderedHeight: sizing.layoutHeight,
		renderedWidth: sizing.layoutWidth,
	};
}

function applyMusicEmbedSize(element, size) {
	applyMusicEmbedContentSize(element, size);
	element.style.setProperty('--music-embedded-layout-width', `${size.renderedWidth}px`);
	element.style.setProperty('--music-embedded-layout-height', `${size.renderedHeight}px`);
}

function applyMusicEmbedContentSize(element, size, keyboardPayload = '') {
	element.style.setProperty('--music-embed-width', `${size.width}px`);
	element.style.setProperty('--music-embed-height', `${size.height}px`);
	element.style.setProperty('--music-embed-caption-height', `${size.captionHeight}px`);
	element.style.setProperty('--music-embed-scale', String(size.scale));

	if (keyboardPayload && !element.dataset.keyboardPayload) {
		element.dataset.keyboardPayload = keyboardPayload;
	}
}

function parseMusicEmbedPayload(embed) {
	if (!embed) {
		return {};
	}

	try {
		return JSON.parse(embed.dataset.keyboardPayload || '{}') || {};
	} catch {
		return {};
	}
}
