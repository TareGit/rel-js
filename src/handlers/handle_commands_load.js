const ps = require(`${process.cwd()}/passthrough`);

const fs = require('fs');

// since we use heatsync this will reload commands everytime the file is saved

bIsReload = ps.commands !== undefined;

const commandSubFolders = fs.readdirSync(`${process.cwd()}/commands`);

ps.commands = new Map();

commandSubFolders.forEach(function (subFolder, index) {
    const commandFiles = fs.readdirSync(`${process.cwd()}/commands/${subFolder}`).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {

        if (bIsReload) delete require.cache[require.resolve(`${process.cwd()}/commands/${subFolder}/${file}`)];

        const command = require(`${process.cwd()}/commands/${subFolder}/${file}`);

        const fileName = file.slice(0, -3);// remove .js

        ps.commands.set(fileName, command);
    }

});

module.exports = `${ps.commands.size}`