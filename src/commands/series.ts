import { ColorResolvable, CommandInteraction, GuildMember, MessageEmbed } from 'discord.js';
import path from 'path';
import { IUmekoSlashCommand, EUmekoCommandContextType, IParsedMessage, ECommandType, ECommandOptionType } from '../types';

import axios from "axios";

const { defaultPrimaryColor } = bus.sync.require(
    path.join(process.cwd(), "./config.json")
) as typeof import("../config.json");


const utils = bus.sync.require(
    path.join(process.cwd(), "utils")
) as typeof import("../utils");



const command: IUmekoSlashCommand = {
    name: 'series',
    category: 'Fun',
    description: 'Gets basic information about a tv series',
    type: ECommandType.SLASH,
    dependencies: ['utils'],
    syntax: '{prefix}{name} <series name>',
    options: [
        {
            name: "series",
            description: "the series to search for",
            type: ECommandOptionType.STRING,
            required: true
        }
    ],
    async execute(ctx) {


        const searchTerm = ctx.type == EUmekoCommandContextType.SLASH_COMMAND ? (ctx.command as CommandInteraction).options.getString('series') : (ctx.command as IParsedMessage).pureContent;

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

            response = (await axios.get(`${process.env.TMDB_API}/search/tv`, request)).data;


            const seriesData = response.results[0];

            Embed.setURL(process.env.WEBSITE!);

            Embed.setTitle(seriesData.name);

            Embed.setDescription(seriesData.overview);

            Embed.setImage(`https://image.tmdb.org/t/p/original${seriesData.poster_path}`);


            Embed.addField("Rating", `${seriesData.vote_average}/10`);

            Embed.addField("First Air Date", seriesData.first_air_date || "Unknown");

            utils.reply(ctx, { embeds: [Embed] });

        } catch (error) {
            Embed.setFooter({ text: "Series Not Found" });

            utils.reply(ctx, { embeds: [Embed] });
            utils.log(`Error Searching for Series\x1b[0m\n`, error);
        }

    }
}

export default command;