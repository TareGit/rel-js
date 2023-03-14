import { ECommandOptionType } from '@core/types';
import { SlashCommand } from '@modules/commands';
import MusicPlugin, { ELoopType } from '..';

export default class LoopCommand extends SlashCommand<MusicPlugin> {
	constructor() {
		super('loop', 'Set the loop state of the Queue', MusicPlugin.GROUP, [
			{
				name: 'state',
				description: 'The new loop state (off, song, queue)',
				type: ECommandOptionType.STRING,
				required: true,
				choices: [
					{
						name: 'Off',
						value: ELoopType.NONE,
					},
					{
						name: 'Song',
						value: ELoopType.SONG,
					},
					{
						name: 'Queue',
						value: ELoopType.QUEUE,
					},
				],
			},
		]);
	}
}
