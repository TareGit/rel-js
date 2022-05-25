const { MessageEmbed } = require('discord.js');

const { sync, guildSettings, bot } = require(`${process.cwd()}/dataBus.js`);

const { version, defaultPrimaryColor } = sync.require(`${process.cwd()}/config.json`);

const utils = sync.require(`${process.cwd()}/utils`);


module.exports = {
    name: 'links',
    category: 'General',
    description: 'A list of usefull links',
    ContextMenu: {},
    syntax: '{prefix}{name}',
    options: [],
    async execute(ctx) {


        const Embed = new MessageEmbed();
        Embed.setColor(ctx.command.member ? guildSettings.get((ctx.command.member as GuildMember).guild.id).color : defaultPrimaryColor);
        Embed.setTitle('Links');
        Embed.setURL(process.env.WEBSITE);

        Embed.addField("Dashboard", process.env.WEBSITE, false);
        Embed.addField("Support Server", "https://discord.gg/qx7eUVwTGY", false);

        Embed.setTimestamp();

        utils.reply(ctx, { embeds: [Embed] });

    }
}