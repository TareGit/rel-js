const { MessageEmbed } = require('discord.js');
const ps = require(`${process.cwd()}/passthrough`);
const osu = require('node-os-utils')

const {version, defaultPrimaryColor} = ps.sync.require(`${process.cwd()}/config.json`);

module.exports = {
    name: 'status',
    category: 'Main',
    description: 'get the ps.bot status',
    ContextMenu: {},
    options: [],
    async execute(ctx) {
        
            const Embed = new MessageEmbed();
            Embed.setColor((ctx.member !== null) ? ps.perGuildData.get(ctx.member.guild.id).pColor : defaultPrimaryColor);
            Embed.setTitle('Status');
            Embed.setURL('https://www.oyintare.dev/');

            let memory = await osu.mem.free();

            let cpu = await osu.cpu.usage();

            function pad(s) {
                return (s < 10 ? '0' : '') + s;
            }

            const seconds = process.uptime();

            const secondsUp = parseInt(Math.floor(seconds % 60));

            const minutsUp = parseInt(Math.floor(seconds % (60 * 60) / 60));

            const hoursUp = parseInt(Math.floor(seconds / (60 * 60)));

            Embed.addField(`Version`, `${version}`, false);
            Embed.addField(`Language`, `Node JS`, false);
            Embed.addField(`UP Time`, ` ${pad(hoursUp)}Hrs ${pad(minutsUp)}Min ${pad(secondsUp)}Secs`, false);
            Embed.addField(`Guilds Count `, ` ${ps.bot.guilds.cache.size}`, false);
            Embed.addField(`CPU Usage`, `${parseInt(cpu)}%`, false);
            Embed.addField(`RAM Usage`, `${parseInt((memory.freeMemMb / memory.totalMemMb) * 100)}%`, false);

            ctx.reply({ embeds: [Embed] });

        


    }
}