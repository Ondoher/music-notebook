const baseConfig = require('./karma.conf.cjs');

module.exports = function(config) {
	baseConfig({
		set(settings) {
			config.set({
				...settings,
				autoWatch: true,
				restartOnFileChange: true,
				singleRun: false,
			});
		},
	});
};
