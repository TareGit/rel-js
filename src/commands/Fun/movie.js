const { MessageEmbed } = require('discord.js');

const { sync, perGuildSettings, bot } = require(`${process.cwd()}/passthrough.js`);

const axios = require("axios");

const { version, defaultPrimaryColor } = sync.require(`${process.cwd()}/config.json`);

const utils = sync.require(`${process.cwd()}/utils`);



module.exports = {
    name: 'movie',
    category: 'Fun',
    description: 'Gets basic information about a movie',
    ContextMenu: {},
    syntax : '{prefix}{name} <movie name>',
    options: [
        {
            name : "movie",
            description : "The movie to search for",
            type : 3,
            required : true
          }
    ],
    async execute(ctx) {


        const searchTerm = ctx.pureContent;

        const params = new URLSearchParams();
        params.append("query", ctx.pureContent);

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
            response = (await axios.get(`${process.env.TMDB_API}/search/movie`,request)).data;


            const movieData = response.results[0];

            Embed.setURL(process.env.WEBSITE);

            Embed.setTitle(movieData.title);

            Embed.setDescription(movieData.overview);

            Embed.setThumbnail(`https://image.tmdb.org/t/p/original${movieData.poster_path}`);


            Embed.addField("Rating", `${movieData.vote_average}/10`);

            Embed.addField("Release date", movieData.release_date);

           utils.reply(ctx, { embeds: [Embed] });

        } catch (error) {
            Embed.setFooter("Movie Not Found");

           utils.reply(ctx, { embeds: [Embed] });
            utils.log(`\x1b[31mError Searching for Movie\x1b[0m\n`,error);
        }

    }
}