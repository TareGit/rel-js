import { ColorResolvable, CommandInteraction, GuildMember } from "discord.js";
import path from "path";
import { ECommandOptionType } from "../types";
import { MessageEmbed } from 'discord.js';
import axios from "axios";
import { FrameworkConstants } from "@core/framework";
import { SlashCommand, CommandContext } from "@modules/commands";
import { log } from "@core/utils";

export default class MoviesCommand extends SlashCommand {
    constructor() {
        super(
            'movie',
            'Gets basic information about a movie',
            FrameworkConstants.COMMAND_GROUPS.FUN,
            [
                {
                    name: "movie",
                    description: "The movie to search for",
                    type: ECommandOptionType.STRING,
                    required: true
                }
            ]
        )
    }
    async execute(ctx: CommandContext, ...args: any[]): Promise<void> {
        const searchTerm = ctx.asSlashContext.options.getString(this.options[0].name)!;

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
            response = (await axios.get(`${process.env.TMDB_API}/search/movie`, request)).data;


            const movieData = response.results[0];

            Embed.setURL(process.env.WEBSITE!);

            Embed.setTitle(movieData.title);

            Embed.setDescription(movieData.overview);

            Embed.setImage(`https://image.tmdb.org/t/p/original${movieData.poster_path}`);


            Embed.addField("Rating", `${movieData.vote_average}/10`);

            Embed.addField("Release date", movieData.release_date || "Unknown");

            ctx.editReply({ embeds: [Embed] });

        } catch (error) {
            Embed.setFooter({ text: "Movie Not Found" });

            ctx.editReply({ embeds: [Embed] });
            log(`Error Searching for Movie\x1b[0m\n`, error);
        }

    }
}