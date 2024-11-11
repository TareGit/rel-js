import { ECommandOptionType } from '@core/types';
import axios from 'axios';
import { SlashCommand, CommandContext } from '@modules/commands';
import { FrameworkConstants } from '@core/common';
import { buildBasicEmbed } from '@core/utils';

export default class SeriesCommand extends SlashCommand {
	constructor() {
		super(
			'series',
			'Gets basic information about a tv series',
			FrameworkConstants.COMMAND_GROUPS.FUN,
			[
				{
					name: 'series',
					description: 'the series to search for',
					type: ECommandOptionType.STRING,
					required: true,
				},
			]
		);
	}
	async execute(ctx: CommandContext, ...args: unknown[]): Promise<void> {
		const searchTerm = ctx.asSlashContext.options.getString(
			this.options[0].name
		);

		const params = new URLSearchParams();
		params.append('query', searchTerm!);

		let response: any = undefined;

		try {
			const Embed = await buildBasicEmbed(ctx);

			const request = {
				headers: {
					Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
				},
				params: params,
			};

			response = (await axios.get(`${process.env.TMDB_API}/search/tv`, request))
				.data;

			const seriesData = response.results[0];

			Embed.setURL(process.env.WEBSITE!);

			Embed.setTitle(seriesData.name);

			Embed.setDescription(seriesData.overview);

			Embed.setImage(
				`https://image.tmdb.org/t/p/original${seriesData.poster_path}`
			);

			Embed.addFields([
				{ name: 'Rating', value: `${seriesData.vote_average}/10` },
				{
					name: 'First Air Date',
					value: seriesData.first_air_date ?? 'Unknown',
				},
			]);

			await ctx.editReply({ embeds: [Embed] });
		} catch (error) {
			await ctx.editReply({
				embeds: [await buildBasicEmbed(ctx, 'Series Not Found')],
			});

			console.error(`Error Searching for Series\x1b[0m\n`, error);
		}
	}
}
