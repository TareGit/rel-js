import axios from 'axios';
import { FrameworkConstants } from '@core/common';
import { SlashCommand, CommandContext } from '@modules/commands';
import { buildBasicEmbed } from '@core/utils';

export default class ActorCommand extends SlashCommand {
	constructor() {
		super(
			'actor',
			'Gets basic information about an actor',
			FrameworkConstants.COMMAND_GROUPS.FUN,
			[
				{
					name: 'actor',
					description: 'The actor to search for',
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
				await axios.get(`${process.env.TMDB_API}/search/person`, request)
			).data;

			const actorData = response.results[0];

			const Embed = await buildBasicEmbed(ctx);

			Embed.setURL(process.env.WEBSITE!);

			Embed.setTitle(actorData.name);

			Embed.setImage(
				`https://image.tmdb.org/t/p/original${actorData.profile_path}`
			);

			Embed.addFields([
				{
					name: 'Gender',
					value: `${actorData.gender === 1 ? 'Female' : 'Male'}`,
				},
			]);

			ctx.editReply({ embeds: [Embed] });
		} catch (error) {
			ctx.editReply({
				embeds: [await buildBasicEmbed(ctx, 'Actor Not Found')],
			});
			console.error(`Error Searching for Actors\x1b[0m\n`, error);
		}
	}
}
