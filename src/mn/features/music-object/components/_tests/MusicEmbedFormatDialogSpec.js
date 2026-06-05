import MusicEmbedFormatDialog from '../MusicEmbedFormatDialog.jsx';

describe('MusicEmbedFormatDialog', function() {
	it('resolves caption style formatting from supplied document styles', function() {
		const changes = [];
		const dialog = new MusicEmbedFormatDialog({
			documentStyles: [
				{
					id: 'normal',
					name: 'Normal',
					parentStyleId: '',
					format: {
						alignment: 'left',
						fontSize: 12,
					},
				},
				{
					id: 'caption',
					name: 'Caption',
					parentStyleId: 'normal',
					format: {
						bold: true,
						fontSize: 14,
						italic: true,
					},
				},
			],
			format: {
				caption: {},
			},
			onChange(format) {
				changes.push(format);
			},
			open: true,
		});
		dialog.context = {
			registry: {
				subscribe: jasmine.createSpy('subscribe'),
			},
		};

		dialog.handleCaptionStyleChange('caption');

		expect(dialog.context.registry.subscribe).not.toHaveBeenCalled();
		expect(changes[0].caption).toEqual({
			alignment: 'left',
			bold: true,
			fontSize: 14,
			italic: true,
			styleId: 'caption',
			underline: false,
		});
	});
});
