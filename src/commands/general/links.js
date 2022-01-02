const { MessageEmbed } = require('discord.js');

const { sync, perGuildSettings, bot } = require(`${process.cwd()}/passthrough.js`);

const {version, defaultPrimaryColor} = sync.require(`${process.cwd()}/config.json`);



module.exports = {
    name: 'links',
    category: 'General',
    description: 'A list of usefull links',
    ContextMenu: {},
    syntax : '{prefix}{name}',
    options: [],
    async execute(ctx) {
        

        const Embed = new MessageEmbed();
        Embed.setColor((ctx.member !== null) ? perGuildSettings.get(ctx.member.guild.id).color : defaultPrimaryColor);
        Embed.setTitle('Links');
        Embed.setURL(process.env.WEBSITE);

        Embed.addField("Website", process.env.WEBSITE , false);
        Embed.addField("Support Server","https://discord.gg/qx7eUVwTGY", false);

        Embed.setTimestamp();

        reply(ctx, { embeds: [Embed] });
        
    }
}