import { GuildMember } from "discord.js";

const { MessageEmbed, Comm } = require('discord.js');

const { sync, guildSettings, bot } = require(`${process.cwd()}/dataBus.js`);

const axios = require("axios");

const { version, defaultPrimaryColor } = sync.require(`${process.cwd()}/config.json`);

const utils = sync.require(`${process.cwd()}/utils`);



const result: IUmekoSlashCommand = {
  name: 'anime',
  category: 'Fun',
  description: 'Gets basic information about an anime',
  type: ECommandType.SLASH,
  syntax: '{prefix}{name} <anime name>',
  options: [
    {
      name: "anime",
      description: "The anime to search for",
      type: 3,
      required: true
    }
  ],
  async execute(ctx) {


    const searchTerm = ctx.type == EUmekoCommandContextType.SLASH_COMMAND ? (ctx.command as CommandInteraction).options.getString('anime') : (ctx.command as IParsedMessage).pureContent;

    const params = new URLSearchParams();
    params.append("q", searchTerm);
    params.append("limit", "1");
    params.append("nsfw", "string");
    params.append("fields", "status,num_episodes,synopsis,rank,anime_score");

    let response = undefined;

    const Embed = new MessageEmbed();
    Embed.setColor(ctx.command.member ? guildSettings.get((ctx.command.member as GuildMember).guild.id).color : defaultPrimaryColor);

    try {
      response = (await axios.get(`${process.env.MAL_API}/anime?`, { headers: { 'X-MAL-CLIENT-ID': process.env.MAL_API_KEY }, params: params })).data;


      const animeData = response.data[0].node;

      Embed.setURL(`https://myanimelist.net/anime/${animeData.id}`);

      Embed.setTitle(animeData.title);

      Embed.setDescription(animeData.synopsis.replace('[Written by MAL Rewrite]', ''));

      Embed.setImage(animeData.main_picture.medium);

      Embed.addField("Status", `${animeData.status === 'currently_airing' ? 'Airing' : 'Completed'}`);

      utils.reply(ctx, { embeds: [Embed] });

    } catch (error) {

      Embed.setFooter({ text: "Anime Not Found" });
      utils.reply(ctx, { embeds: [Embed] });
      utils.log(`Error Fetching Anime Data\x1b[0m`, error);
    }

  }
}

export default result;