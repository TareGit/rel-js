const { MessageEmbed } = require('discord.js');

const { sync, perGuildData, bot } = require(`${process.cwd()}/passthrough.js`);
const { reply } = sync.require(`${process.cwd()}/utils.js`);
const axios = require("axios");
const { version, defaultPrimaryColor } = sync.require(`${process.cwd()}/config.json`);



module.exports = {
  name: 'anime',
  category: 'Fun',
  description: 'gets basic information about an anime',
  ContextMenu: {},
  options: [],
  async execute(ctx) {


    const searchTerm = ctx.pureContent;

    const params = new URLSearchParams();
    params.append("q", searchTerm);
    params.append("limit", 1);
    params.append("nsfw",true);
    params.append("fields","status,num_episodes,synopsis,rank,anime_score");

    let response = undefined;

    const Embed = new MessageEmbed();
            Embed.setColor((ctx.member !== null) ? perGuildData.get(ctx.member.guild.id).color : defaultPrimaryColor);
            
            

            
    try {
      response = (await axios.get(`${process.env.MAL_API}/anime?`, { headers: { 'X-MAL-CLIENT-ID': process.env.MAL_API_KEY }, params: params })).data;

      
      const animeData = response.data[0].node;

      Embed.setURL(`https://myanimelist.net/anime/${animeData.id}`);

      Embed.setTitle(animeData.title);

      Embed.setDescription(animeData.synopsis.replace('[Written by MAL Rewrite]',''));

      Embed.setThumbnail(animeData.main_picture.medium);

      Embed.addField("Status",`${animeData.status === 'currently_airing' ? 'Airing' : 'Completed'}`);

      reply(ctx,{ embeds: [Embed] });

    } catch (error) {

      Embed.setFooter("Anime Not Found");
      reply(ctx,{ embeds: [Embed] });
      console.log(error);
    }

  }
}