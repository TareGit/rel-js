import axios from 'axios';
import { FrameworkConstants } from '@core/framework';
import { buildBasicEmbed } from '@core/utils';
import { SlashCommand, CommandContext } from '@modules/commands';

export default class AnimeCommand extends SlashCommand {
	constructor() {
		super(
			'anime',
			'Gets basic information about an anime',
			FrameworkConstants.COMMAND_GROUPS.FUN,
			[
				{
					name: 'anime',
					description: 'The anime to search for',
					type: 3,
					required: true,
				},
			]
		);
	}

	async execute(ctx: CommandContext, targetCommand = ''): Promise<void> {
		await ctx.deferReply();

		const searchTerm = ctx.asSlashContext.options.getString(
			this.options[0].name
		)!;

		const params = new URLSearchParams();
		params.append('q', searchTerm!);
		params.append('limit', '1');
		params.append('nsfw', 'string');
		params.append('fields', 'status,num_episodes,synopsis,rank,anime_score');

		let response: any = undefined;

		try {
			response = (
				await axios.get(`${process.env.MAL_API}/anime?`, {
					headers: { 'X-MAL-CLIENT-ID': process.env.MAL_API_KEY! },
					params: params,
				})
			).data;

			const animeData = response.data[0].node;

			const Embed = await buildBasicEmbed(ctx);

			Embed.setURL(`https://myanimelist.net/anime/${animeData.id}`);

			Embed.setTitle(animeData.title);

			Embed.setDescription(
				animeData.synopsis.replace('[Written by MAL Rewrite]', '')
			);

			Embed.setImage(animeData.main_picture.medium);

			Embed.addFields([
				{
					name: 'Status',
					value: `${
						animeData.status === 'currently_airing' ? 'Airing' : 'Completed'
					}`,
				},
			]);

			ctx.editReply({ embeds: [Embed] });
		} catch (error) {
			ctx.editReply({
				embeds: [await buildBasicEmbed(ctx, { text: 'Anime Not Found' })],
			});
			console.error(`Error Fetching Anime Data\x1b[0m`, error);
		}
	}
}
