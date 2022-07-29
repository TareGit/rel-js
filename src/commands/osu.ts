import {
  MessageEmbed,
  CommandInteraction,
  GuildMember,
  ColorResolvable,
} from "discord.js";

import axios from "axios";
import path from "path";
import {
  IUmekoSlashCommand,
  EUmekoCommandContextType,
  IParsedMessage,
  IOsuApiUser,
  ECommandType,
  ECommandOptionType,
} from "../types";

const { version, defaultPrimaryColor } = bus.sync.require(
  path.join(process.cwd(), "./config.json")
) as typeof import("../config.json");

const utils = bus.sync.require(
  path.join(process.cwd(), "utils")
) as typeof import("../utils");

const command: IUmekoSlashCommand = {
  name: "osu",
  category: "Fun",
  type: ECommandType.SLASH,
  dependencies: ['utils'],
  description: "Gets basic information about an Osu! player",
  syntax: "{prefix}{name} <osu id | osu username>",
  options: [
    {
      name: "player",
      description: "The username or ID of the player to search for",
      type: ECommandOptionType.STRING,
      required: true,
    },
  ],
  async execute(ctx) {
    const searchTerm =
      ctx.type == EUmekoCommandContextType.SLASH_COMMAND
        ? ((ctx.command as CommandInteraction).options.getString(
          "player"
        ) as string)
        : (ctx.command as IParsedMessage).pureContent;

    let response = undefined;

    const Embed = new MessageEmbed();

    Embed.setColor(
      (bus.guildSettings.get(ctx.command?.guildId || "")?.color ||
        defaultPrimaryColor) as ColorResolvable
    );

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
        utils.reply(ctx, { embeds: [Embed] });

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

      utils.reply(ctx, { embeds: [Embed] })
    } catch (error) {
      Embed.setFooter({ text: "User Not Found" });
      utils.reply(ctx, { embeds: [Embed] });

      utils.log(`Error fetching Osu Data\x1b[0m`, error);
    }
  },
};

export default command;
