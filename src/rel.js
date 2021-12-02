const process = require('process');
process.chdir(__dirname);

const ps = require('./passthrough');
const Heatsync = require("heatsync");

const sync = new Heatsync();

ps.sync = sync;


require('dotenv').config();
const { Client, Intents, CommandInteractionOptionResolver } = require('discord.js');
const chokidar = require('chokidar');
const casandraDriver = require("cassandra-driver");

// can be loaded now as it is not dependent on the bot and does not need to be initialized
const { defaultPrefix, defaultPrimaryColor } = ps.sync.require(`${process.cwd()}/config.json`);

const fs = require('fs');

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

// Setup settings and configs
const bot = new Client(botIntents);

bot.on('ready', () => {
    console.log('Bot Ready');

    const db = new casandraDriver.Client({
        cloud: {
            secureConnectBundle: process.env.ASTRA_CONNECT_BUNDLE,
        },
        credentials: {
            username: process.env.ASTRA_CLIENT_ID,
            password: process.env.ASTRA_CLIENT_SECRETE,
        },
    });

    db.connect().then(() => {

        console.log('Sucessfully Connected to Database');

        ps.bot = bot;

        db.execute("USE main").then(() => {
            //db.execute("DROP TABLE IF EXISTS guilds") never un-comment
            ps.db = db;

            // arent actually used here but we need to load them up
            const guildDataModule = sync.require('./handlers/handle_guild_data');
            const httpModule = sync.require('./handlers/handle_http');
            const eventsModule = sync.require('./handlers/handle_events');

        });

    }).catch((error) => { console.log(`Error connecting to database \n${error}`); })

});

bot.login(process.env.DISCORD_BOT_TOKEN);

//bot.on('debug', console.log);

sync.events.on("error", console.error);

ps.commands = new Map();

chokidar.watch('./commands').on('all', (event, path) => {
    switch (event) {
        case 'add':

            try {

                const command = require(`./${path}`);

                const pathAsArray = path.split('\\');

                const fileName = pathAsArray[pathAsArray.length - 1].slice(0, -3);// remove .js

                ps.commands.set(fileName, command);

            } catch (error) {

                const pathAsArray = path.split('\\');

                const fileName = pathAsArray[pathAsArray.length - 1].slice(0, -3);

                console.log(`Error Loading ${fileName} \n ${error}`);
            }


            break;

        case 'change':

            try {
                const cachedValue = require.cache[require.resolve(`./${path}`)]

                if (cachedValue !== undefined) delete require.cache[require.resolve(`./${path}`)];

                const command = require(`./${path}`);

                const pathAsArray = path.split('\\');

                const fileName = pathAsArray[pathAsArray.length - 1].slice(0, -3);

                ps.commands.set(fileName, command);

            } catch (error) {
                const pathAsArray = path.split('\\');

                const fileName = pathAsArray[pathAsArray.length - 1].slice(0, -3);

                console.log(`Error reloading ${fileName} \n ${error}`);
            }

            break;
    }
});


