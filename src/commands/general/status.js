const { MessageEmbed } = require('discord.js');

const { sync, perGuildSettings, bot } = require(`${process.cwd()}/passthrough.js`);

const {version, defaultPrimaryColor} = sync.require(`${process.cwd()}/config.json`);

const osu = require('node-os-utils');

module.exports = {
    name: 'status',
    category: 'General',
    description: 'Get the bot status',
    ContextMenu: {},
    syntax : '{prefix}{name}',
    options: [],
    async execute(ctx) {
        
            const Embed = new MessageEmbed();
            Embed.setColor((ctx.member !== null) ? perGuildSettings.get(ctx.member.guild.id).color : defaultPrimaryColor);
            Embed.setTitle('Status');
            Embed.setURL(process.env.WEBSITE);

            let memory = await osu.mem.free();

            let cpu = await osu.cpu.usage();

            function pad(s) {
                return (s < 10 ? '0' : '') + s;
            }

            const seconds = bot.uptime / 1000;

            const secondsUp = parseInt(Math.floor(seconds % 60));

            const minutsUp = parseInt(Math.floor((seconds / 60) % 60 ));

            const hoursUp = parseInt(Math.floor((seconds / 3600) % 24));

            const daysUp = parseInt(Math.floor(seconds / 86400));

            Embed.addField(`Version`, `${version}`, false);
            Embed.addField(`Language`, `Node JS`, false);
            Embed.addField(`UP Time`, ` ${daysUp} Day${daysUp === 1 ? "" : "s"} ${pad(hoursUp)} Hr${hoursUp === 1 ? "" : "s"} ${pad(minutsUp)} Min ${pad(secondsUp)}Secs`, false);
            Embed.addField(`Guilds Count `, ` ${bot.guilds.cache.size}`, false);
            Embed.addField(`CPU Usage`, `${parseInt(cpu)}%`, false);
            Embed.addField(`Ram In Use`, `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`, false);

            reply(ctx,{ embeds: [Embed] });

    }
}