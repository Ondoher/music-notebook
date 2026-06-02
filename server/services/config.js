import { Service } from "@polylith/core";
import { readFile } from "node:fs/promises";
import * as path from "node:path";

/** Loads server-local configuration and exposes dotted-path lookups. */
export class ConfigService extends Service {
	constructor(registry) {
		super("config", registry);

		this.implement(["start", "get"]);
		this.config = {};
	}

	/**
	 * Reads and parses one JSON config file.
	 *
	 * @param {string} filename - Identifies the JSON file to read.
	 * @returns {Promise<object>} Returns parsed JSON, or an empty object when the file is unavailable.
	 */
	async safeReadJSON(filename) {
		try {
			let json = await readFile(filename, "utf-8");
			return JSON.parse(json);

		} catch (error) {
			console.warn(`unable to load or parse JSON file ${filename}`);
			console.warn(error.message);

			return {};
		}
	}

	/**
	 * Resolves the environment-specific config file path.
	 *
	 * @returns {string} Returns the config file path.
	 */
	getConfigFilename() {
		let env = process.env.MN_ENV ?? process.env.NODE_ENV ?? "dev";
		return path.normalize(path.join("config", "mn", `config.${env}.json`));
	}

	/** Loads server-local config into memory. */
	async start() {
		let filename = this.getConfigFilename();
		this.config = await this.safeReadJSON(filename);
	}

	/**
	 * Reads a config value by dotted path.
	 *
	 * @param {string} name - Identifies the dotted config path.
	 * @param {*} defaultValue - Supplies the fallback value when the final path segment is missing.
	 * @returns {*} Returns the resolved config value.
	 */
	get(name, defaultValue) {
		let parts = name.split(".");
		let result = this.config;

		while (parts.length > 0) {
			let key = parts.shift();
			result = result[key];

			if (result === undefined) {
				if (parts.length === 0) {
					return defaultValue;
				}

				return undefined;
			}
		}

		return result;
	}
}

new ConfigService();
