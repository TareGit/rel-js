const EventEmitter = require("events");

const { sync, bot , db, perGuildData,modulesLastReloadTime, socket} = require(`${process.cwd()}/passthrough.js`);
const { reply, logError } = sync.require(`${process.cwd()}/utils.js`);
const { defaultPrefix, defaultPrimaryColor } = sync.require(`${process.cwd()}/config.json`);

const guilds = Array.from(bot.guilds.cache.keys());

async function pushRemainingKeysToDb() {

    console.log(`Guilds Not In Database [${guilds}]`)

    guilds.forEach(function (guild, index) {

        const setting = {pColor : defaultPrimaryColor, prefix : defaultPrefix}

        

        perGuildData.set(guild,setting);
    });
}

module.exports.joinedNewGuild = async function (guild) {

        const setting = {pColor : defaultPrimaryColor, prefix : defaultPrefix}

        perGuildData.set(guild.id,setting);

        if(socket !== undefined){
            socket.emit('identify', { id: 'Umeko', guilds: Array.from(bot.guilds.cache.keys()) });
        }

        
}




    console.log("\x1b[32m",'Guild data Module Online\x1b[0m');

    if(modulesLastReloadTime.guildData !== undefined)
    {
        
    }
    
    modulesLastReloadTime.guildData = bot.uptime;


