import React from 'react';
import { createTestHarness } from '../TestHarness.js';
import MusicNotebookContext from '../../common/MusicNotebookContext.js';

function ContextProbe() {
	return (
		<MusicNotebookContext.Consumer>
			{(context) => (
				<span className="context-probe">
					{context.app.name}
				</span>
			)}
		</MusicNotebookContext.Consumer>
	);
}

describe('TestHarness', function() {
	let harness;

	afterEach(function() {
		harness?.unmount();
		harness = null;
	});

	it('renders components with music notebook context', function() {
		harness = createTestHarness().withApp({ name: 'mn' });

		const result = harness.render(ContextProbe);

		expect(result.container.querySelector('.context-probe').textContent).toBe('mn');
	});
});
