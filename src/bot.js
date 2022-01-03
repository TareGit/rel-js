const process = require('process');

process.chdir(__dirname);

const ps = require('./passthrough.js');

const Heatsync = require("heatsync");

const sync = new Heatsync();

Object.assign(ps, { sync: sync });

//process.env = sync.require('./secretes/secretes.json');

const { Client, Intents, CommandInteractionOptionResolver } = require('discord.js');
const chokidar = require('chokidar');   

// import the Manager class from lavacord
const { Manager } = require("lavacord");

const fs = require('fs');
const { defaultPrefix, defaultPrimaryColor } = sync.require(`${process.cwd()}/config.json`);

const utils = sync.require(`./utils`);

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
    

    log('\x1b[32mBot Ready\x1b[0m');

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
        
        log("\x1b[32mConnected to Music provider\x1b[0m");
    } catch (error) {
        log('\x1b[31mError connecting to music provider\x1b[0m\n',error);
        ps.disabledCategories.push('Music');
    }
    

    bot.ws
        .on("VOICE_SERVER_UPDATE", ps.LavaManager.voiceServerUpdate.bind(ps.LavaManager))
        .on("VOICE_STATE_UPDATE", ps.LavaManager.voiceStateUpdate.bind(ps.LavaManager))
        .on("GUILD_CREATE", async data => {
            for (const state of data.voice_states) await ps.LavaManager.voiceStateUpdate({ ...state, guild_id: data.id });
        });

    LavaManager.on("error", (error, node) => {
        log('\x1b[31mLavalink error\x1b[0m\n',error);
    });


    try {
        // Loads other modules once done
        const guildDataModule = sync.require('./handlers/handle_guild_data');
        await guildDataModule.load();

        const levelingModule = sync.require('./handlers/handle_leveling');
        const httpModule = sync.require('./handlers/handle_http');
        const eventsModule = sync.require('./handlers/handle_events');
    } catch (error) {
        log('\x1b[31mError loading modules\x1b[0m\n',error);
    }

    await getOsuApiToken();

    await getSpotifyApiToken();

    // Commands loading and reloading
    chokidar.watch('./commands', { persistent: true, usePolling: true }).on('all', (event, path) => {
        handleCommandDirectoryChanges(event,path);
    });

});

bot.login(process.env.CURRENT_BOT_TOKEN);

if(process.argv.includes('debug'))
{
    bot.on('debug', log);
}

sync.events.on("error", log);



