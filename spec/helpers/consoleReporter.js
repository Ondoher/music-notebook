import JasmineConsoleReporter from "jasmine-console-reporter";

let consoleReporter = new JasmineConsoleReporter({
	colors: 1,
	cleanStack: 1,
	verbosity: 4,
	listStyle: "indent",
	activity: true,
});

jasmine.getEnv().addReporter(consoleReporter);
