
import { BotPlugin } from "@modules/plugins";
import { Client } from "discord.js";
import { ActivityTypes } from "discord.js/typings/enums";



export default class PresencePlugin extends BotPlugin {
    constructor(bot: Client, dir: string) {
        super(bot, dir)
        this.id = 'presence'
    }

    async onLoad(): Promise<void> {
        this.bot.user?.setActivity('WATCH MY STREAM PLS', {
            url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            type: ActivityTypes.STREAMING,
        })
    }

    async onDestroyed(): Promise<void> {

    }
}
