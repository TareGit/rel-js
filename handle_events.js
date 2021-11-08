const fs = require('fs');
const chatbotModule = require('./modules/chatbot');
const mainBotModule = require('./modules/mainbot');
const musicBotModule = require('./modules/musicbot');
const commandsModule = require('./modules/commands');

const settingsPath = process.env.SETTINGS_PATH;
const googleServiceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
const configPath = process.env.CONFIG_PATH;

const serviceAccountCredentials = JSON.parse(fs.readFileSync(googleServiceAccountPath));
const settings = JSON.parse(fs.readFileSync(settingsPath));
const config = JSON.parse(fs.readFileSync(configPath));


let commandParser = undefined;

let chatBotManagerInstance = undefined;

let mainBot = undefined;

let musicBot = undefined;

function getConfig() {
    return config;
}

function getSettings() {
    return settings;
}

function updateSettings(newSettings) {
    fs.writeFileSync(settingsPath, JSON.stringify(newSettings, null, 2));
}

module.exports.setup = function setup(bot) {
commandParser = new commandsModule.commandParser(getConfig, getSettings, updateSettings);

chatBotManagerInstance = new chatbotModule.ChatBotManager(serviceAccountCredentials['project_id']);

mainBot = new mainBotModule.mainBot(getConfig, getSettings, updateSettings);

musicBot = new musicBotModule.musicManager(bot, getSettings, updateSettings);
    
}

const asyncMessageCreate = async (message) => {


    const commandToExecute = await commandParser.parseMessageCommand(message);

    if (commandToExecute == undefined) {
        const messageContent = message.content;
        if (message.channel.type == "DM" || messageContent.toLowerCase().split(/\s+/)[0] == 'rel') {
            await chatBotManagerInstance.processIntents(message);
        }
        else {
            if (message.reference) {
                const repliedTo = await message.channel.messages.fetch(message.reference.messageId);


                if (repliedTo) {
                    if (repliedTo.author.id == '804165876362117141') {
                        await chatBotManagerInstance.processIntents(message);
                    }
                }
            }
        }
    }
    else {
        try {
            switch (commandToExecute.getCategory()) {
                case 'Main':
                    await mainBot[await commandToExecute.getFunctionName()](commandToExecute);
                    break;

                case 'Music':
                    await musicBot[await commandToExecute.getFunctionName()](commandToExecute);
                    break;

                default:
                    message.reply("Command not yet implemented");
                    break;
            };
        } catch (error) {
            console.log(error);
        }

    }
}

const asyncInteractionCreate = async (interaction) => {


    const commandToExecute = await commandParser.parseInteractionCommand(interaction);

    if (commandToExecute == undefined) {
        interaction.reply("Command not yet implemented");
    }
    else {
        try {
            switch (commandToExecute.getCategory()) {
                case 'Main':
                    await mainBot[await commandToExecute.getFunctionName()](commandToExecute);
                    break;

                case 'Music':
                    await musicBot[await commandToExecute.getFunctionName()](commandToExecute);
                    break;
            };
        } catch (error) {
            console.log(error);
        }

    }
}

const asyncGuildMemberUpdate = async (bot,oldMember, newMember) => {
    if(newMember.id == bot.user.id)
    {
        if(newMember.displayName.toLowerCase() != 'rel')
        {
            newMember.setNickname('REL');
        }

    }
}

module.exports.messageCreate = function (message) {
    asyncMessageCreate(message).then(result => {
    });

}

module.exports.interactionCreate = function (interaction) {
    if (!interaction.isCommand() && !interaction.isContextMenu()) {
        return;
    }

    asyncInteractionCreate(interaction).then(result => {
    });

}

module.exports.guildMemberUpdate = function (bot,oldMember, newMember) {
   asyncGuildMemberUpdate(bot,oldMember,newMember);
}