import {
  Interaction,
  BaseCommandInteraction,
  Message,
  CommandInteraction,
} from "discord.js";
import fs from "fs";
import path from "path";
import {
  ECommandType,
  EUmekoCommandContextType,
  IParsedMessage,
  IUmekoCommandContext,
  IUmekoSlashCommand,
} from "../types";

const utils = bus.sync.require(
  `${process.cwd()}/utils`
) as typeof import("../utils");

const { defaultPrefix } = bus.sync.require(
  path.join(process.cwd(), "./config.json")
) as typeof import("../config.json");

/**
 * Tries to derive a command from a message
 * @param {Message}message The message to parse
 * @returns {Command} A command or undefined if the message could not be parsed
 */
export async function parseMessage(
  message: Message
): Promise<
  { command: IUmekoSlashCommand; ctx: IUmekoCommandContext } | null
> {
  const content = message.content;
  const guildData =
    message.member !== null
      ? bus.guildSettings.get(message.member.guild.id)
      : undefined;

  const prefix =
    bus.guildSettings.get(message.member?.guild?.id || "")?.prefix ||
    defaultPrefix;

  if (!content.startsWith(prefix)) {
    return null;
  }

  const contentWithoutprefix = content.slice(prefix.length);
  const contentSplit = contentWithoutprefix.split(/\s+/);
  const actualAlias = contentSplit[0].toLowerCase();

  if (!bus.slashCommands.get(actualAlias)) {
    return null;
  }

  const argsNotSplit = content.slice(prefix.length + actualAlias.length);

  const messageWithoutType = message as any;
  messageWithoutType.args = argsNotSplit.trim().split(/\s+/);
  messageWithoutType.pureContent = argsNotSplit.trim();

  const parsedMessage = messageWithoutType as IParsedMessage;

  return {
    command: bus.slashCommands.get(actualAlias) as IUmekoSlashCommand,
    ctx: {
      command: parsedMessage,
      type: EUmekoCommandContextType.CHAT_MESSAGE,
    },
  };
}

/**
 * Tries to derive a command from an interaction command
 * @param {CommandInteraction}interaction The interaction to parse
 * @returns {Command} A command or undefined if the interaction could not be parsed
 */
export async function parseInteractionCommand(interaction: Interaction) {

  if (interaction.isCommand()) {
    const subCommand = interaction.options.getSubcommand(false);
    if (subCommand && bus.slashCommands.get(subCommand)) {
      return {
        command: bus.slashCommands.get(subCommand) as IUmekoSlashCommand,
        ctx: {
          command: interaction as CommandInteraction,
          type: EUmekoCommandContextType.SLASH_COMMAND,
        },
      };
    } else if (bus.slashCommands.get(interaction.commandName)) {
      return {
        command: bus.slashCommands.get(interaction.commandName) as IUmekoSlashCommand,
        ctx: {
          command: interaction as CommandInteraction,
          type: EUmekoCommandContextType.SLASH_COMMAND,
        },
      };
    }


  }

  if (interaction.isContextMenu() && bus.contextMenuCommands.get(interaction.commandName)) {
    return {
      command: bus.slashCommands.get(interaction.commandName) as IUmekoSlashCommand,
      ctx: {
        command: interaction as CommandInteraction,
        type: EUmekoCommandContextType.MESSAGE_CONTEXT_MENU,
      },
    };
  }

  if (interaction.isUserContextMenu() && bus.userCommands.get(interaction.commandName)) {
    return {
      command: bus.slashCommands.get(interaction.commandName) as IUmekoSlashCommand,
      ctx: {
        command: interaction as CommandInteraction,
        type: EUmekoCommandContextType.USER_CONTEXT_MENU,
      },
    };
  }

  return null;
}
