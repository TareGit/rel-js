const { MessageEmbed } = require('discord.js');

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
    async execute(bot, ctx, isInteraction) {
        const fields = new Array();

        let prefix = '?';

        const helpEmbed = new MessageEmbed();
        helpEmbed.setColor('#0099ff');
        helpEmbed.setTitle('Help For Commands\n');
        helpEmbed.setURL('https://www.oyintare.dev/');

        bot.commands.forEach(function (value, key) {
            let syntax = "";
            syntax += `${prefix}${value.name} `;

            value.options.forEach(function (option, index) {
                syntax += ` <${option.name}> `;
            });

            syntax = `\`${syntax}\``;

            helpEmbed.addField(key, `${value.description} \n Syntax: ${syntax} \n`, false);
        })

        helpEmbed.setTimestamp()

        await ctx.reply({ embeds: [helpEmbed] });
    }
}