const { MessageEmbed } = require('discord.js');

const { sync } = require(`${process.cwd()}/passthrough.js`);
const { reply } = sync.require(`${process.cwd()}/utils.js`);

module.exports = {
    name: 'clean',
    category: 'General',
    description: 'Deletes messages in a channel',
    ContextMenu: {},
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

            if (!ctx.guild) return reply(ctx,"you need to be in a server to use this command");

            if (ammount == 0 || ammount == NaN || ammount > 100 || ammount < 1) return reply(ctx,"Ammount must be a value between 1 and 100");

            let deletedMsgs = null;

            deletedMsgs = await ctx.channel.bulkDelete(ammount);
        

    }
}