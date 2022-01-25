const deleteCommands = process.argv.includes('delete');
const sendGlobalCommands = process.argv.includes('global');
const isAlpha = process.argv.includes('debug');
const axios = require('axios');
const fs = require('fs');
const util = require('util')
const Path = require('path');
process.env = require('../secretes.json');

function readDirR(dir) {
    return fs.statSync(dir).isDirectory()
        ? Array.prototype.concat(...fs.readdirSync(dir).map(f => readDirR(Path.join(dir, f))))
        : dir;
}

const commandsPaths = deleteCommands ? [] : readDirR(`${process.cwd()}/src/commands`);

process.chdir(`${process.cwd()}/src`);

const dataBus = require(`${process.cwd()}/dataBus.js`);

const Heatsync = require("heatsync");
const { options, proc } = require('node-os-utils');

const sync = new Heatsync();

Object.assign(dataBus, { sync: sync });

const utils = sync.require(`${process.cwd()}/utils`);

const commands = []

if (!deleteCommands) {

    const rawCommands = []

    commandsPaths.forEach(path => {
        const command = require(path);
        rawCommands.push(command);
    });

    utils.log("Emulated dev enviroment and loaded raw commands, count :", rawCommands.length)

    rawCommands.forEach(rawCommand => {

        if (rawCommand.cateory === "Development") return;

        const commandForApi = {
            name: rawCommand.name,
            type: 1,
            description: rawCommand.description,
            options: rawCommand.options
        }

        commands.push(commandForApi);

        if (rawCommand.ContextMenu && rawCommand.ContextMenu.name) {
            const contextCommandForAPi = {
                name: rawCommand.ContextMenu.name,
                type: 3
            }

            commands.push(contextCommandForAPi);
        }
    });

    utils.log("Converted raw commands into API commands count:", commands.length)

    utils.log(commands)
}


const botId = isAlpha ? process.env.DISCORD_BOT_ID_ALPHA : process.env.DISCORD_BOT_ID;

const url = sendGlobalCommands ? `https://discord.com/api/v8/applications/${botId}/commands` : `https://discord.com/api/v8/applications/${botId}/guilds/919021496914018346/commands`

const headers = {
    "Authorization": `Bot ${isAlpha ? process.env.DISCORD_BOT_TOKEN_ALPHA : process.env.DISCORD_BOT_TOKEN}`
}


axios.put(url, deleteCommands ? [] : commands, { headers: headers }).then((response) => {
    utils.log(`Successfully ${deleteCommands ? "Deleted" : "Updated"} commands`);
}).catch((error) => {
    utils.log(error.response.data);
    utils.log(util.inspect(error.response.data, { showHidden: false, depth: null, colors: true }))
});

