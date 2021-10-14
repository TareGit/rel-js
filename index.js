var process = require('process');
process.chdir(__dirname);
console.log(__dirname);

require('dotenv').config();
const { Client, Intents} = require('discord.js');

const eventsModule = require('./handle_events');

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

const bot = new Client(botIntents);

bot.on('ready', () => {
    console.log('BOT ACTIVE');
    bot.users.fetch('604699803468824676').then((user) => {
        if (user) {
            user.send('BITCH IM AWAKE');
        }
    }).catch(console.error);
});


bot.on('messageCreate', (message) => {
    if (message.author.id === bot.user.id) return;
    
    eventsModule.messageCreate(message);

});

bot.on('interactionCreate', interaction => {
	if(!interaction.isCommand())
    {
        return;   
    }

    eventsModule.interactionCreate(interaction);
});


bot.login(process.env.DISCORD_BOT_TOKEN);
eventsModule.setup(bot);