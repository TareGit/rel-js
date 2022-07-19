const { MessageEmbed } = require('discord.js');

const { sync, guildSettings, bot, queues } = require(`${process.cwd()}/dataBus.js`);

const { version, defaultPrimaryColor } = sync.require(path.join(process.cwd(), '../config.json'));

const utils = sync.require(`${process.cwd()}/utils`);

const osu = require('node-os-utils');

module.exports = {
    name: 'status',
    category: 'General',
    description: 'Get the bot status',
    ContextMenu: {},
    syntax: '{prefix}{name}',
    options: [],
    async execute(ctx) {

        const Embed = new MessageEmbed();
        Embed.setColor(ctx.command.member ? guildSettings.get((ctx.command.member as GuildMember).guild.id).color : defaultPrimaryColor);
        Embed.setTitle('Status');
        Embed.setURL(process.env.WEBSITE);

        let cpu = await osu.cpu.usage();

        function pad(s) {
            return (s < 10 ? '0' : '') + s;
        }

        const seconds = bot.uptime / 1000;

        const secondsUp = parseInt(Math.floor(seconds % 60));

        const minutsUp = parseInt(Math.floor((seconds / 60) % 60));

        const hoursUp = parseInt(Math.floor((seconds / 3600) % 24));

        const daysUp = parseInt(Math.floor(seconds / 86400));

        Embed.addField(`Uptime`, ` ${daysUp} Day${daysUp === 1 ? "" : "s"} ${pad(hoursUp)} Hr${hoursUp === 1 ? "" : "s"} ${pad(minutsUp)} Min ${pad(secondsUp)}Secs`, false);
        Embed.addField(`Cluster`, `${bot.cluster.id}`, true);
        Embed.addField(`Shard`, `${ctx.guild.shardId}`, true);
        Embed.addField(`Servers`, ` ${bot.guilds.cache.size}`, true);
        Embed.addField(`Players`, `${queues.size}`, true);
        Embed.addField(`CPU`, `${parseInt(cpu)}%`, true);
        Embed.addField(`RAM`, `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`, true);

        utils.reply(ctx, { embeds: [Embed] });

    }
}