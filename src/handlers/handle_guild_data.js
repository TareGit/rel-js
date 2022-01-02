const EventEmitter = require("events");

const { sync, bot, db, perGuildSettings, modulesLastReloadTime, socket, perGuildLeveling } = require(`${process.cwd()}/passthrough.js`);
const { defaultPrefix, defaultPrimaryColor, defaultLanguage, defaultNickname, defaultWelcomeMessage, defaultTwitchMessage, defaultLevelingMessage,guildSettingsTableFormat, guildLevelingTableFormat, guildCommandsTableFormat } = sync.require(`${process.cwd()}/config.json`);

const axios = require("axios");
const req = require("express/lib/request");
const { proc } = require("node-os-utils");

const guilds = Array.from(bot.guilds.cache.keys());

async function pushRemainingKeysToDb() {

    log(`Guilds Not In Database [${guilds}]`)

    const request = {
        headers: {
            'x-umeko-token': process.env.DB_TOKEN
        }
    }

    guilds.forEach(function (guild, index) {

        const setting = {
            id: guild,
            color: defaultPrimaryColor,
            prefix: defaultPrefix,
            nickname: defaultNickname,
            language: defaultLanguage,
            welcome_message: defaultWelcomeMessage,
            welcome_message_options: '',
            twitch_message: defaultTwitchMessage,
            twitch_message_options: '',
            leveling_message : defaultLevelingMessage,
            leveling_options : '',
            leveling_role_options : ''
        }

        perGuildSettings.set(guild, setting);
        axios.post(`${process.env.DB_API}/tables/guild_settings/rows`, setting, request).then((response) => {
            log(response.data);
        }).catch((error) => { });

    });

    const levelingModule = sync.require('./handle_leveling');
}

module.exports.joinedNewGuild = async function (guild) {

    const setting = {
        id: guild.id,
        color: defaultPrimaryColor,
        prefix: defaultPrefix,
        nickname: defaultNickname,
        language: defaultLanguage,
        welcome_message: defaultWelcomeMessage,
        welcome_message_options: '',
        twitch_message: defaultTwitchMessage,
        twitch_message_options: '',
        leveling_message: defaultLevelingMessage
    }

    perGuildSettings.set(guild.id, setting);

    axios.post(`${process.env.DB_API}/tables/guild_settings/rows`, setting, request).then((response) => {
        log(response.data);
    }).catch((error) => { });

    axios.get(`${process.env.DB_API}/tables/guild_leveling_${setting.id}/rows`, { headers: { 'x-umeko-token': process.env.DB_TOKEN } }).then((levelingResponse) => {
        if (levelingResponse.data.error) {
            axios.post(`${process.env.DB_API}/tables`, levelingTable, { headers: { 'x-umeko-token': process.env.DB_TOKEN } }).then((levelingCreateResponse) => {
            }).catch((error) => { });
        }
        else {
            levelingResponse.data.data.forEach(function (userLevelingData) {

                if (perGuildLeveling.get(setting.id) === undefined) perGuildLeveling.set(setting.id, {});

                const levelingData = perGuildLeveling.get(setting.id);

                if (levelingData[userLevelingData.userId] === undefined) levelingData[userLevelingData.userId] = { level: 0, currentXp: 0 };

                levelingData[userLevelingData.userId].level = userLevelingData.level;
                levelingData[userLevelingData.userId].currentXp = userLevelingData.xp_current;

            })
        }
    }).catch((error) => { });

    let commandsTable = Object.assign({}, guildCommandsTableFormat);;
    commandsTable.name += setting.id;

    axios.get(`${process.env.DB_API}/tables/guild_commands_${setting.id}/rows`, { headers: { 'x-umeko-token': process.env.DB_TOKEN } }).then((commandsResponse) => {
        if (commandsResponse.data.error) {

            axios.post(`${process.env.DB_API}/tables`, commandsTable, { headers: { 'x-umeko-token': process.env.DB_TOKEN } }).then((commandsCreateResponse) => {
                log(commandsCreateResponse.data)
            }).catch((error) => { });
        }
        else {
            log(commandsResponse.data)
        }
    }).catch((error) => { });


    if (socket !== undefined) {
        socket.emit('identify', { id: 'Umeko', guilds: Array.from(bot.guilds.cache.keys()) });
    }


}

if (modulesLastReloadTime.guildData !== undefined) {
    log('\x1b[32mGuild data Module Reloaded\x1b[0m');

}
else {
    let whereStatement = ''

    guilds.forEach(function (guild) {

        whereStatement += `id='${guild}'${guild !== guilds[guilds.length - 1] ? ' OR ' : ''}`;
    });

    whereStatement += ''
    const params = new URLSearchParams();
    params.append('where', whereStatement)
    const request = {
        headers: {
            'x-umeko-token': process.env.DB_TOKEN
        },

        params: params
    }


    const data = axios.get(`${process.env.DB_API}/tables/guild_settings/rows`, request).then((response) => {
        const data = response.data;

        if (data.error) {
            log(`\x1b[31mError Fetching Guild Settings "${data.error}" \x1b[0m`);
            axios.post(`${process.env.DB_API}/tables`, guildSettingsTableFormat, { headers: { 'x-umeko-token': process.env.DB_TOKEN } }).then((settingsCreateResponse) => {
                log(settingsCreateResponse.data)
            }).catch((error) => { });
        }
        else {
            if (data.data) {
                data.data.forEach(function (setting, index) {
                    perGuildSettings.set(setting.id, setting);
                    guilds.splice(guilds.indexOf(setting.id), 1);

                    let levelingTable = Object.assign({}, guildLevelingTableFormat);;
                    levelingTable.name += setting.id;

                    axios.get(`${process.env.DB_API}/tables/guild_leveling_${setting.id}/rows`, { headers: { 'x-umeko-token': process.env.DB_TOKEN } }).then((levelingResponse) => {
                        if (levelingResponse.data.error) {
                            axios.post(`${process.env.DB_API}/tables`, levelingTable, { headers: { 'x-umeko-token': process.env.DB_TOKEN } }).then((levelingCreateResponse) => {
                            }).catch((error) => { });
                        }
                        else {
                            levelingResponse.data.data.forEach(function (userLevelingData) {

                                if (perGuildLeveling.get(setting.id) === undefined) perGuildLeveling.set(setting.id, {});

                                const levelingData = perGuildLeveling.get(setting.id);

                                if (levelingData[userLevelingData.userId] === undefined) levelingData[userLevelingData.userId] = { level: 0, currentXp: 0 };

                                levelingData[userLevelingData.userId].level = userLevelingData.level;
                                levelingData[userLevelingData.userId].currentXp = userLevelingData.xp_current;

                            })
                        }
                    }).catch((error) => { });

                    let commandsTable = Object.assign({}, guildCommandsTableFormat);;
                    commandsTable.name += setting.id;

                    axios.get(`${process.env.DB_API}/tables/guild_commands_${setting.id}/rows`, { headers: { 'x-umeko-token': process.env.DB_TOKEN } }).then((commandsResponse) => {
                        if (commandsResponse.data.error) {

                            axios.post(`${process.env.DB_API}/tables`, commandsTable, { headers: { 'x-umeko-token': process.env.DB_TOKEN } }).then((commandsCreateResponse) => {
                                log(commandsCreateResponse.data)
                            }).catch((error) => { });
                        }
                        else {
                            log(commandsResponse.data)
                        }
                    }).catch((error) => { });
                })
            }
        }

        pushRemainingKeysToDb();

    }).catch((error) => {

        pushRemainingKeysToDb();
    });
    log('\x1b[32mGuild data Module Loaded\x1b[0m');
}

if(bot)
{
    modulesLastReloadTime.guildData = bot.uptime;
}



