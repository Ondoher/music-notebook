const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const root = process.cwd();
const logDir = path.join(root, '.codex-logs');

fs.mkdirSync(logDir, { recursive: true });

function logPath(name) {
	return path.join(logDir, name);
}

function commandFor(command) {
	if (process.platform !== 'win32') {
		return command;
	}

	if (command === 'npm') {
		return 'npm.cmd';
	}

	if (command === 'polylith') {
		return 'polylith.cmd';
	}

	return command;
}

function shellQuote(value) {
	return String(value).replace(/'/g, "''");
}

function runLogged(command, args, fileName) {
	return new Promise((resolve, reject) => {
		const log = fs.createWriteStream(logPath(fileName), { flags: 'w' });
		const child = spawn(commandFor(command), args, {
			cwd: root,
			env: process.env,
		});

		child.stdout.pipe(process.stdout);
		child.stdout.pipe(log);
		child.stderr.pipe(process.stderr);
		child.stderr.pipe(log);

		child.on('error', (error) => {
			log.end();
			reject(error);
		});
		child.on('close', (code) => {
			log.end();
			if (code === 0) {
				resolve();
				return;
			}

			reject(new Error(`${command} ${args.join(' ')} exited with ${code}`));
		});
	});
}

function startLogged(command, args, fileName) {
	const commandLine = [commandFor(command), ...args]
		.map((part) => `"${String(part).replace(/"/g, '\\"')}"`)
		.join(' ');
	const logFile = logPath(fileName);
	const child = spawn('powershell.exe', [
		'-NoProfile',
		'-ExecutionPolicy',
		'Bypass',
		'-NoExit',
		'-Command',
		`& ${commandLine} 2>&1 | Tee-Object -FilePath '${shellQuote(logFile)}'`,
	], {
		cwd: root,
		detached: true,
		env: process.env,
		stdio: 'ignore',
		windowsHide: false,
	});

	child.unref();
	console.log(`started ${command} ${args.join(' ')} -> ${path.relative(root, logPath(fileName))}`);
}

async function main() {
	await runLogged('polylith', ['test', 'mn'], 'agent-ui-initial.log');
	startLogged('polylith', ['test', 'mn', '-w'], 'agent-polylith-test-watch.log');
	startLogged('npm', ['run', 'karma:watch'], 'agent-karma-watch.log');
}

main().catch((error) => {
	console.error(error.message || error);
	process.exitCode = 1;
});
