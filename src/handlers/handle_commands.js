const ps = require(`${process.cwd()}/passthrough`);

const { Interaction } = require('discord.js');
const { defaultPrefix } = ps.sync.require(`${process.cwd()}/config.json`);
const fs = require('fs');




module.exports.parseMessage = async (message) => {

    const content = message.content;
    const prefix = (message.member !== null) ? ps.perGuildData.get(message.member.guild.id).prefix : defaultPrefix;

    if (!content.startsWith(prefix)) {
        return undefined
    }

    const contentWithoutprefix = content.slice(prefix.length);
    const contentSplit = contentWithoutprefix.split(/\s+/);
    const actualAlias = contentSplit[0].toLowerCase();

    if (ps.commands.get(actualAlias) === undefined) {
        message.reply("\'" + actualAlias + "\' Is not a command");
        return undefined;
    }

    message.cType = 'MESSAGE';

    const argsNotSplit = content.slice(prefix.length + actualAlias.length);
    message.pureContent = argsNotSplit.trim();
    message.args = (argsNotSplit.trim()).split(/\s+/);
    return ps.commands.get(actualAlias);
}

module.exports.parseInteractionCommand = async (interaction) => {

    interaction.cType = 'INTERACTION';
    return ps.commands.get(interaction.commandName);
}
