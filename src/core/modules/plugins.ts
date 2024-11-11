import { BotModule, Loadable } from '@core/base';
import fs from 'fs';
import path from 'path';

export abstract class BotPlugin extends Loadable {
	assetsPath: string;
	commandsPath: string;
	id: string = '';
	get bot() {
		return bus.bot;
	}
	constructor(dir: string) {
		super();
		this.assetsPath = path.join(dir, 'assets');
		this.commandsPath = path.join(dir, 'commands');
		this.id = '';
	}

	async onLoadError(error: Error): Promise<void> {
		console.error('Error loading plugin', this.constructor.name, '\n', error);
	}
}

export class PluginsModule extends BotModule {
	plugins: Map<string, BotPlugin> = new Map();

	override async onLoad(old?: this): Promise<void> {
		console.info('Preparing Plugins');
		const pluginPaths = await fs.promises.readdir(PATH_PLUGINS);
		for (let i = 0; i < pluginPaths.length; i++) {
			const currentPluginPath = path.join(PATH_PLUGINS, pluginPaths[i]);
			const entryFile = path.join(currentPluginPath, 'index.js');
			const loadedPlugin = new (require(entryFile).default)(
				currentPluginPath
			) as BotPlugin;
			await this.register(loadedPlugin.id, loadedPlugin);

			const commandFile = await fs.promises
				.readdir(loadedPlugin.commandsPath)
				.catch(() =>
					console.info('No Commands found for plugin:', loadedPlugin.id)
				);

			if (commandFile) {
				for (let j = 0; j < commandFile.length; j++) {
					await bus.commands.importCommand(
						path.join(loadedPlugin.commandsPath, commandFile[j]),
						loadedPlugin
					);
				}
			}
		}

		console.info('Plugins Ready');
	}

	getPlugin<T extends BotPlugin>(id: string): T | null {
		return this.plugins.get(id) as T | null;
	}

	async deregister(id: string) {
		if (this.plugins.has(id)) {
			await this.plugins.get(id)?.destroy();
			this.plugins.delete(id);
		}
	}

	async register(id: string, plugin: BotPlugin) {
		await this.deregister(id);

		this.plugins.set(id, plugin);
		await plugin.load();
		console.info('Registered Plugin', plugin.id);
		return plugin;
	}

	get size() {
		return this.plugins.size;
	}

	override async destroy() {
		await Promise.allSettled(
			Array.from(this.plugins.values()).map((a) => a.destroy())
		);
	}
}
