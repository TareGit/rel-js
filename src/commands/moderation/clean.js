const { MessageEmbed } = require('discord.js');

const { sync } = require(`${process.cwd()}/passthrough.js`);


module.exports = {
    name: 'clean',
    category: 'Moderation',
    description: 'Deletes messages in a channel',
    ContextMenu: {},
    syntax : '{prefix}{name} <ammount to delete>',
    options: [
        {
            name: 'ammount',
            description: "The ammount of messages to delete, 100 max.",
            type: 4,
            required: true
        }
    ],
    async execute(ctx) {


            const ammount = ctx.cType == "COMMAND" ? ctx.options.getInteger('ammount') : parseInt(ctx.args[0]);

            if (!ctx.guild) return reply(ctx,"You need to be in a server to use this command");

            if(!ctx.guild.me.permissions.has('MANAGE_MESSAGES')) return reply(ctx,"I dont have permissions to delete messages");
            
            if (ammount == 0 || ammount == NaN || ammount > 100 || ammount < 1) return reply(ctx,"Ammount must be a value between 1 and 100");

            let deletedMsgs = null;

            deletedMsgs = await ctx.channel.bulkDelete(ammount);
        

    }
}