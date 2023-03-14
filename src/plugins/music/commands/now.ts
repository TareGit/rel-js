import { SlashCommand } from '@modules/commands';
import MusicPlugin from '..';

export default class NowPlayingCommand extends SlashCommand<MusicPlugin> {
	constructor() {
		super('now', 'Shows the current song', MusicPlugin.GROUP, []);
	}
}
