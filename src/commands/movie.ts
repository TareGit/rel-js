import { ColorResolvable, CommandInteraction, GuildMember } from "discord.js";
import path from "path";
import { IUmekoSlashCommand, EUmekoCommandContextType, IParsedMessage, ECommandType, ECommandOptionType } from "../types";
import { MessageEmbed } from 'discord.js';
import axios from "axios";

const { version, defaultPrimaryColor } = bus.sync.require(
    path.join(process.cwd(), "config.json")
) as typeof import("../config.json");

const utils = bus.sync.require(
    path.join(process.cwd(), "utils")
) as typeof import("../utils");



const command: IUmekoSlashCommand = {
    name: 'movie',
    category: 'Fun',
    description: 'Gets basic information about a movie',
    type: ECommandType.SLASH,
    dependencies: ['utils'],
    syntax: '{prefix}{name} <movie name>',
    options: [
        {
            name: "movie",
            description: "The movie to search for",
            type: ECommandOptionType.STRING,
            required: true
        }
    ],
    async execute(ctx) {


        const searchTerm = ctx.type == EUmekoCommandContextType.SLASH_COMMAND ? (ctx.command as CommandInteraction).options.getString('movie') : (ctx.command as IParsedMessage).pureContent;

        const params = new URLSearchParams();
        params.append("query", searchTerm!);

        let response: any = undefined;

        const Embed = new MessageEmbed();
        Embed.setColor((bus.guildSettings.get(ctx.command.guild?.id || '')?.color || defaultPrimaryColor) as ColorResolvable);

        try {

            const request = {
                headers: {
                    'Authorization': `Bearer ${process.env.TMDB_API_KEY}`
                },
                params: params
            };
            response = (await axios.get(`${process.env.TMDB_API}/search/movie`, request)).data;


            const movieData = response.results[0];

            Embed.setURL(process.env.WEBSITE!);

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

export default command;