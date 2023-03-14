import { ECommandOptionType, ECommandType } from '@core/types';
import { SlashCommand } from '@modules/commands';
import MusicPlugin from '..';

export default class RemoveFromQueueCommand extends SlashCommand<MusicPlugin> {
	constructor() {
		super('remove', 'Removes a song from the queue', MusicPlugin.GROUP, [
			{
				name: 'index',
				description: 'The index of the song in the queue',
				type: ECommandOptionType.INTEGER,
				required: true,
			},
		]);
	}
}
