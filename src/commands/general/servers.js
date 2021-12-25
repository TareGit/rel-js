const { MessageEmbed } = require('discord.js');

const { sync, perGuildData, bot } = require(`${process.cwd()}/passthrough.js`);
const { reply } = sync.require(`${process.cwd()}/utils.js`);
const {version, defaultPrimaryColor} = sync.require(`${process.cwd()}/config.json`);



module.exports = {
    name: 'servers',
    category: 'General',
    description: 'get all the servers the bot is on',
    ContextMenu: {},
    options: [],
    async execute(ctx) {
        
        const guilds = Array.from(bot.guilds.cache.keys());

        const Embed = new MessageEmbed();
        Embed.setColor((ctx.member !== null) ? perGuildData.get(ctx.member.guild.id).color : defaultPrimaryColor);
        Embed.setTitle('Servers');
        Embed.setURL(process.env.WEBSITE);

        console.log(bot.guilds.cache);

        guilds.forEach(function (guildId, index) {
            const guild = bot.guilds.cache.get(guildId);
            Embed.addField(guild.name, `Members ${guild.memberCount}`, false);
        });


        Embed.setTimestamp();

        reply(ctx, { embeds: [Embed] });
        
    }
}