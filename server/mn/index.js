import path from 'path';

export default function mnRouter(_express, router, app) {
	router.get('*', function(_request, response) {
		if (app && typeof app.sendIndex === 'function') {
			app.sendIndex(response);
			return;
		}

		response.sendFile(path.resolve('dist', 'mn', 'index.html'));
	});
}
