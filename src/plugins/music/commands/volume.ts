import { ECommandOptionType } from '@core/types';
import { SlashCommand } from '@modules/commands';
import MusicPlugin from '..';

export default class QueueVolumeCommand extends SlashCommand<MusicPlugin> {
	constructor() {
		super('volume', 'Sets the music volume', MusicPlugin.GROUP, [
			{
				name: 'volume',
				description: 'The new volume value',
				type: ECommandOptionType.INTEGER,
				required: true,
			},
		]);
	}
}
