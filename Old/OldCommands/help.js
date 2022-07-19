import { MessageEmbed, MessageSelectMenu, MessageSelectOptionData, MessageActionRow, InteractionCollector, GuildMember } from 'discord.js';

const { bot, sync, guildSettings, commands } = require(`${process.cwd()}/dataBus.js`);
const { defaultPrimaryColor, defaultPrefix } = sync.require(path.join(process.cwd(), '../config.json'));

const utils = sync.require(`${process.cwd()}/utils`);

const result: IUmekoSlashCommand = {
    name: 'help',
    category: 'General',
    description: 'shows help',
    type: ECommandType.SLASH,
    syntax: '{prefix}{name} <specific command>',
    options: [
        {
            name: 'command',
            description: "The specific command to get help on",
            type: 3,
            required: false
        }
    ],
    async execute(ctx, targetCommand = '') {


        const specificCommand = targetCommand !== '' ? targetCommand : (ctx.type == EUmekoCommandContextType.SLASH_COMMAND ? (ctx.command as CommandInteraction).options.getString('command') : ctx.args[0]);


        if (commands.get(specificCommand)) {
            const command = commands.get(specificCommand);

            const prefix = ctx.command.member ? guildSettings.get((ctx.command.member as GuildMember).guild.id).prefix : defaultPrefix;

            const helpEmbed = new MessageEmbed();
            helpEmbed.setColor(ctx.command.member ? guildSettings.get((ctx.command.member as GuildMember).guild.id).color : defaultPrimaryColor);
            helpEmbed.setTitle(`Help For ${command.name}\n`);
            helpEmbed.setURL(`${process.env.WEBSITE}/commands?s=${command.name}`);

            let syntax = command.syntax;
            syntax = syntax.replace(/{prefix}/gi, `${prefix}`);
            syntax = syntax.replace(/{name}/gi, `${command.name}`);

            helpEmbed.setDescription(`Description: ${command.description} \n Syntax: \`${syntax}\``);
            helpEmbed.setTimestamp();

            return await utils.reply(ctx, { embeds: [helpEmbed], fetchReply: true });
        }

        const buildHelpEmbed = (Section) => {
            const fields = [];

            const prefix = ctx.command.member ? guildSettings.get((ctx.command.member as GuildMember).guild.id).prefix : defaultPrefix;

            const helpEmbed = new MessageEmbed();
            helpEmbed.setColor(ctx.command.member ? guildSettings.get((ctx.command.member as GuildMember).guild.id).color : defaultPrimaryColor);
            helpEmbed.setTitle('Help For Commands\n');
            helpEmbed.setURL(`${process.env.WEBSITE}/commands`);

            commands.forEach(function (value, key) {

                if (value.category === Section) {
                    if (key === value.name) {
                        let syntax = value.syntax;
                        syntax = syntax.replace(/{prefix}/gi, `${prefix}`);
                        syntax = syntax.replace(/{name}/gi, `${value.name}`);

                        helpEmbed.addField(key, `Syntax: \`${syntax}\``, false);
                    }
                }

            })

            helpEmbed.setTimestamp()

            return helpEmbed;
        }

        const sections = ['General', 'Moderation', 'Music', 'Fun'];

        const options = [];

        sections.forEach(function (value, index) {

            const MenuOption: MessageSelectOptionData = {
                label: value,
                value: value,
                description: `View commands in the ${value} category`,
                default: index === 0,
            };

            options.push(MenuOption);

        });

        const Menu = new MessageSelectMenu();
        Menu.setCustomId('help-command');
        Menu.setPlaceholder("Select a category");
        Menu.setOptions(options);

        const MenuRow = new MessageActionRow();
        MenuRow.addComponents(Menu);



        const message = await utils.reply(ctx, { embeds: [buildHelpEmbed(sections[0])], components: [MenuRow], fetchReply: true });

        if (message) {

            const helpCollector = new InteractionCollector(bot, { message: message, componentType: 'SELECT_MENU', idle: 15000 });
            helpCollector.resetTimer({ time: 15000 });
            helpCollector.generateEmbed = buildHelpEmbed;
            helpCollector.owner = (ctx.author !== null && ctx.author !== undefined) ? ctx.author.id : ctx.user.id;


            helpCollector.on('collect', async (selector) => {
                try {
                    if (selector.user.id !== helpCollector.owner) {
                        return utils.reply(ctx, { ephemeral: true, content: "why must thou choose violence ?" });
                    }

                    const sections = ['General', 'Moderation', 'Music', 'Fun'];

                    const options = [];

                    sections.forEach(function (value, index) {

                        console.log(selector);

                        const MenuOption: MessageSelectOptionData = {
                            label: value,
                            value: value,
                            description: `View commands in the ${value} category`,
                            default: value === selector.values[0],
                        };

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
                    utils.log(`Error In Help Message Collector\x1b[0m\n`, error);
                }

            });

            helpCollector.on('end', (collected, reason) => {
                try {

                    helpCollector.options.message.fetch().then((message) => {
                        if (message) {
                            message.components[0].components[0].disabled = true
                            message.edit({ embeds: [message.embeds[0]], components: message.components });
                        }
                    }).catch(utils.log);
                } catch (error) {
                    utils.log(`Error Ending Help Message Collector\x1b[0m\n`, error);
                }


            });

        }
    }
}

export default result;