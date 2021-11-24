const process = require('process');
process.chdir(__dirname);

const ps = require('./passthrough');
const Heatsync = require("heatsync");

const sync = new Heatsync();

ps.sync = sync;


require('dotenv').config();
const { Client, Intents } = require('discord.js');
const casandraDriver = require("cassandra-driver");



const eventsModule = sync.require('./handlers/handle_events');
const httpModule = sync.require('./handlers/handle_http');
const commandsModule = sync.require('./handlers/handle_commands');




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

    const db = new casandraDriver.Client({
        cloud: {
          secureConnectBundle: process.env.ASTRA_CONNECT_BUNDLE,
        },
        credentials: {
          username: process.env.ASTRA_CLIENT_ID,
          password: process.env.ASTRA_CLIENT_SECRETE,
        },
      });

    db.connect().then(()=>{
        console.log('Sucessfully Connected to Database');
        ps.bot = bot;
    

        commandsModule.loadCommands();
    
    
        console.log('BOT ACTIVE');
    
        // alert owner
        bot.users.fetch(process.env.CREATOR_ID).then((user) => {
            if (user) {
                user.send(`Loaded ${ps.commands.size} Commands`);
            }
        }).catch((error) => {console.log(`Error Notifying creator of commands Init \n${error}`);});
    
    
        bot.primaryColor = '#00FF00';
    
        ps.queues = new Map();
    
        eventsModule.setup();
    
        httpModule.initialize();
    }).catch((error)=> {console.log(`Error connecting to database \n${error}`);})

    
    
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


    
});
 
bot.login(process.env.DISCORD_BOT_TOKEN_ALPHA);


