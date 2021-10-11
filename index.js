
require('dotenv').config();
const { Client, Intents } = require('discord.js');
const chatbotModule = require('./Modules/chatbot');
const mainBotModule = require('./Modules/mainbot');
const musicBotModule = require('./Modules/musicBot');
const commandsModule = require('./Modules/commands');
const fs = require('fs');

// bot Intents
const botIntents = {
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_MESSAGE_TYPING,
        Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
        Intents.FLAGS.DIRECT_MESSAGES,
        Intents.FLAGS.DIRECT_MESSAGE_TYPING,
        Intents.FLAGS.DIRECT_MESSAGE_REACTIONS,
        Intents.FLAGS.GUILD_VOICE_STATES
    ],

    partials: ['MESSAGE', 'CHANNEL', 'REACTION']
}


// Setup settinngs and configs

const settingsPath = process.env.SETTINGS_PATH;
const googleServiceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
const configPath = process.env.CONFIG_PATH;

const serviceAccountCredentials = JSON.parse(fs.readFileSync(googleServiceAccountPath));
const settings = JSON.parse(fs.readFileSync(settingsPath));
const config = JSON.parse(fs.readFileSync(configPath));

function getConfig() {
    return config;
}

function getSettings() {
    return settings;
}

function updateSettings(newSettings) {
    fs.writeFileSync(settingsPath, JSON.stringify(newSettings, null, 2));
}

const bot = new Client(botIntents);

const commandParser = new commandsModule.commandParser(getConfig, getSettings, updateSettings);

const chatBotManagerInstance = new chatbotModule.ChatBotManager(serviceAccountCredentials['project_id']);

const mainBot = new mainBotModule.mainBot(bot, getConfig, getSettings, updateSettings);

const musicBot = new musicBotModule.musicManager(bot, getSettings, updateSettings);

const asyncMessageCreate = async (message) => {

    if (message.author.id === bot.user.id) return;


    const commandToExecute = await commandParser.parseCommand(message);

    if (commandToExecute == undefined) {
        const messageContent = message.content;
        if (message.channel.type == "DM" || messageContent.toLowerCase().startsWith('rel')) {
            await chatBotManagerInstance.processIntents(message);
        }
        else {
            if (message.reference) {
                await chatBotManagerInstance.processIntents(message);
            }
        }
    }
    else {
        try {
            switch (commandToExecute.getCategory()) {
                case 'Main':
                    mainBot[await commandToExecute.getFunctionName()](commandToExecute);
                    break;

                case 'Music':
                    musicBot[await commandToExecute.getFunctionName()](commandToExecute);
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

bot.on('ready', () => {

    bot.users.fetch('604699803468824676').then((user) => {
        if (user) {
            user.send('BITCH IM AWAKE');
        }
    }).catch(console.error);
});


bot.on('messageCreate', (message) => {
    asyncMessageCreate(message);
});


bot.login(process.env.DISCORD_BOT_TOKEN_ALPHA);