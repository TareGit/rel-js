const { bot, sync, perGuildSettings, commands,modulesLastReloadTime,disabledCategories } = require(`${process.cwd()}/passthrough`);
const { Interaction } = require('discord.js');
const fs = require('fs');

const { defaultPrefix } = sync.require(`${process.cwd()}/config.json`);

module.exports.parseMessage = async (message) => {

    const content = message.content;
    const guildData = (message.member !== null) ? perGuildSettings.get(message.member.guild.id) : undefined;

    const prefix = (message.member !== null && guildData !== undefined) ? perGuildSettings.get(message.member.guild.id).prefix : defaultPrefix;

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
    log('\x1b[32mCommands Module Reloaded\x1b[0m');
}
else
{
    log('\x1b[32mCommands Module Loaded\x1b[0m');
}

if(bot)
{
    modulesLastReloadTime.commands = bot.uptime;
}


