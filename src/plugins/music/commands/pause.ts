import { SlashCommand } from '@modules/commands';
import MusicPlugin from '..';

export default class PauseCommand extends SlashCommand<MusicPlugin> {
	constructor() {
		super('pause', 'Pauses the current song', MusicPlugin.GROUP, []);
	}
}
