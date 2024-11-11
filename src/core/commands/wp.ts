import { ECommandOptionType, IWallpaperzWallpaper } from '@core/types';
import axios from 'axios';
import { CommandContext, SlashCommand } from '@modules/commands';
import { FrameworkConstants } from '@core/common';
import { EmbedBuilder } from 'discord.js';

export default class WallpaperzBrowseCommand extends SlashCommand {
	constructor() {
		super(
			'wp',
			'Search for a wallpaper form the app wallpaperz',
			FrameworkConstants.COMMAND_GROUPS.FUN,
			[
				{
					name: 'search',
					description: 'The wallpaper to search for',
					type: ECommandOptionType.STRING,
					required: false,
				},
			]
		);
	}
	async execute(ctx: CommandContext, ...args: unknown[]): Promise<void> {
		await ctx.deferReply();
		const query = ctx.asSlashContext.options.getString('search') || '';
		try {
			const searchResults: IWallpaperzWallpaper[] = (
				await axios.get(
					`https://wallpaperz-database.oyintare.dev/wallpapers?l=5&q=${encodeURIComponent(
						query
					)}`
				)
			).data;

			if (searchResults.length) {
				await ctx.editReply({
					embeds: searchResults.map((wp) =>
						new EmbedBuilder()
							.setImage(
								`https://wallpaperz.nyc3.cdn.digitaloceanspaces.com/wallpapers/${wp.id}.png `
							)
							.setFooter({
								text: `Size: ${wp.width}x${wp.height}px \nTags: ${wp.tags}`,
								iconURL:
									'https://cdn.discordapp.com/app-icons/967602114350174348/fd6c362b87cc9ee31783175f1f92e57a.png',
							})
					),
				});
			} else {
				await ctx.editReply('No wallpapers found');
			}
		} catch (error) {
			console.error(error);
		}
	}
}
