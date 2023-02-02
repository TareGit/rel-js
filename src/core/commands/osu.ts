import {
    MessageEmbed,
    ColorResolvable,
} from "discord.js";
import axios from "axios";
import {
    IOsuApiUser,
    ECommandOptionType,
} from "../types";
import { SlashCommand, CommandContext } from "@modules/commands";
import constants from "@core/constants";
import { log } from "../utils";

export default class WallpaperzBrowseCommand extends SlashCommand {
    constructor() {
        super(
            'osu',
            'Gets basic information about an osu player',
            constants.COMMAND_GROUPS.FUN,
            [
                {
                    name: "player",
                    description: "The username or ID of the player to search for",
                    type: ECommandOptionType.STRING,
                    required: true,
                },
            ]
        )
    }
    async execute(ctx: CommandContext, ...args: any[]): Promise<void> {
        await ctx.deferReply()
        const searchTerm = ctx.asSlashContext.options.getString(this.options[0].name) as string;

        let response = undefined;

        const Embed = new MessageEmbed();

        Embed.setColor((await bus.database.getGuild(ctx.asSlashContext.guild?.id)).color as ColorResolvable);

        try {
            const request = {
                headers: {
                    Authorization: `Bearer ${process.env.OSU_API_TOKEN}`,
                },
            };
            response = (
                await axios.get(
                    `${process.env.OSU_API}/users/${encodeURIComponent(
                        searchTerm.replace(/\s+/g, "")
                    )}`,
                    request
                )
            ).data;

            const user = response as any as IOsuApiUser;

            if (user === undefined) {
                Embed.setFooter({ text: "User Not Found" });
                ctx.editReply({ embeds: [Embed] });

                return;
            }

            Embed.setURL(`https://osu.ppy.sh/users/${user.id}`);

            Embed.setTitle(
                `${user.username} | ${user.is_online ? "Online" : "Offline"}`
            );

            Embed.setThumbnail(user.avatar_url);

            Embed.addField("Rank", `#${user.statistics.global_rank || "Unknown"}`);

            Embed.addField("Accuracy", `${user.statistics.hit_accuracy}%`);

            Embed.addField("Country", user.country.name);

            Embed.setFooter({ text: `Mode | ${user.playmode}` });

            ctx.editReply({ embeds: [Embed] })
        } catch (error) {
            Embed.setFooter({ text: "User Not Found" });
            ctx.editReply({ embeds: [Embed] });

            log(`Error fetching Osu Data\x1b[0m`, error);
        }
    }
}
