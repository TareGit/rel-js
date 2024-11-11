import { CommandContext, SlashCommand } from '@modules/commands';
import MusicPlugin from '..';
import { buildBasicEmbed } from '@core/utils';
import { GuildTextBasedChannel } from 'discord.js';

export default class NowPlayingCommand extends SlashCommand<MusicPlugin> {
	constructor() {
		super('now', 'Shows the current song', MusicPlugin.GROUP, []);
	}

	override async execute(
		ctx: CommandContext,
		...args: unknown[]
	): Promise<void> {
		await ctx.deferReply();

		const queue = await this.plugin?.getQueueById(
			ctx.asSlashContext.guildId ?? ''
		);

		if (!queue) {
			await ctx.editReply({
				embeds: [await buildBasicEmbed(ctx, 'There is no player')],
			});
			return;
		}

		queue;

		await queue.createNowPlayingEmbed(ctx);
	}
}
