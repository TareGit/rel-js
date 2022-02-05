const dataBus = require(`${process.cwd()}/dataBus.js`);
const { sync, bot, modulesLastReloadTime, perGuildSettings, perGuildLeveling } = dataBus;

const utils = sync.require(`${process.cwd()}/utils`);

const parser = sync.require('./handle_commands');
const guildDataModule = sync.require('./handle_guild_data');
const { xpUpdateThreshold } = sync.require(`${process.cwd()}/config.json`);

const axios = require("axios");


async function onMessageCreate(message) {
    try {
        if (message.author.id === bot.user.id) return;
        if (message.author.bot) return;
        if (message.guild === null || message.member === null) return;

        const guildId = message.guild.id;
        const userId = message.member.id;
        const username = message.member.displayName;

        const options = perGuildSettings.get(guildId).leveling_options;

        if(!options.get('location') || options.get('location') === 'disabled') return;

        if (perGuildLeveling.get(guildId) === undefined) perGuildLeveling.set(guildId, { ranking : []});

        const levelingData = perGuildLeveling.get(guildId);

        if (levelingData[userId] === undefined){
            levelingData[userId] = {level : 0, currentXp : 0};
            levelingData.ranking.push(userId);
        } 

        levelingData[userId].currentXp += utils.randomIntegerInRange(5, 10);

        const nextLevelXp = utils.getXpForNextLevel(levelingData[userId].level)
        
        if(levelingData[userId].currentXp >= nextLevelXp)
        {
            levelingData[userId].level += 1;
            levelingData[userId].currentXp = levelingData[userId].currentXp - nextLevelXp;

            if(levelingData.ranking)
            {
                levelingData.ranking.sort(function(userA,userB){
                    return  levelingData[userA].level < levelingData[userB].level;
                });
            }
            
            
            let levelUpNotification = perGuildSettings.get(guildId).leveling_message;

            levelUpNotification = levelUpNotification.replace(/{user}/gi, `<@${userId}>`);
            levelUpNotification = levelUpNotification.replace(/{username}/gi, `${username}`);
            levelUpNotification = levelUpNotification.replace(/{level}/gi, `${levelingData[userId].level}`);
            levelUpNotification = levelUpNotification.replace(/{server}/gi, `${message.guild.name}`);
            levelUpNotification = levelUpNotification.replace(/{id}/gi, `${userId}`);

            levelingData[userId].lastXpUpdateAmmount = levelingData[userId].currentXp - xpUpdateThreshold;//  force an update to the backend
            
            if(options.get('location') === 'channel' && options.get('channel'))
            {
                const channel = await message.guild.channels.fetch(options.get('channel')).catch(utils.log);;
                    if(channel)
                    {
                        channel.send(levelUpNotification);
                    }
                    else
                    {
                        message.forceChannelReply = true;
                       utils.reply(message,levelUpNotification);
                    }
            }
            else if(options.get('location') === "dm"){
                message.author.send(levelUpNotification).catch((error)=>{utils.log('Error sending level up message',error)})
            }
            else
            {
            message.forceChannelReply = true;
               utils.reply(message,levelUpNotification);
            }
            
        }

        // update backend only if xp is past the specified threshold
        if(levelingData[userId].lastXpUpdateAmmount !== undefined && (levelingData[userId].currentXp - levelingData[userId].lastXpUpdateAmmount) < xpUpdateThreshold) return;

        levelingData[userId].lastXpUpdateAmmount = levelingData[userId].currentXp;

        const postData = {
            userId : userId,
            level : levelingData[userId].level,
            xp_current : levelingData[userId].currentXp
        }

         
        axios.post(`${process.argv.includes('debug') ? process.env.DB_API_DEBUG : process.env.DB_API }/tables/guild_leveling_${guildId}/rows`,[postData],{ headers: {'x-api-key': process.env.DB_API_TOKEN}}).then((levelingUpdateResponse) =>{
        }).catch((error)=>{utils.log("Error updating back end XP",error.data)});

    } catch (error) {
        utils.log('Error handeling leveling', error)
    }

}

async function onGuildCreate(guild) {

}


const levelingEvents = [
    { id: 'messageCreate', event: onMessageCreate },
    { id: 'guildCreate', event: onGuildCreate }
]

if (bot !== undefined) {
    if (dataBus.levelingEvents !== undefined) {
        const previousEvents = dataBus.levelingEvents;

        previousEvents.forEach(function (levelingEvent, index) {
            try {
                bot.removeListener(levelingEvent.id, levelingEvent.event);
            } catch (error) {
                utils.log(`Error unbinding event ${levelingEvent.id} from bot\x1b[0m\n`, error);
            }
        });

    }

    levelingEvents.forEach(function (levelingEvent, index) {
        try {
            bot.on(levelingEvent.id, levelingEvent.event);
        } catch (error) {
            utils.log(`Error binding event ${levelingEvent.id} to bot\x1b[0m\n`, error);
        }
    });

    dataBus.levelingEvents = levelingEvents;
}



if (modulesLastReloadTime.leveling !== undefined) {
    utils.log('Leveling Module Reloaded\x1b[0m');
}
else {
    utils.log('Leveling Module Loaded\x1b[0m');
}

if(bot)
{
    modulesLastReloadTime.leveling = bot.uptime;
}





