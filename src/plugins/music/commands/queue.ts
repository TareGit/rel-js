import { CommandContext, SlashCommand } from '@modules/commands';
import MusicPlugin from '..';
import { buildBasicEmbed } from '@core/utils';

export default class QueueCommand extends SlashCommand<MusicPlugin> {
	constructor() {
		super('queue', 'Shows the current Queue', MusicPlugin.GROUP, []);
	}

	override async execute(
		ctx: CommandContext,
		...args: unknown[]
	): Promise<void> {
		await ctx.deferReply({
			ephemeral: true,
		});

		const queue = await this.plugin?.getQueueById(
			ctx.asSlashContext.guildId ?? ''
		);

		if (!queue) {
			await ctx.editReply({
				embeds: [await buildBasicEmbed(ctx, 'There is no player')],
			});
			return;
		}

		await ctx.editReply({
			embeds: [await queue.buildQueue()],
		});
	}
}
