const { bot,sync } = require(`${process.cwd()}/passthrough.js`);

const utils = sync.require(`${process.cwd()}/utils`);


module.exports = {
    name: 'vc-disconnect',
    category: 'Moderation',
    description: 'Disconnects a user from a voice channel',
    ContextMenu: {},
    syntax : '{prefix}{name} <user mention>',
    options: [
        {
            name: 'user',
            description: 'The user to disconnect',
            type: 6,
            required: true
        }
    ],
    async execute(ctx) {

        const member = ctx.member; 

        if(member === null) return;

        const user = ctx.mentions.members.first();

        if(user === undefined || user === null) return utils.reply(ctx,`I don't know who you want to disconnect`);

        if(user.id === bot.user.id) return utils.reply(ctx,`I see what you did there 👀.`);

        if(!ctx.guild.me.permissions.has('MOVE_MEMBERS')) return utils.reply(ctx,"I dont have permissions to disconnect people");

        ctx.reply(`<@${user.id}> 🤡`);

        try {
            user.voice.disconnect('Banter');
        } catch (error) {
            utils.log(`Error Disconnecting User`,error);
        }
        
    }
}