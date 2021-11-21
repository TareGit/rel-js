const process = require('process');
require('dotenv').config();
const { Client, Intents } = require('discord.js');
const eventsModule = require('./handlers/handle_events');
const httpModule = require('./handlers/handle_http');
const commandsModule = require('./handlers/handle_commands');


// bot Intents
const botIntents = {
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MEMBERS,
        Intents.FLAGS.GUILD_MESSAGES,
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

const bot = new Client(botIntents);

bot.on('ready', () => {
    console.log('BOT ACTIVE');

    commandsModule.loadCommands(bot);

    // alert owner
    bot.users.fetch(process.env.CREATOR_ID).then((user) => {
        if (user) {
            user.send(`Loaded ${bot.commands.size} Commands`);
        }
    }).catch(console.error);


    bot.primaryColor = '#00FF00';

    const Queues = new Map();

    bot.Queues = Queues;
    
    // Fix name 
    /*bot.guilds.fetch().then((guilds) => {
        for (const guild of guilds) {
            guild[1].fetch().then((fetchedGuild) => {
                let user = fetchedGuild.me;
                if (user.displayName.toLowerCase() != 'rel') {
                    user.setNickname('REL');
                }
            });

        }
    });*/


    eventsModule.setup(bot);
    httpModule.setup(bot);
});
 
bot.login(process.env.DISCORD_BOT_TOKEN);


