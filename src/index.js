const process = require('process');
process.chdir(__dirname);

const ps = require('./passthrough.js');

const Heatsync = require("heatsync");

const sync = new Heatsync();

Object.assign(ps, { sync: sync });

process.env = sync.require('./secretes/secretes.json');;

const { Client, Intents, CommandInteractionOptionResolver } = require('discord.js');
const chokidar = require('chokidar');
const casandraDriver = require("cassandra-driver");

// import the Manager class from lavacord
const { Manager } = require("lavacord");


const { defaultPrefix, defaultPrimaryColor } = sync.require(`${process.cwd()}/config.json`);

const { addNewCommand, reloadCommand } = sync.require(`${process.cwd()}/utils.js`)

const { getOsuApiToken } = sync.require(`${process.cwd()}/utils.js`);

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

    Object.assign(ps, { bot: bot });

    // Define the nodes array as an example
    const nodes = [
        { id: "1", host: "localhost", port: 2333, password: process.env.LAVALINK_PASSWORD }
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

    Object.assign(ps, { LavaManager: LavaManager });

    try {
        await LavaManager.connect();
        console.log("Connected to Music provider");
    } catch (error) {
        console.log("Error connecting to Music provider\n");
        console.log(error)
    }
    

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
        Object.assign(ps, { db: db });

    } catch (error) {
        console.log(`Error connecting to database \n`);
        console.log(error);
    }

    try {
        // arent actually used here but we need to load them up
        const guildDataModule = sync.require('./handlers/handle_guild_data');
        const httpModule = sync.require('./handlers/handle_http');
        const eventsModule = sync.require('./handlers/handle_events');
    } catch (error) {
        console.log(`Error loading modules \n`);
        console.log(error);
    }

    await getOsuApiToken();

    // Commands loading and reloading
    chokidar.watch('./commands', { persistent: true, usePolling: true }).on('all', (event, path) => {

        const pathAsArray = process.platform === 'linux' ? path.split('/') : path.split('\\');

        switch (event) {

            case 'add':
                addNewCommand(path);
                break;

            case 'change':
                reloadCommand(path);
                break;
        }
    });

});

bot.login(process.env.DISCORD_BOT_TOKEN);

//bot.on('debug', console.log);

sync.events.on("error", console.error);

