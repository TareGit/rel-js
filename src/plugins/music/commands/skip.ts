import { SlashCommand } from '@modules/commands';
import MusicPlugin from '..';

export default class SkipQueueCommand extends SlashCommand<MusicPlugin> {
	constructor() {
		super('skip', 'skips the current song', MusicPlugin.GROUP, []);
	}
}
