import { CommandInteraction, GuildMember } from "discord.js";
import path from "path";
import {
  ECommandOptionType,
  ECommandType,
  EUmekoCommandContextType,
  IGuildSettings,
  IUmekoSlashCommand,
  IUserLevelData,
} from "../../../core/types";
import { getPage, closePage } from "../../../core/modules/browser";
import constants from "../../../core/constants";
import { generateCardHtml } from "../../../core/utils";
import { getUsers } from "../../../core/modules/database";
import puppeteer from "puppeteer";

const utils = bus.sync.require(
  path.join(process.cwd(), "utils")
) as typeof import("../../../core/utils");

const command: IUmekoSlashCommand = {
  name: "level",
  category: "Fun",
  description: "Displays your level",
  type: ECommandType.SLASH,
  dependencies: ['utils'],
  syntax: "{prefix}{name} <specific user mention>",
  options: [
    {
      name: "user",
      description: "The user to check the level of",
      type: ECommandOptionType.USER,
      required: false,
    },
  ],
  async execute(ctx) {
    let page: puppeteer.Page | null = null;
    try {
      const member = ctx.command.member as (GuildMember | null);

      if (!member) {
        await utils.reply(ctx, `You need to be in a server to use this command!`);
        return;
      }

      if (ctx.type === EUmekoCommandContextType.SLASH_COMMAND) {
        await (ctx.command as CommandInteraction).deferReply();
      }

      const options = (bus.guildSettings.get(member.guild.id) as IGuildSettings).leveling_options;

      if (!options.get("location") || options.get("location") === "disabled") {
        utils.reply(ctx, 'Leveling is disabled in this server!')
        return;
      }

      if (!bus.guildLeveling.get(member.guild.id)) {
        bus.guildLeveling.set(member.guild.id, constants.DEFAULT_GUILD_LEVEL_DATA);
      }

      if (!bus.userSettings.get(member.id)) {
        bus.userSettings.set(member.id, (await getUsers([member.id]))[0])
      }

      if (!bus.guildLeveling.get(member.guild.id)!.data[member.id]) {
        const newLevelingData: IUserLevelData = {
          user: member.id,
          guild: member.guild.id,
          level: 0,
          progress: 0
        };

        bus.guildLeveling.get(member.guild.id)!.data[member.id] = newLevelingData;

        await bus.db.post('/levels', [newLevelingData]);
      }

      const card = await generateCardHtml(member);

      page = await getPage();
      await page.setViewport({ width: 1200, height: 400 });
      await page.setContent(card, { waitUntil: 'load' });
      const content = await page.$("body");
      if (content) {

        const imageBuffer = await content.screenshot({ omitBackground: true });
        utils.reply(ctx, { files: [{ attachment: imageBuffer }] });
      }

      closePage(page);
      page = null;
    } catch (error) {
      if (page) {
        closePage(page);
        page = null;
      }
    }

  },
};

export default command;
