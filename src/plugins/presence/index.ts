
import { BotPlugin } from "@modules/plugins";
import { Client } from "discord.js";



export default class PresencePlugin extends BotPlugin {
    constructor(bot: Client, dir: string) {
        super(bot, dir)
        this.id = 'presence'
    }

    async onLoad(): Promise<void> {
        this.bot.user?.setActivity('Debugging and shit')
    }

    async onDestroyed(): Promise<void> {

    }
}
