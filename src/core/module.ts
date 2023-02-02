import { Client } from "discord.js";

export abstract class BotModule {
    bot: Client;
    private moduleReady: boolean;
    private readyCallbacks: (() => void)[]
    constructor(bot: Client) {
        this.bot = bot;
        this.readyCallbacks = []
    }

    set isReady(inNewReady: boolean) {
        this.moduleReady = inNewReady
        if (inNewReady) {
            for (let i = 0; i < this.readyCallbacks.length; i++) {
                this.readyCallbacks[i]()
            }
            this.readyCallbacks = []
        }
    }

    get isReady() {
        return this.moduleReady;
    }

    async ensureReady() {
        if (!this.isReady) await new Promise<void>((res) => this.readyCallbacks.push(res));
    }

    async finishLoad() {
        this.isReady = true;
    }

    async beginLoad() {

    }

    async onDestroyed() {

    }
}