import { GuildMember } from 'discord.js';
import path from 'path';
import { ECommandOptionType } from '@core/types';
import { Page } from 'puppeteer';
import { SlashCommand, CommandContext } from '@modules/commands';
import * as fs from 'fs';
import LevelingPlugin, { getXpForNextLevel } from '@plugins/levels/index';
import { EOptsKeyLocation, FrameworkConstants } from '@core/framework';

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
		console.info('Fetching user');
		const settings = await bus.database.getUser(member.id, true);

		console.info('Fetching level data');
		const levelingData = await this.plugin!.getLevelData(guildId, settings.id);

		const progress = levelingData.xp || 0.001;
		const required = getXpForNextLevel(levelingData.level);

		console.info('Fetching rank');
		const rank = await this.plugin!.getRank(guildId, settings.id);

		console.info('User Rank gotten');
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

		console.info('Card built');

		return customizedCard;
	}

	async execute(ctx: CommandContext, ...args: unknown[]): Promise<void> {
		await ctx.deferReply();
		const member = (ctx.asSlashContext.options.getMember(
			this.options[0].name,
			this.options[0].required
		) || ctx.asSlashContext.member) as GuildMember;
		let page: Page | null = null;
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

			console.info(' Fetched option');
			const card = await this.buildCard(member);

			console.info('Card Data Generated');
			page = await bus.browser.getPage();
			console.info('Page Gotten');
			await page.setViewport({ width: 1200, height: 400 });
			await page.setContent(card, { waitUntil: 'load' });
			const content = await page.$('body');
			if (content) {
				const imageBuffer = await content.screenshot({
					omitBackground: true,
					type: 'png',
				});
				console.info('CardGenerated');
				await ctx.editReply({ files: [{ attachment: imageBuffer }] });
				console.info('Card Sent');
			}

			bus.browser.closePage(page);
			page = null;
		} catch (error: any) {
			if (page) {
				bus.browser.closePage(page);
				page = null;
			}
			console.error(error);
		}
	}
}
