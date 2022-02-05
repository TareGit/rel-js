const { bot, sync, perGuildSettings, commands,modulesLastReloadTime,disabledCategories } = require(`${process.cwd()}/dataBus`);
const { Interaction, BaseCommandInteraction, CommandInteraction } = require('discord.js');
const fs = require('fs');

const utils = sync.require(`${process.cwd()}/utils`);

const { defaultPrefix } = sync.require(`${process.cwd()}/config.json`);

/**
 * Tries to derive a command from a message
 * @param {Message}message The message to parse
 * @returns {Command} A command or undefined if the message could not be parsed
 */
module.exports.parseMessage = async (message) => {

    const content = message.content;
    const guildData = (message.member !== null) ? perGuildSettings.get(message.member.guild.id) : undefined;

    

    const prefix = (message.member !== null) ? perGuildSettings.get(message.member.guild.id).prefix : defaultPrefix;

    if (!content.startsWith(prefix)) {
        return undefined
    }

    const contentWithoutprefix = content.slice(prefix.length);
    const contentSplit = contentWithoutprefix.split(/\s+/);
    const actualAlias = contentSplit[0].toLowerCase();

    if (commands.get(actualAlias) === undefined) {
        return undefined;
    }

    if(disabledCategories.includes(commands.get(actualAlias).category))
    {
        return undefined;
    }

    message.cType = 'MESSAGE';

    const argsNotSplit = content.slice(prefix.length + actualAlias.length);
    message.pureContent = argsNotSplit.trim();
    message.args = (argsNotSplit.trim()).split(/\s+/);
    return commands.get(actualAlias);
}

/**
 * Tries to derive a command from an interaction command
 * @param {CommandInteraction}interaction The interaction to parse
 * @returns {Command} A command or undefined if the interaction could not be parsed
 */
module.exports.parseInteractionCommand = async (interaction) => {

    if(interaction.isContextMenu())
    {
        interaction.cType = 'CONTEXT_MENU';
    }

    if(interaction.isCommand())
    {
        interaction.cType = 'COMMAND';
    }
    
    if(disabledCategories.includes(commands.get(interaction.commandName).category))
    {
        return undefined;
    }

    return commands.get(interaction.commandName);
}




if(modulesLastReloadTime.commands !== undefined)
{
    utils.log('Commands Module Reloaded\x1b[0m');
}
else
{
    utils.log('Commands Module Loaded\x1b[0m');
}

if(bot)
{
    modulesLastReloadTime.commands = bot.uptime;
}


