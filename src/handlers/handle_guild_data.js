const { default: axios } = require("axios");
const EventEmitter = require("events");

const { sync, bot, db, perGuildSettings,perUserData, modulesLastReloadTime, socket, perGuildLeveling, guildsPendingUpdate,usersPendingUpdate, intervals } = require(`${process.cwd()}/dataBus.js`);
const { dataUpdateInterval ,defaultPrefix, defaultPrimaryColor, defaultLanguage, defaultNickname, defaultWelcomeMessage, defaultLeaveMessage, defaultTwitchMessage, defaultLevelingMessage, guildSettingsTableFormat, guildLevelingTableFormat, guildCommandsTableFormat, userSettingsTableFormat } = sync.require(`${process.cwd()}/config.json`);

const utils = sync.require(`${process.cwd()}/utils`);


async function updateGuilds(){
    if(!guildsPendingUpdate.length)
    {
        setTimeout(updateGuilds,dataUpdateInterval * 1000);
        return;
    }


    try {
        const guild_settings_response = await db.get(`/tables/guild_settings/rows?data=${guildsPendingUpdate.join(',')}`);

        const guild_settings_data = guild_settings_response.data;

        if (guild_settings_data.error) {
            utils.log(`Error Updating Pending Guilds : "${guild_settings_data.error}" \x1b[0m`);

            if(guild_settings_data.error === 'Table does not exist') await db.post('/tables',guildSettingsTableFormat);
        }
        else {

            const rows = guild_settings_data;

            rows.forEach(function (dbSetting, index) {

                const setting = {
                    id: dbSetting.id,
                    color: dbSetting.color,
                    prefix: dbSetting.prefix,
                    nickname: dbSetting.nickname,
                    language: dbSetting.language,
                    welcome_message: dbSetting.welcome_message,
                    welcome_options: new URLSearchParams(dbSetting.welcome_options),
                    leave_message: dbSetting.leave_message,
                    leave_options: new URLSearchParams(dbSetting.leave_options),
                    twitch_message: dbSetting.twitch_message,
                    twitch_options: new URLSearchParams(dbSetting.twitch_options),
                    leveling_message: dbSetting.leveling_message,
                    leveling_options: new URLSearchParams(dbSetting.leveling_options)
                }

                perGuildSettings.set(setting.id, setting);

                guildsPendingUpdate.splice(guildsPendingUpdate.indexOf(setting.id), 1);

                utils.log(`Updated Settings for Guild ${setting.id}`);
            });
        }

    } catch (error) {
        if(error.isAxiosError)
        {
            utils.log('Error Updating Pending Guilds : ',error.data || error.message);
        }
        else
        {
            utils.log(error)
        }
    }

    setTimeout(updateGuilds,dataUpdateInterval * 1000);
}

async function updateUsers(){
    if(!usersPendingUpdate.length)
    {
        setTimeout(updateUsers,dataUpdateInterval * 1000);
        return;
    }

    try {
        const user_settings_response = await db.get(`/tables/user_settings/rows?data=${usersPendingUpdate.join(',')}`);

        const user_settings_data = user_settings_response.data;

        if (user_settings_data.error) {
            utils.log(`Error Updating Pending Users : "${user_settings_data.error}" \x1b[0m`);

            if(user_settings_data.error === 'Table does not exist') await db.post('/tables',userSettingsTableFormat);
        }
        else {

            const rows = user_settings_data;

            rows.forEach(function (dbSetting, index) {

                perUserData.set(dbSetting.id,dbSetting);

                perUserData.get(dbSetting.id).afk_options = new URLSearchParams(perUserData.get(dbSetting.id).afk_options);

                usersPendingUpdate.splice(usersPendingUpdate.indexOf(dbSetting.id), 1);

                utils.log(`Updated Settings for User ${dbSetting.id}`);
            });
        }

    } catch (error) {
        if(error.isAxiosError)
        {
            utils.log('Error Updating Pending Userss : ',error.data || error.message);
        }
        else
        {
            utils.log(error)
        }
    }

    setTimeout(updateUsers,dataUpdateInterval * 1000);
}

async function loadLevelingAndUserData(guildId) {

    try {
        const leveling_data_response = (await db.get(`/tables/guild_leveling_${guildId}/rows`)).data;

        if (leveling_data_response.error) {

            let levelingTable = Object.assign({}, guildLevelingTableFormat);;
            levelingTable.name += guildId;

            if(leveling_data_response.error === 'Table does not exist') await db.post(`/tables`, levelingTable);
        }
        else {
            // handle the leveling data recieved
            const rows = leveling_data_response;

            if (perGuildLeveling.get(guildId) === undefined) perGuildLeveling.set(guildId, { ranking : []});

            const levelingData = perGuildLeveling.get(guildId);

            const usersToTrack = [];

            rows.forEach(function (userLevelingData) {

                
                if (levelingData[userLevelingData.id] === undefined) levelingData[userLevelingData.id] = { level: 0, currentXp: 0 };

                levelingData[userLevelingData.id].level = userLevelingData.level;

                levelingData[userLevelingData.id].currentXp = userLevelingData.xp_current;

                levelingData.ranking.push(userLevelingData.id);

                usersToTrack.push(userLevelingData.id);
            })

            axios.post(`${process.env.SERVER_API}/notifications-user`,{ op: 'add' , data : usersToTrack, target : `${process.env.CLUSTER_API}/user-update`}).catch((error)=>utils.log('Error asking server to track user updates : ',error.message));

            if(levelingData.ranking)
            {
                levelingData.ranking.sort(function(userA,userB){
                    return  levelingData[userA].level < levelingData[userB].level;
                });
            }
        }
    } catch (error) {
        if(error.isAxiosError)
        {
            utils.log('Error making API request : ',error.data || error.message);
        }
        else
        {
            utils.log(error)
        }
    }


    try {

        const commands_data_response = (await db.get(`/tables/guild_commands_${guildId}/rows`)).data;

        if (commands_data_response.error) {

            let commandsTable = Object.assign({}, guildCommandsTableFormat);;
            commandsTable.name += guildId;

            if(commands_data_response.error === 'Table does not exist') await db.post(`/tables`, commandsTable);
        }
        else {
            // handle commands permission data here
        }
    } catch (error) {
        if(error.isAxiosError)
        {
            utils.log('Error making API request : ',error.data || error.message);
        }
        else
        {
            utils.log(error)
        }
    }
}

async function pushGuildToDatabase(guild_setting_data) {
    try {
        
    } catch (error) {
        if(error.isAxiosError)
        {
            utils.log('Error making API request : ',error.data || error.message);
        }
        else
        {
            utils.log(error)
        }
    }

    await loadLevelingAndUserData(guild_setting_data.id);
}

module.exports.joinedNewGuild = async function (guild) {

    const guildId = guild.id;

    const setting = {
        id: guildId,
        color: defaultPrimaryColor,
        prefix: defaultPrefix,
        nickname: defaultNickname,
        language: defaultLanguage,
        welcome_message: defaultWelcomeMessage,
        welcome_options: new URLSearchParams(),
        twitch_message: defaultTwitchMessage,
        twitch_options: new URLSearchParams(),
        leveling_message: defaultLevelingMessage,
        leveling_options: new URLSearchParams()
    }

    perGuildSettings.set(guildId, setting);

    const dbSetting = {
        id: guildId,
        color: defaultPrimaryColor,
        prefix: defaultPrefix,
        nickname: defaultNickname,
        language: defaultLanguage,
        welcome_message: defaultWelcomeMessage,
        welcome_options: '',
        twitch_message: defaultTwitchMessage,
        twitch_options: '',
        leveling_message: defaultLevelingMessage,
        leveling_options: ''
    }

    await pushGuildToDatabase(dbSetting);
}


module.exports.load = async function () {

    try {
        const user_settings_response = await db.get(`/tables?data=user_settings`);

        if(user_settings_response.data && !user_settings_response.data.length)
        {
            await db.post('/tables',userSettingsTableFormat).catch(error => utils.log(error.message));
        }
    } catch (error) {
        if(error.isAxiosError)
        {
            utils.log('Error making API request : ',error.data || error.message);
        }
        else
        {
            utils.log(error)
        }
    }

    guildsPendingUpdate.push.apply(guildsPendingUpdate,Array.from(bot.guilds.cache.keys()));

    axios.post(`${process.env.SERVER_API}/notifications-guild`,{ op: 'add' , data : guildsPendingUpdate, target : `${process.env.CLUSTER_API}/guild-update`}).catch((error)=>utils.log('Error asking server to track guild updates : ',error.message));;

    try {
        const guild_settings_response = await db.get(`/tables/guild_settings/rows?data=${guildsPendingUpdate.join(',')}`);

        const guild_settings_data = guild_settings_response.data;

        if (guild_settings_data.error) {
            utils.log(`Error Fetching Guild Settings "${guild_settings_data.error}" \x1b[0m`);

            if(guild_settings_data.error === 'Table does not exist') await db.post('/tables',guildSettingsTableFormat);
        }
        else {

            const promises = [];

            const rows = guild_settings_data;

            rows.forEach(function (dbSetting, index) {

                const setting = {
                    id: dbSetting.id,
                    color: dbSetting.color,
                    prefix: dbSetting.prefix,
                    nickname: dbSetting.nickname,
                    language: dbSetting.language,
                    welcome_message: dbSetting.welcome_message,
                    welcome_options: new URLSearchParams(dbSetting.welcome_options),
                    leave_message: dbSetting.leave_message,
                    leave_options: new URLSearchParams(dbSetting.leave_options),
                    twitch_message: dbSetting.twitch_message,
                    twitch_options: new URLSearchParams(dbSetting.twitch_options),
                    leveling_message: dbSetting.leveling_message,
                    leveling_options: new URLSearchParams(dbSetting.leveling_options)
                }

                perGuildSettings.set(setting.id, setting);

                guildsPendingUpdate.splice(guildsPendingUpdate.indexOf(setting.id), 1);

                promises.push(loadLevelingAndUserData(dbSetting.id));
            });

            await Promise.all(promises);
        }
    } catch (error) {
        if(error.isAxiosError)
        {
            utils.log('Error making API request : ',error.data || error.message);
        }
        else
        {
            utils.log(error)
        }
    }



    utils.log(`Guilds Not In Database [${guildsPendingUpdate}]`);

    const promises = [];
    const dataToPush = [];

    guildsPendingUpdate.forEach(function (guild, index) {

        const setting = {
            id: guild,
            color: defaultPrimaryColor,
            prefix: defaultPrefix,
            nickname: defaultNickname,
            language: defaultLanguage,
            welcome_message: defaultWelcomeMessage,
            welcome_options: new URLSearchParams(),
            leave_message: defaultLeaveMessage,
            leave_options: new URLSearchParams(),
            twitch_message: defaultTwitchMessage,
            twitch_options: new URLSearchParams(),
            leveling_message: defaultLevelingMessage,
            leveling_options: new URLSearchParams()
        }

        perGuildSettings.set(guild, setting);

        const dbSetting = {
            id: guild,
            color: defaultPrimaryColor,
            prefix: defaultPrefix,
            nickname: defaultNickname,
            language: defaultLanguage,
            welcome_message: defaultWelcomeMessage,
            welcome_options: '',
            leave_message: defaultLeaveMessage,
            leave_options: '',
            twitch_message: defaultTwitchMessage,
            twitch_options: '',
            leveling_message: defaultLevelingMessage,
            leveling_options: ''
        }

        dataToPush.push(dbSetting);
        promises.push(loadLevelingAndUserData(guild));
    });

    await db.post(`/tables/guild_settings/rows`, dataToPush).catch(error => utils.log(error.message));
    await Promise.all(promises);

    guildsPendingUpdate.splice(0,guildsPendingUpdate.length)

    // update guilds every 10 seconds
    setTimeout(updateGuilds,dataUpdateInterval * 1000);

    // update users every 10 seconds
    setTimeout(updateUsers,dataUpdateInterval * 1000);
}



utils.log('Guild data Module Loaded\x1b[0m');

if (modulesLastReloadTime.guildData !== undefined) {
    utils.log('Guild data Module Reloaded\x1b[0m');
}

if (bot) {
    modulesLastReloadTime.guildData = bot.uptime;
}