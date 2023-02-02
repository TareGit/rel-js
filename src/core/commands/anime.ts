import { ColorResolvable, CommandInteraction, GuildMember } from "discord.js";
import { MessageEmbed } from 'discord.js';
import axios from "axios";
import constants from '@core/constants';
import { log } from '@core/utils';
import { SlashCommand, CommandContext } from '@modules/commands';

export default class AnimeCommand extends SlashCommand {
  constructor() {
    super(
      'anime',
      'Gets basic information about an anime',
      constants.COMMAND_GROUPS.FUN,
      [
        {
          name: "anime",
          description: 'The anime to search for',
          type: 3,
          required: true
        }
      ]
    )
  }
  async execute(ctx: CommandContext, targetCommand = ""): Promise<void> {
    await ctx.deferReply();

    const searchTerm = ctx.asSlashContext.options.getString(this.options[0].name)!;

    const params = new URLSearchParams();
    params.append("q", searchTerm!);
    params.append("limit", "1");
    params.append("nsfw", "string");
    params.append("fields", "status,num_episodes,synopsis,rank,anime_score");

    let response: any = undefined;

    const Embed = new MessageEmbed();
    Embed.setColor((await bus.database.getGuild(ctx.asSlashContext.guild?.id)).color as ColorResolvable);

    try {
      response = (await axios.get(`${process.env.MAL_API}/anime?`, { headers: { 'X-MAL-CLIENT-ID': process.env.MAL_API_KEY! }, params: params })).data;


      const animeData = response.data[0].node;

      Embed.setURL(`https://myanimelist.net/anime/${animeData.id}`);

      Embed.setTitle(animeData.title);

      Embed.setDescription(animeData.synopsis.replace('[Written by MAL Rewrite]', ''));

      Embed.setImage(animeData.main_picture.medium);

      Embed.addField("Status", `${animeData.status === 'currently_airing' ? 'Airing' : 'Completed'}`);

      ctx.editReply({ embeds: [Embed] });

    } catch (error) {

      Embed.setFooter({ text: "Anime Not Found" });
      ctx.editReply({ embeds: [Embed] });
      log(`Error Fetching Anime Data\x1b[0m`, error);
    }
  }
}