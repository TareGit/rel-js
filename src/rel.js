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

// import the Manager class from lavacord
const { Manager } = require("lavacord");


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

bot.on('ready', async () => {
    console.log('Bot Ready');

    ps.bot = bot;

    // Define the nodes array as an example
    const nodes = [
        { id: "1", host: "localhost", port: 2333, password: "RunningOutOfAir" }
    ];

    // Initilize the Manager with all the data it needs
    const LavaManager = new Manager(nodes, {
        user: bot.user.id,
        shards: bot.options.shardCount,
        send: (packet) => {

            const guild = bot.guilds.cache.get(packet.d.guild_id);
            return guild.shard.send(packet);

        }
    });

    ps.LavaManager = LavaManager

    await LavaManager.connect();

    bot.ws
        .on("VOICE_SERVER_UPDATE", ps.LavaManager.voiceServerUpdate.bind(ps.LavaManager))
        .on("VOICE_STATE_UPDATE", ps.LavaManager.voiceStateUpdate.bind(ps.LavaManager))
        .on("GUILD_CREATE", async data => {
            for (const state of data.voice_states) await ps.LavaManager.voiceStateUpdate({ ...state, guild_id: data.id });
        });

    LavaManager.on("error", (error, node) => {
        console.log(error);
    });

    const db = new casandraDriver.Client({
        cloud: {
            secureConnectBundle: process.env.ASTRA_CONNECT_BUNDLE,
        },
        credentials: {
            username: process.env.ASTRA_CLIENT_ID,
            password: process.env.ASTRA_CLIENT_SECRETE,
        },
    });

    try {
        await db.connect();
        console.log('Sucessfully Connected to Database');
        await db.execute("USE main");

        //db.execute("DROP TABLE IF EXISTS guilds") never un-comment
        ps.db = db;

        // arent actually used here but we need to load them up
        const guildDataModule = sync.require('./handlers/handle_guild_data');
        const httpModule = sync.require('./handlers/handle_http');
        const eventsModule = sync.require('./handlers/handle_events');
    } catch (error) {
        console.log(`Error connecting to database \n${error}`);
    }

    ps.commands = new Map();

    // commands loading and reloading
    chokidar.watch('./commands', { persistent: true, usePolling: true }).on('all', (event, path) => {

        const pathAsArray = process.platform === 'linux' ? path.split('/') : path.split('\\');

        switch (event) {

            case 'add':

                try {

                    const command = require(`./${path}`);

                    const fileName = pathAsArray[pathAsArray.length - 1].slice(0, -3);// remove .js

                    ps.commands.set(fileName, command);
                    console.log('ADDED NEW COMMAND ' + fileName);

                } catch (error) {

                    const fileName = pathAsArray[pathAsArray.length - 1].slice(0, -3);

                    console.log(`Error Loading ${fileName} \n ${error}`);
                }


                break;

            case 'change':

                try {
                    const cachedValue = require.cache[require.resolve(`./${path}`)]

                    if (cachedValue !== undefined) delete require.cache[require.resolve(`./${path}`)];

                    const command = require(`./${path}`);

                    const fileName = pathAsArray[pathAsArray.length - 1].slice(0, -3);

                    ps.commands.set(fileName, command);

                    console.log('RELOADED COMMAND ' + fileName);

                } catch (error) {

                    const fileName = pathAsArray[pathAsArray.length - 1].slice(0, -3);

                    console.log(`Error reloading ${fileName} \n ${error}`);
                }

                break;
        }
    });

});

bot.login(process.env.DISCORD_BOT_TOKEN);

//bot.on('debug', console.log);

sync.events.on("error", console.error);



