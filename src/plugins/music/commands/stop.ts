import { SlashCommand } from '@modules/commands';
import MusicPlugin from '..';

export default class StopQueueCommand extends SlashCommand<MusicPlugin> {
	constructor() {
		super(
			'stop',
			'Stops the current song and disconnects the bot from the channel',
			MusicPlugin.GROUP,
			[]
		);
	}
}
