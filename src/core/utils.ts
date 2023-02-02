import axios from "axios";
import { Utils } from "discord-api-types";
import {
  MessagePayload,
  InteractionReplyOptions,
  InteractionCollector as ICollector,
  Message,
  GuildMember,
  BaseCommandInteraction,
  Interaction,
  Client,
  InteractionCollectorOptions,
} from "discord.js";
import fs from "fs/promises";
import path from "path";
import constants from "./constants";
import {
  EUmekoCommandContextType,
  IGuildLevelingData,
  IParsedMessage,
  IUmekoCommandContext,
  IUserSettings,
} from "./types";

/**
 * Generates a random float (inclusive)
 * @param {Number}min
 * @param {Number}max
 * @returns {Number} The random float
 */
export function randomFloatInRange(min, max) {
  return Math.random() * (max - min) + min;
}

/**
 * Generates a random integer (inclusive)
 * @param {Number}min
 * @param {Number}max
 * @returns {Number} The random integer
 */
export function randomIntegerInRange(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1) + min); //The maximum is inclusive and the minimum is inclusive
}

/**
 * Calculates the xp required to get to the next level
 * @param {Number}level The current level
 * @returns {Number}The xp required
 */
export function getXpForNextLevel(level: number) {
  return level ** 2 * 3 + 100;
}

/**
 * Calculates the total xp at a specific level
 * @param {Number}level The level to get the xp for
 * @returns {Number}The total xp
 */
export function getTotalXp(level: number) {
  return 0.5 * (level + 1) * (level ** 2 * 2 + level + 200);
}

export function time(sep = "") {
  const currentDate = new Date();

  if (sep === "") {
    return currentDate.toUTCString();
  }

  const date = ("0" + currentDate.getUTCDate()).slice(-2);

  const month = ("0" + (currentDate.getUTCMonth() + 1)).slice(-2);

  const year = currentDate.getUTCFullYear();

  const hours = ("0" + currentDate.getUTCHours()).slice(-2);

  const minutes = ("0" + currentDate.getUTCMinutes()).slice(-2);

  const seconds = ("0" + currentDate.getUTCSeconds()).slice(-2);

  return `${year}${sep}${month}${sep}${date}${sep}${hours}${sep}${minutes}${sep}${seconds}`;
}

/**
 * Logs stuff
 * @param args What to log
 */
export function log(...args) {
  const argumentValues = Object.values(arguments);

  const stack = new Error().stack;
  const pathDelimiter = process.platform !== "win32" ? "/" : "\\";
  const simplifiedStack = stack?.split("\n")[2].split(pathDelimiter) || [];
  const file =
    simplifiedStack[Math.max(simplifiedStack.length - 1, 0)].split(")")[0];


  argumentValues.unshift(`${file.padEnd(25)}::`);

  if (global.bus && bus.bot && bus.cluster) {
    const clusterText = `Cluster ${bus.cluster.id}`.padEnd(13);
    argumentValues.unshift(`${clusterText}::`);
  } else {
    argumentValues.unshift(`${'Manager'.padEnd(13)}::`);
  }

  argumentValues.unshift(`${new Date().toLocaleString().padEnd(25)}::`);

  console.log.apply(null, argumentValues);
}

/**
 * Replies a message/command
 * @param ctx The message/command
 * @param payload The content to send
 * @returns {Message} The reply
 */
export async function reply(
  ctx: IUmekoCommandContext,
  payload: string | MessagePayload | InteractionReplyOptions,
  forceChannelReply = false
) {
  try {
    if (ctx.type === EUmekoCommandContextType.CHAT_MESSAGE) {
      return await (ctx.command as IParsedMessage)
        .reply(payload)
        .catch((error) => log("Error sending message", error));
    } else if (
      ctx.type === EUmekoCommandContextType.MESSAGE_CONTEXT_MENU ||
      ctx.type === EUmekoCommandContextType.SLASH_COMMAND
    ) {
      const cmdAsInt = ctx.command as BaseCommandInteraction;
      if (cmdAsInt.deferred) {
        if (cmdAsInt.replied) {
          return await cmdAsInt.channel
            ?.send(payload)
            .catch((error) => log("Error sending message", error));
        }

        return await cmdAsInt
          .editReply(payload)
          .catch((error) => log("Error sending message", error));
      } else {
        if (cmdAsInt.replied) {
          return await cmdAsInt.channel
            ?.send(payload)
            .catch((error) => log("Error sending message", error));
        }

        return await cmdAsInt
          .reply(payload)
          .catch((error) => log("Error sending message", error));
      }
    } else if (ctx.type === EUmekoCommandContextType.USER_CONTEXT_MENU) {
    }
  } catch (error) {
    log(`Error sending message\x1b[0m\n`, error);
  }
}

export async function handleCommandDirectoryChanges(event, path: string) {
  const pathAsArray =
    process.platform !== "win32" ? path.split("/") : path.split("\\");

  switch (event) {
    case "add":

      break;

    case "change":

      break;

    case "unlink":

      break;
  }
}

export async function getOsuApiToken() {
  const request = {
    client_id: process.env.OSU_CLIENT_ID,
    client_secret: process.env.OSU_CLIENT_SECRETE,
    grant_type: "client_credentials",
    scope: "public",
  };

  const response = (await axios.post(`${process.env.OSU_API_AUTH}`, request))
    .data;

  process.env.OSU_API_TOKEN = response.access_token;

  setTimeout(getOsuApiToken, response.expires_in * 1000 - 200);

  log("Done fetching Osu Api Token");
}

export async function getSpotifyApiToken() {
  const params = new URLSearchParams({ grant_type: "client_credentials" });

  const headers = {
    Authorization:
      "Basic " +
      Buffer.from(
        process.env.SPOTIFY_CLIENT_ID + ":" + process.env.SPOTIFY_CLIENT_SECRETE
      ).toString("base64"),
    "Content-Type": "application/x-www-form-urlencoded",
  };

  try {
    const response = (
      await axios.post(`${process.env.SPOTIFY_API_AUTH}`, params, {
        headers: headers,
      })
    ).data;

    process.env.SPOTIFY_API_TOKEN = response.access_token;

    setTimeout(getSpotifyApiToken, response.expires_in * 1000 - 200);

    log("Done fetching Spotify Api Token");
  } catch (error) {
    log(`Error Fetching Spotify Token\n`, error);
  }
}
/*
let loadedCard: string | null = null;
loadedCard = null;
export async function generateCardHtml(user: GuildMember) {
  if (!loadedCard) {
    loadedCard = await fs.readFile(
      path.join(__dirname, "../rank-card.html"),
      "utf8"
    );
  }

  const levelingData = bus.guildLeveling.get(user.guild.id) as IGuildLevelingData;

  if (!levelingData.data[user.id]) levelingData.data[user.id] = { ...constants.DEFAULT_USER_LEVEL_DATA, guild: user.guild.id, user: user.id }

  const userLevelingData = levelingData.data[user.id];
  const userSettings = bus.userSettings.get(user.id) as IUserSettings;

  const progress = userLevelingData.xp || 0.001;
  const required = getXpForNextLevel(userLevelingData.level);

  const customizedCard = loadedCard
    .replaceAll("{opacity}", userSettings.card.get('opacity') || `${constants.DEFAULT_USER_CARD_OPACITY}`)
    .replaceAll("{color}", userSettings.card.get('color') || constants.DEFAULT_USER_CARD_COLOR)
    .replaceAll("{percent}", `${Math.min((progress / required), 1) * 100}`)
    .replaceAll("{bg}", userSettings.card.get('bg') || constants.DEFAULT_USER_CARD_BG)
    .replaceAll("{avatar}", user.displayAvatarURL())
    .replaceAll("{username}", user.displayName)
    .replaceAll("{rank}", `${levelingData.rank.indexOf(user.id) + 1}`)
    .replaceAll("{level}", `${userLevelingData.level}`)
    .replaceAll("{progress}", `${progress / 1000}`)
    .replaceAll("{required}", `${required / 1000}`);

  return customizedCard;
}*/

export class InteractionCollector<T extends Interaction, V = any> extends ICollector<T>
{
  public data: V;
  constructor(client: Client, d: V, options?: InteractionCollectorOptions<T>) {
    super(client, options);
    this.data = d;
  }
}

export function encodeOptions(data: Record<string, any>) {
  return new URLSearchParams(data).toString()
}
