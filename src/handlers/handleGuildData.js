const { default: axios } = require("axios");
const EventEmitter = require("events");

const { sync, bot, db, perGuildSettings, perUserData, modulesLastReloadTime, socket, perGuildLeveling, guildsPendingUpdate, usersPendingUpdate, intervals } = require(`${process.cwd()}/dataBus.js`);
const { dataUpdateInterval, defaultPrefix, defaultPrimaryColor, defaultLanguage, defaultNickname, defaultWelcomeMessage, defaultLeaveMessage, defaultTwitchMessage, defaultLevelingMessage, guildSettingsTableFormat, guildLevelingTableFormat, guildCommandsTableFormat, userSettingsTableFormat } = sync.require(`${process.cwd()}/config.json`);

const utils = sync.require(`${process.cwd()}/utils`);

function getDefaultGuildSettings(guildId) {
    const defaultSetting = {
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

    return defaultSetting;
}

function convertFromDbSetting(setting) {
    const newSetting = {
        id: setting.id,
        color: setting.color,
        prefix: setting.prefix,
        nickname: setting.nickname,
        language: setting.language,
        welcome_message: setting.welcome_message,
        welcome_options: new URLSearchParams(setting.welcome_options),
        leave_message: setting.leave_message,
        leave_options: new URLSearchParams(setting.leave_options),
        twitch_message: setting.twitch_message,
        twitch_options: new URLSearchParams(setting.twitch_options),
        leveling_message: setting.leveling_message,
        leveling_options: new URLSearchParams(setting.leveling_options)
    }

    return newSetting;
}

function convertToDbSetting(setting) {
    const newSetting = {
        id: setting.id,
        color: setting.color,
        prefix: setting.prefix,
        nickname: setting.nickname,
        language: setting.language,
        welcome_message: setting.welcome_message,
        welcome_options: setting.welcome_options.toString(),
        leave_message: dbSetting.leave_message,
        leave_options: setting.leave_options.toString(),
        twitch_message: dbSetting.twitch_message,
        twitch_options: setting.twitch_options.toString(),
        leveling_message: dbSetting.leveling_message,
        leveling_options: setting.leveling_options.toString()
    }

    return newSetting;
}

function logPossibleAxiosError(error) {
    if (error.isAxiosError) {
        utils.log('Error making API request : ', error.data || error.message);
    }
    else {
        utils.log(error)
    }
}

async function updateGuilds() {
    if (!guildsPendingUpdate.length) {
        setTimeout(updateGuilds, dataUpdateInterval * 1000);
        return;
    }


    try {
        const guild_settings_response = await db.get(`/tables/guild_settings/rows?data=${guildsPendingUpdate.join(',')}`);

        const guild_settings_data = guild_settings_response.data;

        if (guild_settings_data.error) {
            utils.log(`Error Updating Pending Guilds : "${guild_settings_data.error}" \x1b[0m`);

            if (guild_settings_data.error === 'Table does not exist') await db.post('/tables', [guildSettingsTableFormat]);
        }
        else {

            const rows = guild_settings_data;

            rows.forEach(function (dbSetting, index) {


                const setting = convertFromDbSetting(dbSetting);

                perGuildSettings.set(setting.id, setting);

                if (bot.guilds.cache.get(dbSetting.id).me.displayName !== dbSetting.nickname) {
                    const me = bot.guilds.cache.get(dbSetting.id).me;

                    if (me.permissions.has('CHANGE_NICKNAME')) {
                        me.setNickname(dbSetting.nickname, 'Dashboard nickname changed.');
                    }
                }

                guildsPendingUpdate.splice(guildsPendingUpdate.indexOf(setting.id), 1);

                utils.log(`Updated Settings for Guild ${setting.id}`);
            });
        }

    } catch (error) {
        logPossibleAxiosError(error);
    }

    setTimeout(updateGuilds, dataUpdateInterval * 1000);
}

async function updateUsers() {
    if (!usersPendingUpdate.length) {
        setTimeout(updateUsers, dataUpdateInterval * 1000);
        return;
    }

    try {
        const user_settings_response = await db.get(`/tables/user_settings/rows?data=${usersPendingUpdate.join(',')}`);

        const user_settings_data = user_settings_response.data;

        if (user_settings_data.error) {
            utils.log(`Error Updating Pending Users : "${user_settings_data.error}" \x1b[0m`);

            if (user_settings_data.error === 'Table does not exist') await db.post('/tables', [userSettingsTableFormat]);
        }
        else {

            const rows = user_settings_data;

            rows.forEach(function (dbSetting, index) {

                perUserData.set(dbSetting.id, dbSetting);

                perUserData.get(dbSetting.id).afk_options = new URLSearchParams(perUserData.get(dbSetting.id).afk_options);

                usersPendingUpdate.splice(usersPendingUpdate.indexOf(dbSetting.id), 1);

                utils.log(`Updated Settings for User ${dbSetting.id}`);
            });
        }

    } catch (error) {
        logPossibleAxiosError(error);
    }

    setTimeout(updateUsers, dataUpdateInterval * 1000);
}

async function loadLevelingAndUserData(guildId) {

    try {
        const leveling_data_response = (await db.get(`/tables/guild_leveling_${guildId}/rows`));

        if (leveling_data_response.data.error) {

            let levelingTable = Object.assign({}, guildLevelingTableFormat);;

            levelingTable.name += guildId;

            if (leveling_data_response.data.error === 'Table does not exist') await db.post(`/tables`, [levelingTable]);
        }
        else {
            // handle the leveling data recieved
            const rows = leveling_data_response.data;

            if (perGuildLeveling.get(guildId) === undefined) perGuildLeveling.set(guildId, { ranking: [] });

            const levelingData = perGuildLeveling.get(guildId);

            const usersToTrack = [];

            rows.forEach(function (userLevelingData) {

                if (levelingData[userLevelingData.id] === undefined) levelingData[userLevelingData.id] = { level: 0, currentXp: 0 };

                levelingData[userLevelingData.id].level = userLevelingData.level;

                levelingData[userLevelingData.id].currentXp = userLevelingData.xp_current;

                levelingData.ranking.push(userLevelingData.id);

                usersToTrack.push(userLevelingData.id);
            })

            axios.post(`${process.env.SERVER_API}/notifications-user`, { op: 'add', data: usersToTrack, target: `${process.env.CLUSTER_API}` }).catch((error) => utils.log('Error asking server to track user updates : ', error.message));

            if (levelingData.ranking) {
                levelingData.ranking.sort(function (userA, userB) {
                    return (levelingData[userA].currentXp + utils.getTotalXp(levelingData[userA].currentXp)) < (levelingData[userB].currentXp + utils.getTotalXp(levelingData[userB].currentXp));
                });
            }
        }
    } catch (error) {
        if (error.isAxiosError) {
            utils.log('Error making API request : ', error.data || error.message);
        }
        else {
            utils.log(error)
        }
    }
}

async function postSettingsToDatabase(dbSetting) {
    try {
        await db.post('/tables/guild_settings/rows', [dbSetting]);
    } catch (error) {
        logPossibleAxiosError(error);
    }

    await loadLevelingAndUserData(guild_setting_data.id);
}

async function onJoinedNewGuild(guild) {
    const guildId = guild.id;

    const settings = getDefaultGuildSettings(guildId);

    perGuildSettings.set(guildId, settings);

    await postSettingsToDatabase(convertToDbSetting(settings));
}

async function load() {

    try {
        const user_settings_response = await db.get(`/tables?data=user_settings`);

        if (user_settings_response.data && !user_settings_response.data.length) {
            await db.post('/tables', [userSettingsTableFormat]).catch(error => utils.log(error.message));
        }
    } catch (error) {
        logPossibleAxiosError(error);
    }

    guildsPendingUpdate.push.apply(guildsPendingUpdate, Array.from(bot.guilds.cache.keys()));

    axios.post(`${process.env.SERVER_API}/notifications-guild`, { op: 'add', data: guildsPendingUpdate, target: `${process.env.CLUSTER_API}` }).catch((error) => utils.log('Error asking server to track guild updates : ', error.message));;

    try {
        const guild_settings_response = await db.get(`/tables/guild_settings/rows?data=${guildsPendingUpdate.join(',')}`);

        const guild_settings_data = guild_settings_response.data;

        if (guild_settings_data.error) {
            utils.log(`Error Fetching Guild Settings "${guild_settings_data.error}" \x1b[0m`);

            if (guild_settings_data.error === 'Table does not exist') await db.post('/tables', [guildSettingsTableFormat]);
        }
        else {
            utils.log(guildsPendingUpdate.length, 'Guilds to fetch');

            const promises = [];

            const rows = guild_settings_data;

            rows.forEach(function (dbSetting, index) {

                const setting = convertFromDbSetting(dbSetting);

                perGuildSettings.set(setting.id, setting);

                guildsPendingUpdate.splice(guildsPendingUpdate.indexOf(setting.id), 1);

                promises.push(loadLevelingAndUserData(dbSetting.id));

                if (bot.guilds.cache.get(dbSetting.id).me.displayName !== dbSetting.nickname) {
                    const me = bot.guilds.cache.get(dbSetting.id).me;
                    if (me.permissions.has('CHANGE_NICKNAME')) {
                        me.setNickname(dbSetting.nickname, 'Dashboard nickname changed.');
                    }
                }

                guildsPendingUpdate.splice(guildsPendingUpdate.indexOf(setting.id), 1);

            });

            utils.log('Recieved', rows.length, 'Settings from database')

            await Promise.all(promises);
        }
    } catch (error) {
        logPossibleAxiosError(error);
    }

    utils.log(`Guilds Not In Database [${guildsPendingUpdate}]`);

    const promises = [];
    const settingsToPush = [];

    guildsPendingUpdate.forEach(function (guildId, index) {

        const setting = getDefaultGuildSettings(guildId);

        perGuildSettings.set(guildId, setting);

        settingsToPush.push(convertToDbSetting(setting));

        promises.push(loadLevelingAndUserData(guildId));
    });

    await db.post(`/tables/guild_settings/rows`, settingsToPush).catch(logPossibleAxiosError);

    await Promise.all(promises);

    guildsPendingUpdate.splice(0, guildsPendingUpdate.length)

    // update guilds every 10 seconds
    setTimeout(updateGuilds, dataUpdateInterval * 1000);

    // update users every 10 seconds
    setTimeout(updateUsers, dataUpdateInterval * 1000);
}



utils.log('Guild data Module Loaded\x1b[0m');

if (modulesLastReloadTime.guildData !== undefined) {
    utils.log('Guild data Module Reloaded\x1b[0m');
}

if (bot) {
    modulesLastReloadTime.guildData = bot.uptime;
}

module.exports = {
    onJoinedNewGuild: onJoinedNewGuild,
    load: load
}