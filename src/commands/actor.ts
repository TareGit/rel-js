import { ColorResolvable, CommandInteraction, GuildMember } from "discord.js";
import path from "path";
import { IUmekoSlashCommand, ECommandType, EUmekoCommandContextType, IParsedMessage } from "../types";

import { MessageEmbed } from 'discord.js';

import axios from "axios";

const { version, defaultPrimaryColor } = bus.sync.require(
    path.join(process.cwd(), "config.json")
) as typeof import("../config.json");

const utils = bus.sync.require(
    path.join(process.cwd(), "utils")
) as typeof import("../utils");



const command: IUmekoSlashCommand = {
    name: 'actor',
    category: 'Fun',
    type: ECommandType.SLASH,
    dependencies: ['utils'],
    description: 'Gets basic information about an actor',
    syntax: '{prefix}{name} <actor name>',
    options: [
        {
            name: "actor",
            description: "The actor to search for",
            type: 3,
            required: true
        }
    ],
    async execute(ctx) {

        (ctx.command as CommandInteraction).options
        const searchTerm = ctx.type == EUmekoCommandContextType.SLASH_COMMAND ? (ctx.command as CommandInteraction).options.getString('actor') : (ctx.command as IParsedMessage).pureContent;

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
            response = (await axios.get(`${process.env.TMDB_API}/search/person`, request)).data;


            const actorData = response.results[0];

            Embed.setURL(process.env.WEBSITE!);

            Embed.setTitle(actorData.name);

            Embed.setImage(`https://image.tmdb.org/t/p/original${actorData.profile_path}`);

            Embed.addField("Gender", `${actorData.gender === 1 ? "Female" : "Male"}`);

            utils.reply(ctx, { embeds: [Embed] });

        } catch (error) {
            Embed.setFooter({ text: "Actor Not Found" });

            utils.reply(ctx, { embeds: [Embed] });
            utils.log(`Error Searching for Actors\x1b[0m\n`, error);
        }

    }
}

export default command;