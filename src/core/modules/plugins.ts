import { Client } from "discord.js";
import { BotModule } from "@core/module";
import { log } from "@core/utils";

export abstract class BotPlugin {
    bot: Client;
    constructor(bot: Client) {
        this.bot = bot;
    }

    async onRegistered() {

    }

    async onDeregistered() {

    }
}

export class PluginsModule extends BotModule {
    plugins: Map<string, BotPlugin>;

    constructor(bot: Client) {
        super(bot);
    }

    async beginLoad(): Promise<void> {
        log("Preparing Plugins")

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

        await plugin.onRegistered();

        return plugin;
    }

    get size() {
        return this.plugins.size;
    }
}

