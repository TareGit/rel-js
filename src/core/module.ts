import { Client } from "discord.js";


export abstract class WaitForReady {

    private _ready: boolean;
    private readyCallbacks: (() => void)[] = []
    constructor() {

    }

    set isReady(inNewReady: boolean) {
        this._ready = inNewReady
        if (inNewReady) {
            for (let i = 0; i < this.readyCallbacks.length; i++) {
                this.readyCallbacks[i]()
            }
            this.readyCallbacks = []
        }
    }

    get isReady() {
        return this._ready;
    }

    async ensureReady() {
        if (!this.isReady) await new Promise<void>((res) => this.readyCallbacks.push(res));
    }
}
export abstract class BotModule extends WaitForReady {
    bot: Client;


    constructor(bot: Client) {
        super();
        this.bot = bot;
    }

    async finishLoad() {
        this.isReady = true;
    }

    async onBeginLoad() {

    }

    async onBeginDestroy() {

    }
}