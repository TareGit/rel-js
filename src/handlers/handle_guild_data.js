const EventEmitter = require("events");
const ps = require(`${process.cwd()}/passthrough`);


const { defaultPrefix, defaultPrimaryColor } = ps.sync.require(`${process.cwd()}/config.json`);

const bot = ps.bot;
const guilds = Array.from(bot.guilds.cache.keys());

async function pushRemainingKeysToDb() {

    console.log(`Guilds Not In Database [${guilds}]`)
    guilds.forEach(function (guild, index) {

        const query = 'INSERT INTO guilds (guild_id, prefix, primary_color) VALUES(?,?,?)';
        const params = [guild, defaultPrefix, defaultPrimaryColor];

        ps.db.execute(query, params, { prepare: true });

        ps.prefixes.set(guild, defaultPrefix);
        ps.pColors.set(guild, defaultPrimaryColor);
    });
}


ps.db.stream('SELECT * FROM guilds')
    .on('readable', function () {
        // 'readable' is emitted as soon a row is received and parsed
        let row;
        while (row = this.read()) {
            if (row.guild_id) {
                ps.prefixes.set(row.guild_id, row.prefix);
                ps.pColors.set(row.guild_id, row.primary_color);
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

console.log('Guilddata Module Online');
