const deleteCommands =  false;
const sendGlobalCommands = true;

const fs = require('fs');
require('dotenv').config();

const configPath = process.env.CONFIG_PATH;
const settingsPath = process.env.SETTINGS_PATH;

const settings = JSON.parse(fs.readFileSync(settingsPath));
const config = JSON.parse(fs.readFileSync(configPath));


const { SlashCommandBuilder, SlashCommandStringOption, SlashCommandIntegerOption, ContextMenuCommandBuilder, } = require('@discordjs/builders');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');

let commandsList = []

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


const commands = deleteCommands ? [] : commandsList.map(command => command.toJSON());

const rest = new REST({ version: '9' }).setToken(process.env.DISCORD_BOT_TOKEN);



if (sendGlobalCommands) {
    try {
        rest.put(
            Routes.applicationCommands('804165876362117141'),
            { body: commands },
        ).then(() => console.log('Successfully Registered Global commands.'));
    } catch (error) {
        console.log('Error registering Global commands for');
        console.log(error);
    }
}
else {
    Object.keys(settings['servers']).forEach(function (key, index) {
        try {
            rest.put(Routes.applicationGuildCommands('804165876362117141', key), { body: commands })
                .then(() => console.log('Successfully registered Guild commands.'))
        } catch (error) {
            console.log('Error registering Guild commands for' + key);
        }
    });
}


