const ps = require(`${process.cwd()}/passthrough`);

const { Interaction } = require('discord.js');
const fs = require('fs');

module.exports.loadCommands = function () {

    bIsReload = ps.commands != undefined;

    const commandSubFolders = fs.readdirSync(`${process.cwd()}/commands`);

    ps.commands = new Map();

    commandSubFolders.forEach(function (subFolder, index) {
        const commandFiles = fs.readdirSync(`${process.cwd()}/commands/${subFolder}`).filter(file => file.endsWith('.js'));

        for (const file of commandFiles) {

            if(bIsReload) delete require.cache[require.resolve(`${process.cwd()}/commands/${subFolder}/${file}`)];

            const command = require(`${process.cwd()}/commands/${subFolder}/${file}`);
    
            const fileName = file.slice(0, -3);// remove .js

            ps.commands.set(fileName,command);
        }
        
    });

}


module.exports.parseMessage = async (message) => {

    const content = message.content;
    let prefix = '?';

    if (!content.startsWith(prefix)) {
        return undefined
    }

    const contentWithoutprefix = content.slice(prefix.length);
    const contentSplit = contentWithoutprefix.split(/\s+/);
    const actualAlias = contentSplit[0].toLowerCase();



    if (ps.commands.get(actualAlias) == undefined) {
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
