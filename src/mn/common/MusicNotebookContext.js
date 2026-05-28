import React from 'react';

/** @type {MusicNotebookContextValue} */
const defaultMusicNotebookContext = {
	app: {},
	appData: null,
	localize: null,
	locale: 'en-US-u-ms-ussystem',
	registry: null,
};

const MusicNotebookContext = React.createContext(defaultMusicNotebookContext);

export default MusicNotebookContext;
