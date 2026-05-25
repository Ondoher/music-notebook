import React from 'react';

const MusicNotebookContext = React.createContext({
	app: {},
	localize: null,
	locale: 'en-US-u-ms-ussystem',
	registry: null,
});

export default MusicNotebookContext;
