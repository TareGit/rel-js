const { MessageEmbed, MessageSelectMenu, MessageSelectOptionData, MessageActionRow, InteractionCollector } = require('discord.js');

const { bot, sync, perGuildData, commands } = require(`${process.cwd()}/passthrough.js`);
const { reply } = sync.require(`${process.cwd()}/utils.js`);
const { defaultPrimaryColor, defaultPrefix } = sync.require(`${process.cwd()}/config.json`);

module.exports = {
    name: 'help',
    category: 'General',
    description: 'shows help',
    ContextMenu: {},
    options: [
        {
            name: 'command',
            description: "The spec                                                                                                                                                                      ific command to get help on",
            type: 3,
            required: false
        }
    ],
    async execute(ctx) {

        const buildHelpEmbed = (Section) => {
            const fields = [];

            const prefix = (ctx.member !== null) ? perGuildData.get(ctx.member.guild.id).prefix : defaultPrefix;

            const helpEmbed = new MessageEmbed();
            helpEmbed.setColor((ctx.member !== null) ? perGuildData.get(ctx.member.guild.id).pColor : defaultPrimaryColor);
            helpEmbed.setTitle('Help For Commands\n');
            helpEmbed.setURL(process.env.WEBSITE);

            commands.forEach(function (value, key) {

                if (value.category === Section) {
                    let syntax = "";
                    syntax += `${prefix}${value.name} `;

                    value.options.forEach(function (option, index) {
                        syntax += ` <${option.name}> `;
                    });

                    syntax = `\`${syntax}\``;

                    helpEmbed.addField(key, `${value.description} \n Syntax: ${syntax} \n`, false);
                }

            })

            helpEmbed.setTimestamp()

            return helpEmbed;
        }

        const sections = ['General', 'Moderation', 'Music','Fun'];

        const options = [];

        sections.forEach(function (value, index) {
            const MenuOption = {};

            MenuOption.label = value;

            MenuOption.description = `View commands in the ${value} category`;

            MenuOption.value = value;

            MenuOption.default = index === 0;

            options.push(MenuOption);

        });

        const Menu = new MessageSelectMenu();
        Menu.setCustomId('help-command');
        Menu.setPlaceholder("Select a category");
        Menu.setOptions(options);

        const MenuRow = new MessageActionRow();
        MenuRow.addComponents(Menu);



        const message = await reply(ctx, { embeds: [buildHelpEmbed(sections[0])], components: [MenuRow] });

        if (message) {

            const helpCollector = new InteractionCollector(bot, { message: message, componentType: 'SELECT_MENU', idle: 15000 });
            helpCollector.resetTimer({ time: 15000 });
            helpCollector.generateEmbed = buildHelpEmbed;
            helpCollector.owner = (ctx.author !== null && ctx.author !== undefined) ? ctx.author.id : ctx.user.id;
            

            helpCollector.on('collect', async (selector) => {
                try {
                    if (selector.user.id !== helpCollector.owner) {
                        return reply(ctx, { ephemeral: true, content: "why must thou choose violence ?" });
                    }

                    const sections = ['General', 'Moderation', 'Music','Fun'];

                    const options = [];

                    sections.forEach(function (value, index) {
                        const MenuOption = {};

                        MenuOption.label = value;

                        MenuOption.description = `View commands in the ${value} category`;

                        MenuOption.value = value;

                        MenuOption.default = value === selector.values[0];

                        options.push(MenuOption);

                    });

                    const Menu = new MessageSelectMenu();
                    Menu.setCustomId('help-command');
                    Menu.setPlaceholder("Select a category");
                    Menu.setOptions(options);

                    const MenuRow = new MessageActionRow();
                    MenuRow.addComponents(Menu);

                    await selector.update({ embeds: [helpCollector.generateEmbed(selector.values[0])], components: [MenuRow] });
                } catch (error) {
                    console.log(error);
                }

            });

            helpCollector.on('end', (collected, reason) => {
                try {


                    helpCollector.options.message.fetch().then((message) => {
                        if (message) {

                            message.edit({ embeds: [message.embeds[0]], components: [] });
                        }
                    });
                } catch (error) {
                    console.log(error);
                }


            });

        }
    }
}