const { Interaction } = require('discord.js');
const fs = require('fs');

module.exports.loadCommands = function (bot) {

    bIsReload = bot.commands != undefined;

    const commandSubFolders = ['general','music'];

    const commands = new Map();

    commandSubFolders.forEach(function (subFolder, index) {
        const commandFiles = fs.readdirSync(`${process.cwd()}/commands/${subFolder}`).filter(file => file.endsWith('.js'));

        for (const file of commandFiles) {

            if(bIsReload) delete require.cache[require.resolve(`${process.cwd()}/commands/${subFolder}/${file}`)];

            const command = require(`${process.cwd()}/commands/${subFolder}/${file}`);
    
            const fileName = file.slice(0, -3);// remove .js
            commands.set(fileName,command);
        }

        
    });

    bot.commands = commands;
    
}
module.exports.parseMessage = async (bot, message) => {

    const content = message.content;
    let prefix = '?';

    console.log(message.content);
    if (!content.startsWith(prefix)) {
        return undefined
    }

    const contentWithoutprefix = content.slice(prefix.length);
    const contentSplit = contentWithoutprefix.split(/\s+/);
    const actualAlias = contentSplit[0].toLowerCase();



    if (bot.commands.get(actualAlias) == undefined) {
        message.reply("\'" + actualAlias + "\' Is not a command");
        return undefined;
    }

    message.cType = 'MESSAGE';

    const argsNotSplit = content.slice(prefix.length + actualAlias.length);
    message.pureContent = argsNotSplit.trim();
    message.args = (argsNotSplit.trim()).split(/\s+/);
    return bot.commands.get(actualAlias);
}

module.exports.parseInteractionCommand = async (bot, interaction) => {

    interaction.cType = 'INTERACTION';
    return bot.commands.get(interaction.commandName);
}
