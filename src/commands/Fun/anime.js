const { MessageEmbed } = require('discord.js');

const { sync, perGuildSettings, bot } = require(`${process.cwd()}/passthrough.js`);

const axios = require("axios");

const { version, defaultPrimaryColor } = sync.require(`${process.cwd()}/config.json`);

const utils = sync.require(`${process.cwd()}/utils`);



module.exports = {
  name: 'anime',
  category: 'Fun',
  description: 'Gets basic information about an anime',
  ContextMenu: {},
  syntax : '{prefix}{name} <anime name>',
  options: [
    {
      name : "anime",
      description : "The anime to search for",
      type : 3,
      required : true
    }
  ],
  async execute(ctx) {


    const searchTerm = ctx.cType == "COMMAND" ? ctx.options.getString('anime') : ctx.pureContent;

    const params = new URLSearchParams();
    params.append("q", searchTerm);
    params.append("limit", 1);
    params.append("nsfw",true);
    params.append("fields","status,num_episodes,synopsis,rank,anime_score");

    let response = undefined;

    const Embed = new MessageEmbed();
    Embed.setColor((ctx.member !== null) ? perGuildSettings.get(ctx.member.guild.id).color : defaultPrimaryColor);
            
    try {
      response = (await axios.get(`${process.env.MAL_API}/anime?`, { headers: { 'X-MAL-CLIENT-ID': process.env.MAL_API_KEY }, params: params })).data;

      
      const animeData = response.data[0].node;

      Embed.setURL(`https://myanimelist.net/anime/${animeData.id}`);

      Embed.setTitle(animeData.title);

      Embed.setDescription(animeData.synopsis.replace('[Written by MAL Rewrite]',''));

      Embed.setImage(animeData.main_picture.medium);

      Embed.addField("Status",`${animeData.status === 'currently_airing' ? 'Airing' : 'Completed'}`);

     utils.reply(ctx,{ embeds: [Embed] });

    } catch (error) {

      Embed.setFooter({ text : "Anime Not Found" });
     utils.reply(ctx,{ embeds: [Embed] });
      utils.log(`\x1b[31mError Fetching Anime Data\x1b[0m`,error);
    }

  }
}