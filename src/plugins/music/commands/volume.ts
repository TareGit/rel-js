import { ECommandOptionType } from '@core/types';
import { CommandContext, SlashCommand } from '@modules/commands';
import MusicPlugin from '..';
import { buildBasicEmbed, getMemeberAvatarUrl } from '@core/utils';
import { GuildManager, GuildMember } from 'discord.js';

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

	override async execute(
		ctx: CommandContext,
		...args: unknown[]
	): Promise<void> {
		await ctx.deferReply();

		const volume = await ctx.asSlashContext.options.getInteger(
			this.options[0].name,
			true
		);
		const queue = await this.plugin?.getQueueById(
			ctx.asSlashContext.guildId ?? ''
		);

		if (!queue) {
			await ctx.editReply({
				embeds: [await buildBasicEmbed(ctx, 'There is no player')],
			});
			return;
		}

		if (!(ctx.asSlashContext.member as GuildMember).voice.channel) {
			await ctx.editReply({
				embeds: [await buildBasicEmbed(ctx, 'You are not in a voice channel!')],
			});
			return;
		}

		await queue.setVolume(volume);

		await ctx.editReply({
			embeds: [
				await buildBasicEmbed(
					ctx,
					'Changed the volume',
					getMemeberAvatarUrl(ctx)
				),
			],
		});
	}
}
