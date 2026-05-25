import { Service } from '@polylith/core';
import { createTheme } from '@mui/material/styles';

export default class ThemeService extends Service {
	constructor(registry) {
		super('theme', registry);
		this.implement(['start', 'getTheme']);
	}

	start() {
		this.theme = createTheme({
			cssVariables: {
				colorSchemeSelector: 'class',
			},
			colorSchemes: {
				light: {
					palette: {
						primary: {
							main: '#346f68',
						},
						background: {
							default: '#ebe7dc',
							paper: '#fffefa',
						},
						text: {
							primary: '#20242c',
							secondary: '#69717e',
						},
						divider: '#d7d2c4',
					},
				},
				dark: {
					palette: {
						primary: {
							main: '#8fd7cb',
						},
						background: {
							default: '#181b20',
							paper: '#22272f',
						},
						text: {
							primary: '#f5f2e8',
							secondary: '#c4bdad',
						},
						divider: '#383d46',
					},
				},
			},
			typography: {
				fontFamily: 'Arial, Helvetica, sans-serif',
			},
			components: {
				MuiButtonBase: {
					defaultProps: {
						disableRipple: true,
					},
				},
			},
		});
	}

	getTheme() {
		return this.theme;
	}
}

new ThemeService();
