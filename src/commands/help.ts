import { MessageEmbed, MessageSelectMenu, MessageSelectOptionData, MessageActionRow, InteractionCollector, GuildMember, CommandInteraction, ColorResolvable, SelectMenuInteraction, Message } from 'discord.js';
import path from 'path';
import { IUmekoSlashCommand, ECommandType, EUmekoCommandContextType, IParsedMessage, ECommandOptionType } from '../types';

const { defaultPrimaryColor, defaultPrefix } = bus.sync.require(
    path.join(process.cwd(), "config.json")
) as typeof import("../config.json");

const utils = bus.sync.require(
    path.join(process.cwd(), "utils")
) as typeof import("../utils");

const command: IUmekoSlashCommand = {
    name: 'help',
    category: 'General',
    description: 'shows help',
    type: ECommandType.SLASH,
    dependencies: ['utils'],
    syntax: '{prefix}{name} <specific command>',
    options: [
        {
            name: 'command',
            description: "The specific command to get help on",
            type: ECommandOptionType.STRING,
            required: false
        }
    ],
    async execute(ctx, targetCommand: string = '') {


        const specificCommand = targetCommand !== '' ? targetCommand : (ctx.type == EUmekoCommandContextType.SLASH_COMMAND ? (ctx.command as CommandInteraction).options.getString('command')! : (ctx.command as IParsedMessage).args[0]);


        if (bus.slashCommands.get(specificCommand)) {
            const command = bus.slashCommands.get(specificCommand)!;

            const prefix = bus.guildSettings.get(ctx.command.guild?.id || '')?.prefix || defaultPrefix;

            const helpEmbed = new MessageEmbed();
            helpEmbed.setColor((bus.guildSettings.get(ctx.command.guild?.id || '')?.color || defaultPrimaryColor) as ColorResolvable);
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

            const prefix = bus.guildSettings.get(ctx.command.guild?.id || '')?.prefix || defaultPrefix;

            const helpEmbed = new MessageEmbed();
            helpEmbed.setColor((bus.guildSettings.get(ctx.command.guild?.id || '')?.color || defaultPrimaryColor) as ColorResolvable);
            helpEmbed.setTitle('Help For Commands\n');
            helpEmbed.setURL(`${process.env.WEBSITE}/commands`);

            bus.slashCommands.forEach(function (value, key) {

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

        const options = sections.map(function (value, index) {

            return {
                label: value,
                value: value,
                description: `View commands in the ${value} category`,
                default: index === 0,
            };
        });

        const Menu = new MessageSelectMenu();
        Menu.setCustomId('help-command');
        Menu.setPlaceholder("Select a category");
        Menu.setOptions(options);

        const MenuRow = new MessageActionRow();
        MenuRow.addComponents(Menu);



        const message = await utils.reply(ctx, { embeds: [buildHelpEmbed(sections[0])], components: [MenuRow], fetchReply: true });

        if (message) {

            const helpCollectorData = { owner: (ctx.command as any).user?.id || (ctx.command as any).author.id, generateEmbed: buildHelpEmbed }
            const helpCollector = new InteractionCollector<SelectMenuInteraction>(bus.bot!, { message: message, componentType: 'SELECT_MENU', idle: 15000 });
            helpCollector.resetTimer({ time: 15000 });


            helpCollector.on('collect', (async (selector) => {
                const data = this as any as typeof helpCollectorData
                try {
                    if (selector.user.id !== data.owner) {
                        utils.reply(ctx, { ephemeral: true, content: "why must thou choose violence ?" });
                        return;
                    }

                    const sections = ['General', 'Moderation', 'Music', 'Fun'];

                    const options = sections.map(function (value) {

                        console.log(selector);

                        return {
                            label: value,
                            value: value,
                            description: `View commands in the ${value} category`,
                            default: value === selector.values[0],
                        };
                    });

                    const Menu = new MessageSelectMenu();
                    Menu.setCustomId('help-command');
                    Menu.setPlaceholder("Select a category");
                    Menu.setOptions(options);

                    const MenuRow = new MessageActionRow();
                    MenuRow.addComponents(Menu);

                    await selector.update({ embeds: [data.generateEmbed(selector.values[0])], components: [MenuRow] });
                } catch (error) {
                    utils.log(`Error In Help Message Collector\x1b[0m\n`, error);
                }

            }).bind(helpCollectorData));

            helpCollector.on('end', (collected, reason) => {
                try {

                    (helpCollector.options.message as Message).fetch().then((message) => {
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

export default command;