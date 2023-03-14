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
import { FrameworkConstants } from "@core/framework";
import { log } from "../utils";

export default class WallpaperzBrowseCommand extends SlashCommand {
    currentToken: string = ""
    tokenRefreshTimeout: ReturnType<typeof setTimeout>
    constructor() {
        super(
            'osu',
            'Gets basic information about an osu player',
            FrameworkConstants.COMMAND_GROUPS.FUN,
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

    override async onLoad(old: this | null): Promise<void> {
        if(old)
        {
            this.currentToken = old.currentToken
            this.tokenRefreshTimeout
        }
        await this.fetchApiToken()
    }

    override async onDestroy(): Promise<void> {
        if (this.tokenRefreshTimeout) {
            clearTimeout(this.tokenRefreshTimeout)
        }
    }

    async fetchApiToken() {
        const request = {
            client_id: process.env.OSU_CLIENT_ID,
            client_secret: process.env.OSU_CLIENT_SECRETE,
            grant_type: "client_credentials",
            scope: "public",
        };

        const response = (await axios.post<{ access_token: string, expires_in: number }>(`${process.env.OSU_API_AUTH}`, request))
            .data;

        this.currentToken = response.access_token

        this.tokenRefreshTimeout = setTimeout(this.fetchApiToken.bind(this), (response.expires_in * 1000) - 100)
    }

    async execute(ctx: CommandContext, ...args: any[]): Promise<void> {
        await ctx.deferReply()
        const searchTerm = ctx.asSlashContext.options.getString(this.options[0].name) as string;

        let response: IOsuApiUser | null = null;

        const Embed = new MessageEmbed();

        Embed.setColor((await bus.database.getGuild(ctx.asSlashContext.guild?.id)).color as ColorResolvable);

        try {
            const request = {
                headers: {
                    Authorization: `Bearer ${this.currentToken}`,
                },
            };
            response = (
                await axios.get<IOsuApiUser>(
                    `${process.env.OSU_API}/users/${encodeURIComponent(
                        searchTerm.replace(/\s+/g, "")
                    )}`,
                    request
                )
            ).data;

            const user = response;

            if (user === null) {
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
