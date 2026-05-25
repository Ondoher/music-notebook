import { Service } from '@polylith/core';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import StyledEngineProvider from '@mui/styled-engine/StyledEngineProvider';
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

export default class MainView extends Service {
	constructor(registry) {
		super('main-view', registry);
		this.implement(['start', 'render']);
	}

	start() {
		this.root = null;
	}

	render(component) {
		const domNode = document.getElementById('main-content');
		const themeService = this.registry.subscribe('theme');
		const theme = themeService.getTheme();

		if (!this.root) {
			this.root = createRoot(domNode);
		}

		this.root.render(React.createElement(
			React.StrictMode,
			null,
			React.createElement(
				StyledEngineProvider,
				{ enableCssLayer: true },
				React.createElement(
					ThemeProvider,
					{ theme },
					React.createElement(CssBaseline, null),
					React.createElement(App, { registry: this.registry }, component),
				),
			),
		));
	}
}

new MainView();
