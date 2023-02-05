import { ColorResolvable, CommandInteraction, GuildMember } from "discord.js";
import { MessageEmbed } from 'discord.js';
import axios from "axios";
import { FrameworkConstants } from "@core/framework";
import { SlashCommand, CommandContext } from "@modules/commands";
import { log } from "../utils";

export default class ActorCommand extends SlashCommand {
    constructor() {
        super(
            'actor',
            'Gets basic information about an actor',
            FrameworkConstants.COMMAND_GROUPS.FUN,
            [
                {
                    name: "actor",
                    description: "The actor to search for",
                    type: 3,
                    required: true
                }
            ]
        )
    }
    async execute(ctx: CommandContext, targetCommand = ""): Promise<void> {
        await ctx.deferReply();

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
            response = (await axios.get(`${process.env.TMDB_API}/search/person`, request)).data;


            const actorData = response.results[0];

            Embed.setURL(process.env.WEBSITE!);

            Embed.setTitle(actorData.name);

            Embed.setImage(`https://image.tmdb.org/t/p/original${actorData.profile_path}`);

            Embed.addField("Gender", `${actorData.gender === 1 ? "Female" : "Male"}`);

            ctx.editReply({ embeds: [Embed] });

        } catch (error) {
            Embed.setFooter({ text: "Actor Not Found" });

            ctx.editReply({ embeds: [Embed] });
            log(`Error Searching for Actors\x1b[0m\n`, error);
        }
    }
}