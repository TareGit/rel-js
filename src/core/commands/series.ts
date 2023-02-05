import { ColorResolvable, CommandInteraction, GuildMember, MessageEmbed } from 'discord.js';
import path from 'path';
import { ECommandOptionType } from '../types';

import axios from "axios";
import { log } from '@core/utils';
import { SlashCommand, CommandContext } from '@modules/commands';
import { FrameworkConstants } from "@core/framework";



export default class SeriesCommand extends SlashCommand {
    constructor() {
        super(
            'series',
            'Gets basic information about a tv series',
            FrameworkConstants.COMMAND_GROUPS.FUN,
            [
                {
                    name: "series",
                    description: "the series to search for",
                    type: ECommandOptionType.STRING,
                    required: true
                }
            ]
        )
    }
    async execute(ctx: CommandContext, ...args: any[]): Promise<void> {

        const searchTerm = ctx.asSlashContext.options.getString(this.options[0].name);

        const params = new URLSearchParams();
        params.append("query", searchTerm!);

        let response: any = undefined;

        const Embed = new MessageEmbed();
        Embed.setColor((await bus.database.getGuild(ctx.asSlashContext.guild?.id)).color as ColorResolvable);

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

            ctx.editReply({ embeds: [Embed] });

        } catch (error) {
            Embed.setFooter({ text: "Series Not Found" });

            ctx.editReply({ embeds: [Embed] });
            log(`Error Searching for Series\x1b[0m\n`, error);
        }

    }
}