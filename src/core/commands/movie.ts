import { ECommandOptionType } from '@core/types';
import axios from 'axios';
import { FrameworkConstants } from '@core/common';
import { SlashCommand, CommandContext } from '@modules/commands';
import { buildBasicEmbed } from '@core/utils';

export default class MoviesCommand extends SlashCommand {
	constructor() {
		super(
			'movie',
			'Gets basic information about a movie',
			FrameworkConstants.COMMAND_GROUPS.FUN,
			[
				{
					name: 'movie',
					description: 'The movie to search for',
					type: ECommandOptionType.STRING,
					required: true,
				},
			]
		);
	}
	async execute(ctx: CommandContext, ...args: unknown[]): Promise<void> {
		const searchTerm = ctx.asSlashContext.options.getString(
			this.options[0].name
		)!;

		const params = new URLSearchParams();
		params.append('query', searchTerm!);

		let response: any = undefined;

		try {
			const request = {
				headers: {
					Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
				},
				params: params,
			};
			response = (
				await axios.get(`${process.env.TMDB_API}/search/movie`, request)
			).data;

			const Embed = await buildBasicEmbed(ctx);

			const movieData = response.results[0];

			Embed.setURL(process.env.WEBSITE!);

			Embed.setTitle(movieData.title);

			Embed.setDescription(movieData.overview);

			Embed.setImage(
				`https://image.tmdb.org/t/p/original${movieData.poster_path}`
			);

			Embed.addFields([
				{ name: 'Rating', value: `${movieData.vote_average}/10` },
				{ name: 'Release date', value: movieData.release_date || 'Unknown' },
			]);

			ctx.editReply({ embeds: [Embed] });
		} catch (error) {
			ctx.editReply({
				embeds: [await buildBasicEmbed(ctx, 'Movie Not Found')],
			});
			console.error(`Error Searching for Movie\x1b[0m\n`, error);
		}
	}
}
