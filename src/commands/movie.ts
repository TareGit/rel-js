const { MessageEmbed } = require('discord.js');

const { sync, guildSettings, bot } = require(`${process.cwd()}/dataBus.js`);

const axios = require("axios");

const { version, defaultPrimaryColor } = sync.require(`${process.cwd()}/config.json`);

const utils = sync.require(`${process.cwd()}/utils`);



module.exports = {
    name: 'movie',
    category: 'Fun',
    description: 'Gets basic information about a movie',
    ContextMenu: {},
    syntax: '{prefix}{name} <movie name>',
    options: [
        {
            name: "movie",
            description: "The movie to search for",
            type: 3,
            required: true
        }
    ],
    async execute(ctx) {


        const searchTerm = ctx.type == EUmekoCommandContextType.SLASH_COMMAND ? (ctx.command as CommandInteraction).options.getString('movie') : (ctx.command as IParsedMessage).pureContent;

        const params = new URLSearchParams();
        params.append("query", searchTerm);

        let response = undefined;

        const Embed = new MessageEmbed();
        Embed.setColor(ctx.command.member ? guildSettings.get((ctx.command.member as GuildMember).guild.id).color : defaultPrimaryColor);

        try {

            const request = {
                headers: {
                    'Authorization': `Bearer ${process.env.TMDB_API_KEY}`
                },
                params: params
            };
            response = (await axios.get(`${process.env.TMDB_API}/search/movie`, request)).data;


            const movieData = response.results[0];

            Embed.setURL(process.env.WEBSITE);

            Embed.setTitle(movieData.title);

            Embed.setDescription(movieData.overview);

            Embed.setImage(`https://image.tmdb.org/t/p/original${movieData.poster_path}`);


            Embed.addField("Rating", `${movieData.vote_average}/10`);

            Embed.addField("Release date", movieData.release_date || "Unknown");

            utils.reply(ctx, { embeds: [Embed] });

        } catch (error) {
            Embed.setFooter({ text: "Movie Not Found" });

            utils.reply(ctx, { embeds: [Embed] });
            utils.log(`Error Searching for Movie\x1b[0m\n`, error);
        }

    }
}