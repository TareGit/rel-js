const { MessageEmbed } = require('discord.js');

const { sync, perGuildData, bot } = require(`${process.cwd()}/passthrough.js`);
const { reply } = sync.require(`${process.cwd()}/utils.js`);
const axios = require("axios");
const { version, defaultPrimaryColor } = sync.require(`${process.cwd()}/config.json`);



module.exports = {
    name: 'movie',
    category: 'Fun',
    description: 'gets basic information about a movie',
    ContextMenu: {},
    options: [],
    async execute(ctx) {


        const searchTerm = ctx.pureContent;

        const params = new URLSearchParams();
        params.append("query", ctx.pureContent);

        let response = undefined;

        const Embed = new MessageEmbed();
        Embed.setColor((ctx.member !== null) ? perGuildData.get(ctx.member.guild.id).pColor : defaultPrimaryColor);

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

            reply(ctx, { embeds: [Embed] });

        } catch (error) {
            Embed.setFooter("Movie Not Found");

            reply(ctx, { embeds: [Embed] });
            console.log(error);
        }

    }
}