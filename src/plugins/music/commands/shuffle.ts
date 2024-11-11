import { CommandContext, SlashCommand } from '@modules/commands';
import MusicPlugin from '..';
import { buildBasicEmbed, getMemeberAvatarUrl } from '@core/utils';

export default class ShuffleQueueCommand extends SlashCommand<MusicPlugin> {
	constructor() {
		super('shuffle', 'shuffles the queue', MusicPlugin.GROUP, []);
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

		queue.queue = queue.queue
			.map((value) => ({ value, sort: Math.random() }))
			.sort((a, b) => a.sort - b.sort)
			.map(({ value }) => value);

		await ctx.editReply({
			embeds: [
				await buildBasicEmbed(ctx, 'Shuffled', getMemeberAvatarUrl(ctx)),
			],
		});
	}
}
