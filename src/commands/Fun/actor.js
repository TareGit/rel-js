const { MessageEmbed } = require('discord.js');

const { sync, perGuildSettings, bot } = require(`${process.cwd()}/dataBus.js`);

const axios = require("axios");

const { version, defaultPrimaryColor } = sync.require(`${process.cwd()}/config.json`);

const utils = sync.require(`${process.cwd()}/utils`);



module.exports = {
    name: 'actor',
    category: 'Fun',
    description: 'Gets basic information about an actor',
    ContextMenu: {},
    syntax : '{prefix}{name} <actor name>',
    options: [
        {
            name : "actor",
            description : "The actor to search for",
            type : 3,
            required : true
          }
    ],
    async execute(ctx) {


        const searchTerm = ctx.cType == "COMMAND" ? ctx.options.getString('actor') : ctx.pureContent;

        const params = new URLSearchParams();
        params.append("query", searchTerm);

        let response = undefined;

        const Embed = new MessageEmbed();
        Embed.setColor((ctx.member !== null) ? perGuildSettings.get(ctx.member.guild.id).color : defaultPrimaryColor);

        try {

            const request = {
                headers: {
                    'Authorization': `Bearer ${process.env.TMDB_API_KEY}`
                },
                params: params
            };
            response = (await axios.get(`${process.env.TMDB_API}/search/person`,request)).data;


            const actorData = response.results[0];

            Embed.setURL(process.env.WEBSITE);

            Embed.setTitle(actorData.name);

            Embed.setImage(`https://image.tmdb.org/t/p/original${actorData.profile_path}`);

            Embed.addField("Gender", `${actorData.gender === 1 ? "Female" : "Male"}`);
            
            utils.reply(ctx, { embeds: [Embed] });

        } catch (error) {
            Embed.setFooter({ text : "Actor Not Found" });

           utils.reply(ctx, { embeds: [Embed] });
            utils.log(`Error Searching for Actors\x1b[0m\n`,error);
        }

    }
}