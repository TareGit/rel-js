const { MessageEmbed } = require('discord.js');

const { sync } = require(`${process.cwd()}/dataBus.js`);

const utils = sync.require(`${process.cwd()}/utils`);

const result: IUmekoSlashCommand = {
    name: 'clean',
    category: 'General',
    description: 'Deletes messages in a channel',
    type: ECommandType.SLASH,
    syntax: '{prefix}{name} <ammount to delete>',
    options: [
        {
            name: 'ammount',
            description: "The ammount of messages to delete, 100 max.",
            type: 4,
            required: true
        }
    ],
    async execute(ctx) {


        const ammount = ctx.type == EUmekoCommandContextType.SLASH_COMMAND ? (ctx.command as CommandInteraction).options.getInteger('ammount') : parseInt(ctx.args[0]);

        if (!ctx.guild) return utils.reply(ctx, "You need to be in a server to use this command");

        if (!ctx.guild.me.permissions.has('MANAGE_MESSAGES')) return utils.reply(ctx, "I dont have permissions to delete messages");

        if (ammount == 0 || ammount == NaN || ammount > 100 || ammount < 1) return utils.reply(ctx, "Ammount must be a value between 1 and 100");

        try {
            await ctx.channel.bulkDelete(ammount);
        } catch (error) {
            utils.log('Error deleting messages', error);
        }

        if (ctx.cType === "COMMAND") utils.reply(ctx, { content: "Deleted Messages", ephemeral: true });



    }
}