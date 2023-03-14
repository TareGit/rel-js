import { SlashCommand } from '@modules/commands';
import MusicPlugin from '..';

export default class ResumeQueueCommand extends SlashCommand<MusicPlugin> {
	constructor() {
		super('resume', 'Resumes the current song', MusicPlugin.GROUP, []);
	}
}
