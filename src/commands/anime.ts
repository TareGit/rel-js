import { ColorResolvable, CommandInteraction, GuildMember } from "discord.js";

import { MessageEmbed } from 'discord.js';
import path from "path";
import { IUmekoSlashCommand, ECommandType, EUmekoCommandContextType, IParsedMessage } from "../types";
import result from "./actor";

const axios = require("axios");

const { version, defaultPrimaryColor } = bus.sync.require(
  path.join(process.cwd(), "config.json")
) as typeof import("../config.json");

const utils = bus.sync.require(
  path.join(process.cwd(), "utils")
) as typeof import("../utils");



const command: IUmekoSlashCommand = {
  name: 'anime',
  category: 'Fun',
  description: 'Gets basic information about an anime',
  type: ECommandType.SLASH,
  dependencies: ['utils'],
  syntax: '{prefix}{name} <anime name>',
  options: [
    {
      name: "anime",
      description: "The anime to search for",
      type: 3,
      required: true
    }
  ],
  async execute(ctx) {


    const searchTerm = ctx.type == EUmekoCommandContextType.SLASH_COMMAND ? (ctx.command as CommandInteraction).options.getString('anime') : (ctx.command as IParsedMessage).pureContent;

    const params = new URLSearchParams();
    params.append("q", searchTerm!);
    params.append("limit", "1");
    params.append("nsfw", "string");
    params.append("fields", "status,num_episodes,synopsis,rank,anime_score");

    let response: any = undefined;

    const Embed = new MessageEmbed();
    Embed.setColor((bus.guildSettings.get(ctx.command.guild?.id || '')?.color || defaultPrimaryColor) as ColorResolvable);

    try {
      response = (await axios.get(`${process.env.MAL_API}/anime?`, { headers: { 'X-MAL-CLIENT-ID': process.env.MAL_API_KEY }, params: params })).data;


      const animeData = response.data[0].node;

      Embed.setURL(`https://myanimelist.net/anime/${animeData.id}`);

      Embed.setTitle(animeData.title);

      Embed.setDescription(animeData.synopsis.replace('[Written by MAL Rewrite]', ''));

      Embed.setImage(animeData.main_picture.medium);

      Embed.addField("Status", `${animeData.status === 'currently_airing' ? 'Airing' : 'Completed'}`);

      utils.reply(ctx, { embeds: [Embed] });

    } catch (error) {

      Embed.setFooter({ text: "Anime Not Found" });
      utils.reply(ctx, { embeds: [Embed] });
      utils.log(`Error Fetching Anime Data\x1b[0m`, error);
    }

  }
}

export default command;