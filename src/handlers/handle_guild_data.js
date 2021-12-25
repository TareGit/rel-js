const EventEmitter = require("events");

const { sync, bot, db, perGuildData, modulesLastReloadTime, socket } = require(`${process.cwd()}/passthrough.js`);
const { reply, logError } = sync.require(`${process.cwd()}/utils.js`);
const { defaultPrefix, defaultPrimaryColor, defaultLanguage, defaultNickname, defaultWelcomeMessage } = sync.require(`${process.cwd()}/config.json`);

const axios = require("axios");

const guilds = Array.from(bot.guilds.cache.keys());

async function pushRemainingKeysToDb() {

    console.log(`Guilds Not In Database [${guilds}]`)

    guilds.forEach(function (guild, index) {

        const setting = {
            id: guild,
            color: defaultPrimaryColor,
            prefix: defaultPrefix,
            language: defaultLanguage,
            nickname: defaultNickname,
            welcome_message: defaultWelcomeMessage
        }

        perGuildData.set(guild, setting);

        const request = {
            headers: {
                'x-cassandra-token': `${process.env.ASTRA_DB_TOKEN}`
            }
        };

        axios.post(`https://${process.env.ASTRA_DB_ID}-${process.env.ASTRA_DB_REGION}.apps.astra.datastax.com/api/rest/v2/keyspaces/${process.env.ASTRA_DB_KEYSPACE}/settings`, setting, request)
            .then((response) => console.log(response.data))
            .catch(console.log)
    });
}

module.exports.joinedNewGuild = async function (guild) {

    const setting = {
        id: guild,
        color: defaultPrimaryColor,
        prefix: defaultPrefix,
        language: defaultLanguage,
        nickname: defaultNickname,
        welcome_message: defaultWelcomeMessage
    }

    perGuildData.set(guild, setting);

    const request = {
        headers: {
            'x-cassandra-token': `${process.env.ASTRA_DB_TOKEN}`
        }
    };

    axios.post(`https://${process.env.ASTRA_DB_ID}-${process.env.ASTRA_DB_REGION}.apps.astra.datastax.com/api/rest/v2/keyspaces/${process.env.ASTRA_DB_KEYSPACE}/settings`, setting, request)
        .then((response) => console.log(response.data))
        .catch(console.log)

    if (socket !== undefined) {
        socket.emit('identify', { id: 'Umeko', guilds: Array.from(bot.guilds.cache.keys()) });
    }


}

const request = {
    headers: {
        'x-cassandra-token': `${process.env.ASTRA_DB_TOKEN}`
    }
};

let guildsToQuery = '['

guilds.forEach(function (guild) {

    guildsToQuery += `"${guild}"${guild !== guilds[guilds.length - 1] ? ',' : ''}`;
});

guildsToQuery += ']'

axios.get(`https://${process.env.ASTRA_DB_ID}-${process.env.ASTRA_DB_REGION}.apps.astra.datastax.com/api/rest/v2/keyspaces/${process.env.ASTRA_DB_KEYSPACE}/settings?where={ "id" : {  "$in" : ${guildsToQuery}}}`, request)
    .then((response) => {
        if(response.data.data)
        {
            const savedData = response.data.data;

            savedData.forEach(function (data) {
                guilds.splice(guilds.indexOf(data.id))
                perGuildData.set(data.id, data);
            });
        }
        pushRemainingKeysToDb();
    })
    .catch(console.log);

console.log('\x1b[32mGuild data Module Online\x1b[0m');

if (modulesLastReloadTime.guildData !== undefined) {

}

modulesLastReloadTime.guildData = bot.uptime;


