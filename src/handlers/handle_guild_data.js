const EventEmitter = require("events");

const { sync, bot , db, perGuildData,modulesLastReloadTime} = require(`${process.cwd()}/passthrough.js`);
const { reply } = sync.require(`${process.cwd()}/utils.js`);
const { defaultPrefix, defaultPrimaryColor } = sync.require(`${process.cwd()}/config.json`);

const guilds = Array.from(bot.guilds.cache.keys());

async function pushRemainingKeysToDb() {

    console.log(`Guilds Not In Database [${guilds}]`)
    guilds.forEach(function (guild, index) {

        const query = 'INSERT INTO guild_settings (guild_id, data) VALUES(?,?)';
        const setting = {pColor : defaultPrimaryColor, prefix : defaultPrefix}

        const params = [guild, JSON.stringify(setting)];

        db.execute(query, params, { prepare: true });

        perGuildData.set(guild,setting);
    });
}

module.exports.joinedNewGuild = async function (guild) {

        const query = 'INSERT INTO guild_settings (guild_id, data) VALUES(?,?)';
        const setting = {pColor : defaultPrimaryColor, prefix : defaultPrefix}

        const params = [guild.id, JSON.stringify(setting)];

        db.execute(query, params, { prepare: true });

        perGuildData.set(guild.id,setting);
}


db.stream('SELECT * FROM guild_settings')
    .on('readable', function () {
        // 'readable' is emitted as soon a row is received and parsed
        let row;
        while (row = this.read()) {
            if (row.data && row.data !== "") {
                const settings = JSON.parse(row.data);
                perGuildData.set(row.guild_id,settings)
                guilds.splice(guilds.indexOf(row.guildId), 1);
            }
        }
    })
    .on('end', function () {
        pushRemainingKeysToDb()
    })
    .on('error', function (err) {
        console.log(err);
    });

    console.log('Guild data Module Online');

    if(modulesLastReloadTime.guildData !== undefined)
    {
        
    }
    
    modulesLastReloadTime.guildData = bot.uptime;


