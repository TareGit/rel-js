import { GuildMember } from 'discord.js';
import path from 'path';
import { ECommandOptionType } from '@core/types';
import nodeHtmlToImage from 'node-html-to-image';
import { SlashCommand, CommandContext } from '@modules/commands';
import * as fs from 'fs';
import LevelingPlugin, { getXpForNextLevel } from '@plugins/levels/index';
import { EOptsKeyLocation, FrameworkConstants } from '@core/common';

export default class LevelCommand extends SlashCommand<LevelingPlugin> {
	levelCard!: string | null;
	constructor() {
		super(
			'level',
			'Displays your level',
			FrameworkConstants.COMMAND_GROUPS.FUN,
			[
				{
					name: 'user',
					description: 'The user to check the level of',
					type: ECommandOptionType.USER,
					required: false,
				},
			]
		);
	}

	override async onLoad(old?: this): Promise<void> {
		this.levelCard = await fs.promises.readFile(
			path.join(this.plugin!.assetsPath, 'card.html'),
			{ encoding: 'utf-8' }
		);
	}

	async buildCard(member: GuildMember) {
		const guildId = member.guild.id;

		const settings = await bus.database.getUser(member.id, true);

		const levelingData = await this.plugin!.getLevelData(guildId, settings.id);

		const progress = levelingData.xp || 0.001;

		const required = getXpForNextLevel(levelingData.level);

		const rank = await this.plugin!.getRank(guildId, settings.id);

		const customizedCard = this.levelCard!.replaceAll(
			'{opacity}',
			settings.cardOpacity
		)
			.replaceAll('{color}', settings.cardColor)
			.replaceAll('{percent}', `${Math.min(progress / required, 1) * 100}`)
			.replaceAll('{bg}', settings.cardBg)
			.replaceAll(
				'{avatar}',
				member.displayAvatarURL({
					size: 512,
				})
			)
			.replaceAll('{username}', member.displayName)
			.replaceAll('{rank}', `${rank + 1}`)
			.replaceAll('{level}', `${levelingData.level}`)
			.replaceAll('{progress}', `${(progress / 1000).toFixed(2)}`)
			.replaceAll('{required}', `${(required / 1000).toFixed(2)}`);

		return customizedCard;
	}

	async execute(ctx: CommandContext, ...args: unknown[]): Promise<void> {
		await ctx.deferReply();
		const member = (ctx.asSlashContext.options.getMember(
			this.options[0].name
		) ?? ctx.asSlashContext.member) as GuildMember;

		try {
			const levelingOptions = (
				await bus.database.getGuild(ctx.asSlashContext.guildId)
			).raw.level_opts;

			if (
				!levelingOptions.get('location') ||
				levelingOptions.get('location') === EOptsKeyLocation.NONE
			) {
				await ctx.editReply('Leveling is disabled in this server!');
				return;
			}

			const card = await this.buildCard(member);

			const result = await nodeHtmlToImage({
				html: card,
				encoding: 'binary',
				transparent: true,
				type: 'png',
			}).then((a) => a as Buffer);

			await ctx.editReply({ files: [{ attachment: result }] });
		} catch (error: any) {
			console.error(error);
		}
	}
}
