const ps = require(`${process.cwd()}/passthrough.js`);
const { sync, bot,modulesLastReloadTime} = require(`${process.cwd()}/passthrough.js`);
const { reply } = sync.require(`${process.cwd()}/utils.js`);

const parser = sync.require('./handle_commands');
const guildDataModule = sync.require('./handle_guild_data');

const fs = require('fs');


async function onMessageCreate(message) {
    if (message.author.id === bot.user.id) return;
    if (message.guild === null) return;



}


async function onGuildCreate(guild) {
    
}



const levelingEvents = [
    { id: 'messageCreate', event: onMessageCreate },
    { id: 'guildCreate', event: onGuildCreate }
]

if(bot !== undefined)
{
    if (ps.levelingEvents !== undefined) {
        const previousEvents = ps.levelingEvents;
    
        previousEvents.forEach(function (levelingEvent, index) {
            try {
                bot.removeListener(levelingEvent.id, levelingEvent.event);
            } catch (error) {
                logError(`Error unbinding event ${levelingEvent.id} from bot`,error);
            }
        });
    
    }
    
    levelingEvents.forEach(function (levelingEvent, index) {
        try {
            bot.on(levelingEvent.id, levelingEvent.event);
        } catch (error) {
            logError(`Error binding event ${levelingEvent.id} to bot`,error);
        }
    });
    
    ps.levelingEvents = levelingEvents;
}

console.log('\x1b[32mLeveling Module Online\x1b[0m');

if(modulesLastReloadTime.leveling !== undefined)
{
    
}

modulesLastReloadTime.leveling = bot.uptime;




