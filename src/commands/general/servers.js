const { MessageEmbed } = require('discord.js');
const ps = require(`${process.cwd()}/passthrough`);
const osu = require('node-os-utils')

const {version, defaultPrimaryColor} = ps.sync.require(`${process.cwd()}/config.json`);

module.exports = {
    name: 'servers',
    category: 'Main',
    description: 'get all the servers the bot is on',
    ContextMenu: {},
    options: [],
    async execute(ctx) {
        
        const guilds = Array.from(ps.bot.guilds.cache.keys());

        const Embed = new MessageEmbed();
        Embed.setColor((ctx.member !== null) ? ps.perGuildData.get(ctx.member.guild.id).pColor : defaultPrimaryColor);
        Embed.setTitle('Servers');
        Embed.setURL('https://www.oyintare.dev/');

        console.log(ps.bot.guilds.cache);

        guilds.forEach(function (guildId, index) {
            const guild = ps.bot.guilds.cache.get(guildId);
            Embed.addField(guild.name, `Members ${guild.memberCount}`, false);
        });


        Embed.setTimestamp()

        await ctx.reply({ embeds: [Embed] });
        
    }
}