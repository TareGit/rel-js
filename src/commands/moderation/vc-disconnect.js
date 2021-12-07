const { sync } = require(`${process.cwd()}/passthrough.js`);

const { reply } = sync.require(`${process.cwd()}/utils.js`);

module.exports = {
    name: 'vc-disconnect',
    category: 'Moderation',
    description: 'disconnects a user from a voice channel',
    ContextMenu: {},
    options: [
        {
            name: 'user',
            description: 'the user to disconnect',
            type: 4,
            required: true
        }
    ],
    async execute(ctx) {

        const member = ctx.member; 
        if(member === null) return;

        const user = ctx.mentions.members.first();

        if(user === undefined || user === null) return reply(ctx,`Who tf do you want to disconnect`)

        ctx.reply(`<@${user.id}> 🤡`);

        try {
            user.voice.disconnect('Banter');
        } catch (error) {
            console.log(error);
        }
        
    }
}