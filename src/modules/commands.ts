import {
  Interaction,
  BaseCommandInteraction,
  Message,
  CommandInteraction,
} from "discord.js";
import fs from "fs";
import path from "path";
import { ECommandType, EUmekoCommandContextType, IParsedMessage, IUmekoCommandContext, IUmekoSlashCommand } from "../types";

const utils = bus.sync.require(
  `${process.cwd()}/utils`
) as typeof import("../utils");

const { defaultPrefix } = bus.sync.require(
  path.join(process.cwd(), "config.json")
) as typeof import("../config.json");

/**
 * Tries to derive a command from a message
 * @param {Message}message The message to parse
 * @returns {Command} A command or undefined if the message could not be parsed
 */
export async function parseMessage(message: Message): Promise<{ command: IUmekoSlashCommand; ctx: IUmekoCommandContext; } | undefined> {
  const content = message.content;
  const guildData =
    message.member !== null
      ? bus.guildSettings.get(message.member.guild.id)
      : undefined;

  const prefix =
    bus.guildSettings.get(message.member?.guild?.id || "")?.prefix ||
    defaultPrefix;

  if (!content.startsWith(prefix)) {
    return undefined;
  }

  const contentWithoutprefix = content.slice(prefix.length);
  const contentSplit = contentWithoutprefix.split(/\s+/);
  const actualAlias = contentSplit[0].toLowerCase();

  if (bus.slashCommands.get(actualAlias) === undefined) {
    return undefined;
  }

  const argsNotSplit = content.slice(prefix.length + actualAlias.length);

  const messageWithoutType = message as any;
  messageWithoutType.args = argsNotSplit.trim().split(/\s+/);
  messageWithoutType.pureContent = argsNotSplit.trim();

  const parsedMessage = messageWithoutType as IParsedMessage;

  return { command: bus.slashCommands.get(actualAlias) as IUmekoSlashCommand, ctx: { command: parsedMessage, type: EUmekoCommandContextType.CHAT_MESSAGE } };
}

/**
 * Tries to derive a command from an interaction command
 * @param {CommandInteraction}interaction The interaction to parse
 * @returns {Command} A command or undefined if the interaction could not be parsed
 */
export async function parseInteractionCommand(interaction: Interaction) {
  if (interaction.isContextMenu()) {
    return bus.contextMenuCommands.get(interaction.commandName);
  }

  if (interaction.isCommand()) {
    return bus.slashCommands.get(interaction.commandName);
  }

  return null;
}
