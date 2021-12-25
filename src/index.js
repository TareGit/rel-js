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

const { addNewCommand, reloadCommand, getOsuApiToken, getSpotifyApiToken, logError } = sync.require(`${process.cwd()}/utils.js`)

const fs = require('fs');
const passthrough = require('./passthrough.js');

// bot Intents
const botIntents = {
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MEMBERS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_PRESENCES,
        Intents.FLAGS.DIRECT_MESSAGES,
        Intents.FLAGS.GUILD_VOICE_STATES
    ],

    partials: ['MESSAGE', 'CHANNEL']
}




// Setup settings and configs
const bot = new Client(botIntents);

bot.on('ready', async () => {
    console.log('\x1b[32mBot Ready\x1b[0m');

    setInterval(() => bot.user.setActivity(`${bot.guilds.cache.size} Servers`,{type: 'WATCHING'}), 20000);

    Object.assign(ps, { bot: bot });

    // Volcano nodes
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
        
        console.log("\x1b[32m","Connected to Music provider\x1b[0m");
    } catch (error) {
        logError('Error connecting to music provider',error);
        passthrough.disabledCategories.push('Music');
    }
    

    bot.ws
        .on("VOICE_SERVER_UPDATE", ps.LavaManager.voiceServerUpdate.bind(ps.LavaManager))
        .on("VOICE_STATE_UPDATE", ps.LavaManager.voiceStateUpdate.bind(ps.LavaManager))
        .on("GUILD_CREATE", async data => {
            for (const state of data.voice_states) await ps.LavaManager.voiceStateUpdate({ ...state, guild_id: data.id });
        });

    LavaManager.on("error", (error, node) => {
        logError('Lavalink error',error);
    });


    try {
        // arent actually used here but we need to load them up
        const guildDataModule = sync.require('./handlers/handle_guild_data');
        const httpModule = sync.require('./handlers/handle_http');
        const eventsModule = sync.require('./handlers/handle_events');
    } catch (error) {
        logError('Error loading modules',error);
    }

    await getOsuApiToken();

    await getSpotifyApiToken();

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

if(process.argv.includes('alpha'))
{
    bot.login(process.env.DISCORD_BOT_TOKEN_ALPHA);
}
else
{
    bot.login(process.env.DISCORD_BOT_TOKEN);
}

if(process.argv.includes('debug'))
{
    bot.on('debug', console.log);
}

sync.events.on("error", console.error);



