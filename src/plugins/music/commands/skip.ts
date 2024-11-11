import { CommandContext, SlashCommand } from '@modules/commands';
import MusicPlugin from '..';
import { buildBasicEmbed, getMemeberAvatarUrl } from '@core/utils';

export default class SkipQueueCommand extends SlashCommand<MusicPlugin> {
	constructor() {
		super('skip', 'skips the current song', MusicPlugin.GROUP, []);
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

		await queue.skip();

		await ctx.editReply({
			embeds: [await buildBasicEmbed(ctx, 'Skipped', getMemeberAvatarUrl(ctx))],
		});
	}
}
