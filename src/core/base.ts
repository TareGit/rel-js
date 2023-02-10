import { Client } from "discord.js";
import { log } from "@core/utils";
import { BoundEvent, BoundEventCallback, BoundEventTarget, } from "./types";
import { NONAME } from "dns";

export type NoParamCallback = () => (void | Promise<void>)

const enum ELoadableState {
    INACTIVE = "Inactive",
    ACTIVE = "Active",
    LOADING = "Loading",
    DESTROYING = "Destroying"
}

export {
    ELoadableState
}

export abstract class Loadable {
    events: BoundEvent[] = []
    private _state: ELoadableState = ELoadableState.INACTIVE
    _stateCallbacks: Map<ELoadableState, NoParamCallback[]> = new Map()
    constructor() {
    }

    set state(newState: ELoadableState) {

        if (newState === ELoadableState.INACTIVE) {
            for (let i = 0; i < this.events.length; i++) {
                this.events[i].target.off(this.events[i].event, this.events[i].callback);
            }

            this.events = []
        }

        if (this._stateCallbacks.has(newState)) {
            this._stateCallbacks.get(newState)!.forEach(c => c())
            this._stateCallbacks.delete(newState)
        }

        this._state = newState
    }

    get state() {
        return this._state
    }

    // Events added will be automatically unbound once this class is destroyed
    addBoundEvent(target: BoundEventTarget, event: string, callback: BoundEventCallback) {
        this.events.push({
            target,
            event,
            callback
        })
    }

    addBoundEvents(events: BoundEvent[]) {
        this.events.push.apply(this.events, events)
    }

    async waitAndSetState(newState: ELoadableState, waitForState: ELoadableState) {
        if (this.state === newState) {
            await this.waitForState(waitForState)
            return false
        }
        this.state = newState
        return true
    }

    // child classes must set "isReady" to true at the end of this function and must call "onLoad"
    async load() {
        if (!(await this.waitAndSetState(ELoadableState.LOADING, ELoadableState.ACTIVE))) return

        await this.onLoad().catch(this.onLoadError.bind(this))
        this.state = ELoadableState.ACTIVE
    }

    async onLoadError(error: Error) {

    }

    async onLoad() {

    }

    async waitForState(state: ELoadableState) {
        if (this.state === state) return
        return new Promise<void>(((resolve) => {
            if (!this._stateCallbacks.has(state)) {
                this._stateCallbacks.set(state, [resolve]);
            }
            else {
                this._stateCallbacks.get(state)!.push(resolve)
            }
        }))
    }

    // child classes must call "onDestroy" and must unbind all events
    async destroy() {

        if (!(await this.waitAndSetState(ELoadableState.DESTROYING, ELoadableState.INACTIVE))) return

        await this.onDestroy()

        log("Finished Destroy")
        this.state = ELoadableState.INACTIVE
        log("Resolved callbacks")
    }

    async onDestroy() {

    }

}

export abstract class BotModule extends Loadable {
    bot: Client;


    constructor(bot: Client) {
        super();
        this.bot = bot;
    }

    async onLoadError(error: Error): Promise<void> {
        log("Error loading module", this.constructor.name, "\n", error)
    }
}