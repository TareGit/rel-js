import { SlashCommand } from '@modules/commands';
import MusicPlugin from '..';

export default class QueueCommand extends SlashCommand<MusicPlugin> {
	constructor() {
		super('queue', 'Shows the current Queue', MusicPlugin.GROUP, []);
	}
}
