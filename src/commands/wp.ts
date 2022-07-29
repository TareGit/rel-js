import { CommandInteraction, MessageEmbed } from "discord.js";
import path from "path";
import { IUmekoSlashCommand, ECommandType, EUmekoCommandContextType, IParsedMessage, ECommandOptionType, IWallpaperzWallpaper } from "../types";
import axios from 'axios';

const utils = bus.sync.require(
    path.join(process.cwd(), "utils")
) as typeof import("../utils");



const command: IUmekoSlashCommand = {
    name: 'wp',
    type: ECommandType.SLASH,
    dependencies: ['utils'],
    category: 'Fun',
    description: 'Search for a wallpaper form the app wallpaperz',
    syntax: '{prefix}{name} <search>',
    options: [
        {
            name: 'search',
            description: 'The wallpaper to search for',
            type: ECommandOptionType.STRING,
            required: false
        }
    ],
    async execute(ctx) {

        const query = ctx.type == EUmekoCommandContextType.CHAT_MESSAGE ? (ctx.command as IParsedMessage).pureContent : (ctx.command as CommandInteraction).options.getString('search') || '';

        try {

            if (ctx.type === EUmekoCommandContextType.SLASH_COMMAND) {
                await (ctx.command as CommandInteraction).deferReply();
            }

            const searchResults: IWallpaperzWallpaper[] = (await axios.get(`https://wallpaperz-database.oyintare.dev/wallpapers?l=5&q=${encodeURIComponent(query)}`)).data

            if (searchResults.length) {

                utils.reply(ctx, {
                    embeds: searchResults.map(wp => new MessageEmbed().setImage(`https://wallpaperz.nyc3.cdn.digitaloceanspaces.com/wallpapers/${wp.id}.png `).setFooter({
                        text: `Size: ${wp.width}x${wp.height}px \nTags: ${wp.tags}`, iconURL: "https://cdn.discordapp.com/app-icons/967602114350174348/fd6c362b87cc9ee31783175f1f92e57a.png"
                    }))
                });
            }
            else {
                utils.reply(ctx, "No wallpapers found");
            }

        } catch (error) {
            utils.log(error);
        }
    }
}

export default command;