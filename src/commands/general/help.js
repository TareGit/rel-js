const { MessageEmbed } = require('discord.js');

const { sync, perGuildData, commands } = require(`${process.cwd()}/passthrough.js`);
const { reply } = sync.require(`${process.cwd()}/utils.js`);
const { defaultPrimaryColor, defaultPrefix } = sync.require(`${process.cwd()}/config.json`);

module.exports = {
    name: 'help',
    category: 'Main',
    description: 'shows help',
    ContextMenu: {},
    options: [
        {
            name: 'command',
            description: "The specific command to get help on",
            type: 3,
            required: false
        }
    ],
    async execute(ctx) {
        
            const fields = new Array();

            let prefix = '?';

            const helpEmbed = new MessageEmbed();
            helpEmbed.setColor((ctx.member !== null) ? perGuildData.get(ctx.member.guild.id).pColor : defaultPrimaryColor);
            helpEmbed.setTitle('Help For Commands\n');
            helpEmbed.setURL('https://www.oyintare.dev/');

            commands.forEach(function (value, key) {
                let syntax = "";
                syntax += `${(ctx.member !== null) ? perGuildData.get(ctx.member.guild.id).prefix : defaultPrefix}${value.name} `;

                value.options.forEach(function (option, index) {
                    syntax += ` <${option.name}> `;
                });

                syntax = `\`${syntax}\``;

                helpEmbed.addField(key, `${value.description} \n Syntax: ${syntax} \n`, false);
            })

            helpEmbed.setTimestamp()

            reply(ctx,{ embeds: [helpEmbed] });
    }
}