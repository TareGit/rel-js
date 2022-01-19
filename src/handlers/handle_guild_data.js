const EventEmitter = require("events");
const { log } = require("util");

const { sync, bot, db, perGuildSettings, modulesLastReloadTime, socket, perGuildLeveling } = require(`${process.cwd()}/passthrough.js`);
const { defaultPrefix, defaultPrimaryColor, defaultLanguage, defaultNickname, defaultWelcomeMessage, defaultTwitchMessage, defaultLevelingMessage, guildSettingsTableFormat, guildLevelingTableFormat, guildCommandsTableFormat, userSettingsTableFormat } = sync.require(`${process.cwd()}/config.json`);

const utils = sync.require(`${process.cwd()}/utils`);

async function loadLevelingAndUserData(guildId) {

    try {
        const leveling_data_response = (await db.get(`/tables/guild_leveling_${guildId}/rows`)).data;

        if (leveling_data_response.error) {

            let levelingTable = Object.assign({}, guildLevelingTableFormat);;
            levelingTable.name += guildId;

            await db.post(`/tables`, levelingTable);
        }
        else {
            // handle the leveling data recieved
            const rows = leveling_data_response.data;

            rows.forEach(function (userLevelingData) {

                if (perGuildLeveling.get(guildId) === undefined) perGuildLeveling.set(guildId, {});

                const levelingData = perGuildLeveling.get(guildId);

                if (levelingData[userLevelingData.userId] === undefined) levelingData[userLevelingData.userId] = { level: 0, currentXp: 0 };

                levelingData[userLevelingData.userId].level = userLevelingData.level;

                levelingData[userLevelingData.userId].currentXp = userLevelingData.xp_current;

            })
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

            await db.post(`/tables`, commandsTable);
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
        await db.post(`/tables/guild_settings/rows`, guild_setting_data);
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
        const user_settings_response = await db.get('/tables/user_settings');
        if(user_settings_response.data && user_settings_response.data.error)
        {
            utils.log('Creating user settings table as it does not exist.');

            await db.post('/tables',userSettingsTableFormat)

            utils.log('User settings table created');
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
    const guilds = Array.from(bot.guilds.cache.keys());

    let whereStatement = '';

    guilds.forEach(function (guild) {
        whereStatement += `id='${guild}'${guild !== guilds[guilds.length - 1] ? ' OR ' : ''}`;
    });

    const params = new URLSearchParams();

    params.append('where', whereStatement);

    try {
        const guild_settings_response = await db.get('/tables/guild_settings/rows',{ params : params});

        const guild_settings_data = guild_settings_response.data;

        if (guild_settings_data.error) {
            utils.log(`\x1b[31mError Fetching Guild Settings "${guild_settings_data.error}" \x1b[0m`);

            await db.post('/tables',guildSettingsTableFormat);
        }
        else {

            const promises = [];

            const rows = guild_settings_data.data;

            rows.forEach(function (dbSetting, index) {

                const setting = {
                    id: dbSetting.id,
                    color: dbSetting.color,
                    prefix: dbSetting.prefix,
                    nickname: dbSetting.nickname,
                    language: dbSetting.language,
                    welcome_message: dbSetting.welcome_message,
                    welcome_options: new URLSearchParams(dbSetting.welcome_options),
                    twitch_message: dbSetting.twitch_message,
                    twitch_options: new URLSearchParams(dbSetting.twitch_options),
                    leveling_message: dbSetting.leveling_message,
                    leveling_options: new URLSearchParams(dbSetting.leveling_options)
                }

                perGuildSettings.set(setting.id, setting);

                guilds.splice(guilds.indexOf(setting.id), 1);

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



    utils.log(`Guilds Not In Database [${guilds}]`);

    const promises = [];

    guilds.forEach(function (guild, index) {

        const setting = {
            id: guild,
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

        perGuildSettings.set(guild, setting);

        const dbSetting = {
            id: guild,
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

        promises.push(pushGuildToDatabase(dbSetting));
    });

    await Promise.all(promises);
}



utils.log('\x1b[32mGuild data Module Loaded\x1b[0m');

if (modulesLastReloadTime.guildData !== undefined) {
    utils.log('\x1b[32mGuild data Module Reloaded\x1b[0m');
}

if (bot) {
    modulesLastReloadTime.guildData = bot.uptime;
}