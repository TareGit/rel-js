const deleteCommands =  process.argv.includes('delete');
const sendGlobalCommands = process.argv.includes('global');
const isAlpha = process.argv.includes('alpha');
const axios = require('axios');
const fs = require('fs');
const util = require('util')
const Path = require('path');
process.env = require('../src/secretes/secretes.json');

function readDirR(dir) {
    return fs.statSync(dir).isDirectory()
        ? Array.prototype.concat(...fs.readdirSync(dir).map(f => readDirR(Path.join(dir, f))))
        : dir;
}

const commandsPaths = readDirR(`${process.cwd()}/src/commands`);

process.chdir(`${process.cwd()}/src`);

const ps = require(`${process.cwd()}/passthrough.js`);

const Heatsync = require("heatsync");
const { options, proc } = require('node-os-utils');

const sync = new Heatsync();

Object.assign(ps, { sync: sync });

const utils = sync.require(`${process.cwd()}/utils`);

const rawCommands = []

commandsPaths.forEach(path => {
    const command = require(path);
    rawCommands.push(command);
});

log("Emulated dev enviroment and loaded raw commands, count :",rawCommands.length)

const commands = []

rawCommands.forEach(rawCommand => {

    if(rawCommand.cateory === "Development") return;

    const commandForApi = {
        name : rawCommand.name,
        type : 1,
        description : rawCommand.description,
        options : rawCommand.options
    }

    commands.push(commandForApi);

    if (rawCommand.ContextMenu && rawCommand.ContextMenu.name){
        const contextCommandForAPi = {
            name : rawCommand.ContextMenu.name,
            type : 2
        }

        commands.push(contextCommandForAPi);
    }
});

log("Converted raw commands into API commands count:",commands.length)

const botId = isAlpha ? process.env.DISCORD_BOT_ID_ALPHA : process.env.DISCORD_BOT_ID;

const url = sendGlobalCommands ? `https://discord.com/api/v8/applications/${botId}/commands` : `https://discord.com/api/v8/applications/${botId}/guilds/919021496914018346/commands`

const headers = {
    "Authorization": `Bot ${isAlpha ? process.env.DISCORD_BOT_TOKEN_ALPHA : process.env.DISCORD_BOT_TOKEN}`
}

log(commands)

axios.put(url,commands, {headers : headers}).then((response) => {
    log(response.data);
}).catch((error) => {
    log(error.response.data);
    console.log(util.inspect(error.response.data, {showHidden: false, depth: null, colors: true}))
});

log(commands)


/*
let commandsInConfig = config['Commands'];
function getCommandBuilder(type) {
    switch (type) {
        case 'string':
            return new SlashCommandStringOption();
            break;
        case 'int':
            return new SlashCommandIntegerOption();
            break;
    }

}

Object.keys(commandsInConfig).forEach(function (key, index) {
    console.log(key);

    let commandInConfig = config['Commands'][key];
    let command = new SlashCommandBuilder();
    command.setName(key);
    command.setDescription(commandInConfig['description']);

    let argumentsInConfig = commandInConfig['arguments'];

    Object.keys(argumentsInConfig).forEach(function (key2, index) {
        let argument = argumentsInConfig[key2];
        let argumentType = argument['type'];
        let option = getCommandBuilder(argumentType);
        option.setName(key2);
        option.setDescription(argument['description']);
        option.setRequired(argument['required']);

        switch (argumentType) {
            case 'string':
                command.addStringOption(option);
                break;
            case 'int':
                command.addIntegerOption(option);
                break;
        }

    });

    if (commandInConfig.ContextMenu.Name != undefined) {
        const contextMenu = new ContextMenuCommandBuilder()
        .setName(commandInConfig.ContextMenu.Name)
        .setType(commandInConfig.ContextMenu.Type) // 2 for USER, 3 for MESSAGE
        .setDefaultPermission(true)

        commandsList.push(contextMenu);
        console.log(`context command added`);
    }

    commandsList.push(command);
});


*/
