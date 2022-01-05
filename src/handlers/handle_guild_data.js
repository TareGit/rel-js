const EventEmitter = require("events");

const { sync, bot, db, perGuildSettings, modulesLastReloadTime, socket, perGuildLeveling } = require(`${process.cwd()}/passthrough.js`);
const { defaultPrefix, defaultPrimaryColor, defaultLanguage, defaultNickname, defaultWelcomeMessage, defaultTwitchMessage, defaultLevelingMessage, guildSettingsTableFormat, guildLevelingTableFormat, guildCommandsTableFormat } = sync.require(`${process.cwd()}/config.json`);

const utils = sync.require(`${process.cwd()}/utils`);

const axios = require("axios");

async function loadLevelingAndUserData(guildId) {

    try {
        const leveling_data_response = (await axios.get(`${process.env.DB_API}/tables/guild_leveling_${guildId}/rows`, { headers: { 'x-umeko-token': process.env.DB_API_TOKEN } })).data;

        if (leveling_data_response.error) {

            let levelingTable = Object.assign({}, guildLevelingTableFormat);;
            levelingTable.name += guildId;

            await axios.post(`${process.env.DB_API}/tables`, levelingTable, { headers: { 'x-umeko-token': process.env.DB_API_TOKEN } });
        }
        else {

            utils.log(leveling_data_response)

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

        const commands_data_response = (await axios.get(`${process.env.DB_API}/tables/guild_commands_${guildId}/rows`, { headers: { 'x-umeko-token': process.env.DB_API_TOKEN } })).data;

        if (commands_data_response.error) {

            let commandsTable = Object.assign({}, guildCommandsTableFormat);;
            commandsTable.name += guildId;

            await axios.post(`${process.env.DB_API}/tables`, commandsTable, { headers: { 'x-umeko-token': process.env.DB_API_TOKEN } });
        }
        else {
            utils.log(commands_data_response)
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
        await axios.post(`${process.env.DB_API}/tables/guild_settings/rows`, guild_setting_data,{headers: {'x-umeko-token': process.env.DB_API_TOKEN}})
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

    const guilds = Array.from(bot.guilds.cache.keys());

    let whereStatement = '';

    guilds.forEach(function (guild) {
        whereStatement += `id='${guild}'${guild !== guilds[guilds.length - 1] ? ' OR ' : ''}`;
    });

    const params = new URLSearchParams();

    params.append('where', whereStatement);

    const request = {
        headers: {
            'x-umeko-token': process.env.DB_API_TOKEN
        },

        params: params
    }

    try {
        const guild_settings_response = await axios.get(`${process.env.DB_API}/tables/guild_settings/rows`, request);

        const guild_settings_data = guild_settings_response.data;

        if (guild_settings_data.error) {
            utils.log(`\x1b[31mError Fetching Guild Settings "${guild_settings_data.error}" \x1b[0m`);

            await axios.post(`${process.env.DB_API}/tables`, guildSettingsTableFormat, { headers: { 'x-umeko-token': process.env.DB_API_TOKEN } })
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