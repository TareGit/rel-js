import { Client, ClientEvents } from 'discord.js';
import { NONAME } from 'dns';

export type NoParamCallback = () => void | Promise<void>;

const enum ELoadableState {
	INACTIVE = 'Inactive',
	ACTIVE = 'Active',
	LOADING = 'Loading',
	DESTROYING = 'Destroying',
}

export { ELoadableState };

/**
 * Base class for all Classes that will need a load => destroy lifecycle.
 */
export abstract class Loadable {
	/**
	 * The internal state of this {@link Loadable| Loadable}
	 */
	private _state: ELoadableState = ELoadableState.INACTIVE;

	/**
	 * All callbacks relating to state changes
	 */
	_stateCallbacks: Map<ELoadableState, NoParamCallback[]> = new Map();

	constructor() {}

	set state(newState: ELoadableState) {
		if (this._stateCallbacks.has(newState)) {
			this._stateCallbacks.get(newState)!.forEach((c) => c());
			this._stateCallbacks.delete(newState);
		}

		this._state = newState;
	}

	get state() {
		return this._state;
	}

	/**
	 * Sets the state to newState if its not already 'newState'. if the state
	 * is already 'newState' it just waits for 'waitForState'
	 * @param newState
	 * @param waitForState
	 * @returns true if we set the state, false if we waited for the state to change
	 */
	async setAndWaitForState(
		newState: ELoadableState,
		waitForState: ELoadableState
	) {
		if (this.state === newState) {
			await this.waitForState(waitForState);
			return false;
		}
		this.state = newState;
		return true;
	}

	/**
	 * load this {@link Loadable | Loadable}
	 * @returns
	 */
	async load(old?: this) {
		if (
			!(await this.setAndWaitForState(
				ELoadableState.LOADING,
				ELoadableState.ACTIVE
			))
		)
			return;

		await this.onLoad(old).catch(this.onLoadError.bind(this));
		this.state = ELoadableState.ACTIVE;
	}

	/**
	 * Can be used to handle {@link load| load} errors
	 * @param error
	 */
	async onLoadError(error: Error) {}

	/**
	 * Called during {@link load | load},Child classes can override this for initialization
	 * @param old The old instance just before it is discarded (if one exists)
	 */
	async onLoad(old?: this) {}

	/**
	 * Waits for the state to change to 'state'
	 * @param state
	 * @returns
	 */
	async waitForState(state: ELoadableState) {
		if (this.state === state) return;
		return new Promise<void>((resolve) => {
			if (!this._stateCallbacks.has(state)) {
				this._stateCallbacks.set(state, [resolve]);
			} else {
				this._stateCallbacks.get(state)!.push(resolve);
			}
		});
	}

	/**
	 * destroy this {@link Loadable | Loadable}
	 * @returns
	 */
	async destroy() {
		if (
			!(await this.setAndWaitForState(
				ELoadableState.DESTROYING,
				ELoadableState.INACTIVE
			))
		)
			return;

		await this.onDestroy();

		console.info('Finished Destroy');
		this.state = ELoadableState.INACTIVE;
		console.info('Resolved callbacks');
	}

	/**
	 * Called during {@link destroy | destroy}, Child classess can override this for cleanup
	 */
	async onDestroy() {}
}

/**
 * Base class for all Modules the bot has
 */
export abstract class BotModule extends Loadable {
	/**
	 * A reference to the actual bot
	 */
	get bot() {
		return bus.bot;
	}

	constructor() {
		super();
	}

	async onLoadError(error: Error): Promise<void> {
		console.error('Error loading module', this.constructor.name, '\n', error);
	}
}
