/* global describe it expect beforeEach */

import { mkdir, writeFile } from 'fs/promises';
import os from 'os';
import path from 'path';
import { Registry } from '@polylith/core';
import { MarkdownService } from '../markdown-service.js';

describe('MarkdownService', function() {
	let markdown;
	let root;
	let testIndex = 0;

	beforeEach(async function() {
		testIndex += 1;
		root = path.join(os.tmpdir(), `music-notebook-markdown-${process.pid}-${testIndex}`);
		await mkdir(path.join(root, 'en_US'), {recursive: true});

		markdown = new MarkdownService(new Registry());
		markdown.start();
		markdown.root = root;
	});

	it('normalizes request language and markdown names for safe file lookup', function() {
		expect(markdown.normalizeLanguage('en-US,en;q=0.9')).toBe('en_US');
		expect(markdown.normalizeLanguage('../bad')).toBe('bad');
		expect(markdown.normalizeName('../accounts-login.md')).toBe('accounts-login');
		expect(markdown.normalizeName('bad/name<script>')).toBe('namescript');
	});

	it('loads markdown from the requested language folder', async function() {
		await mkdir(path.join(root, 'fr_CA'), {recursive: true});
		await writeFile(path.join(root, 'fr_CA', 'accounts-login.md'), 'Bonjour', 'utf-8');
		await writeFile(path.join(root, 'en_US', 'accounts-login.md'), 'Hello', 'utf-8');

		const result = await markdown.getMarkdown('accounts-login', 'fr-CA,fr;q=0.9');

		expect(result).toEqual({
			success: true,
			data: 'Bonjour',
		});
	});

	it('falls back to en_US when localized markdown is missing', async function() {
		await writeFile(path.join(root, 'en_US', 'accounts-login.md'), 'Hello', 'utf-8');

		const result = await markdown.getMarkdown('accounts-login', 'fr-CA');

		expect(result).toEqual({
			success: true,
			data: 'Hello',
		});
	});

	it('reports missing markdown documents', async function() {
		const result = await markdown.getMarkdown('missing', 'en-US');

		expect(result).toEqual({
			success: false,
			reason: 'markdown.error.file_not_found',
		});
	});
});
