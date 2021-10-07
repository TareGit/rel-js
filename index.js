require('dotenv').config();

const { Client, Intents } = require('discord.js');
const chatbot = require('./Modules/chatbot');
const commands = require('./Modules/commands');
const fs = require('fs');


const botIntents = {
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_MESSAGE_TYPING,
        Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
        Intents.FLAGS.DIRECT_MESSAGES,
        Intents.FLAGS.DIRECT_MESSAGE_TYPING,
        Intents.FLAGS.DIRECT_MESSAGE_REACTIONS

    ],

    partials: ['MESSAGE', 'CHANNEL', 'REACTION']
}

const bot = new Client(botIntents);


const rawSettings = fs.readFileSync('Storage/settings.json');
const settings = JSON.parse(rawSettings);

const rawConfig = fs.readFileSync('Storage/config.json');
const config = JSON.parse(rawConfig);

function getConfig() {
    return config;
}

function getSettings() {
    return settings;
}

const commandParser = new commands.commandParser(getConfig, getSettings);
const ChatBotManagerInstance = new chatbot.ChatBotManager('rel-gcwm');

bot.on('ready', () => {

    bot.users.fetch('604699803468824676').then((user) => {
        if (user) {
            user.send('BITCH IM AWAKE');
        }
    }).catch(console.error);
});

bot.on('messageCreate', (message) => {

    if (message.author.id === bot.user.id) return;

    const commandToExecute = commandParser.parseCommand(message);

    if (commandToExecute == undefined) {
        const messageContent = message.content;
        if (message.channel.type == "DM" || messageContent.toLowerCase().startsWith('rel')) {
            ChatBotManagerInstance.processIntents(message);
        }
        else
        {
            if(message.reference)
            {
                ChatBotManagerInstance.processIntents(message);
            }
        }
    }
    else {
        commandToExecute.executeCommand();
    }

});


bot.login(process.env.DISCORD_BOT_TOKEN_ALPHA);