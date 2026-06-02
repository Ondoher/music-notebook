import Quill from 'quill';
import { ClassAttributor, Scope, StyleAttributor } from 'parchment';

let registered = false;

/**
 * Registers paragraph-level Quill formats owned by the paragraph-format feature.
 *
 * @returns {boolean}
 */
export function registerParagraphFormats() {
	if (registered) {
		return false;
	}

	Quill.register(
		{
			'formats/paragraphFontSize': new StyleAttributor('paragraphFontSize', 'font-size', {
				scope: Scope.BLOCK,
			}),
			'formats/paragraphPaddingAfter': new StyleAttributor('paragraphPaddingAfter', 'padding-bottom', {
				scope: Scope.BLOCK,
			}),
			'formats/paragraphPaddingBefore': new StyleAttributor('paragraphPaddingBefore', 'padding-top', {
				scope: Scope.BLOCK,
			}),
			'formats/paragraphAlignment': new ClassAttributor('paragraphAlignment', 'ql-paragraph-align', {
				scope: Scope.BLOCK,
				whitelist: ['left', 'center', 'right', 'justify'],
			}),
			'formats/paragraphBold': new ClassAttributor('paragraphBold', 'ql-paragraph-bold', {
				scope: Scope.BLOCK,
				whitelist: ['true', 'false'],
			}),
			'formats/paragraphItalic': new ClassAttributor('paragraphItalic', 'ql-paragraph-italic', {
				scope: Scope.BLOCK,
				whitelist: ['true', 'false'],
			}),
			'formats/paragraphKeepWithNext': new ClassAttributor('paragraphKeepWithNext', 'ql-paragraph-keep-with-next', {
				scope: Scope.BLOCK,
				whitelist: ['true', 'false'],
			}),
			'formats/paragraphStart': new ClassAttributor('paragraphStart', 'ql-paragraph-start', {
				scope: Scope.BLOCK,
				whitelist: ['continuous', 'full-line', 'next-page'],
			}),
			'formats/paragraphStyle': new ClassAttributor('paragraphStyle', 'ql-paragraph-style', {
				scope: Scope.BLOCK,
			}),
			'formats/paragraphUnderline': new ClassAttributor('paragraphUnderline', 'ql-paragraph-underline', {
				scope: Scope.BLOCK,
				whitelist: ['true', 'false'],
			}),
		},
		true,
	);
	registered = true;
	return true;
}
