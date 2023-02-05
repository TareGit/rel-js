import { Client } from "discord.js";
import { BotModule, WaitForReady } from "@core/module";
import { log } from "@core/utils";
import fs, { OpenMode } from 'fs';
import path from 'path';

const PLUGINS_PATH = path.join(process.cwd(), '../plugins')


export abstract class BotPlugin extends WaitForReady {
    assetsPath: string;
    commandsPath: string;
    bot: Client;
    id: string = "";
    constructor(bot: Client, dir: string) {
        super();
        this.bot = bot;
        this.assetsPath = path.join(dir, 'assets')
        this.commandsPath = path.join(dir, 'commands')
        this.id = "";
    }

    async onRegistered() {

    }

    async onDeregistered() {

    }
}

export class PluginsModule extends BotModule {
    plugins: Map<string, BotPlugin> = new Map();

    constructor(bot: Client) {
        super(bot);
    }

    async onBeginLoad(): Promise<void> {
        log("Preparing Plugins")
        const pluginPaths = await fs.promises.readdir(PLUGINS_PATH)
        for (let i = 0; i < pluginPaths.length; i++) {
            const currentPluginPath = path.join(PLUGINS_PATH, pluginPaths[i]);
            const entryFile = path.join(currentPluginPath, 'index.js')
            const loadedPlugin = new (require(entryFile).default)(this.bot, currentPluginPath) as BotPlugin
            await this.register(loadedPlugin.id, loadedPlugin);

            const commandFile = await fs.promises.readdir(loadedPlugin.commandsPath).catch(() => log("No Commands found for plugin:", loadedPlugin.id))

            if (commandFile) {
                for (let j = 0; j < commandFile.length; j++) {
                    await bus.commands.importCommand(path.join(loadedPlugin.commandsPath, commandFile[j]), loadedPlugin)
                }
            }

        }

        await this.finishLoad()
        log("Plugins Ready")
    }

    getPlugin<T extends BotPlugin>(id: string): T | null {
        return this.plugins.get(id) as (T | null);
    }

    async deregister(id: string) {
        if (this.plugins.has(id)) {
            await this.plugins.get(id)?.onDeregistered();
            this.plugins.delete(id);
        }
    }

    async register(id: string, plugin: BotPlugin) {
        await this.deregister(id);

        this.plugins.set(id, plugin);
        log("Registering Plugin", plugin.id)
        await plugin.onRegistered();
        log("Registered Plugin", plugin.id)
        return plugin;
    }

    get size() {
        return this.plugins.size;
    }
}

