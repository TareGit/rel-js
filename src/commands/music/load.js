const { sync } = require(`${process.cwd()}/passthrough.js`);
const { reply } = sync.require(`${process.cwd()}/utils.js`);
const { createQueue } = sync.require(`${process.cwd()}/handlers/handle_music`);

module.exports = {
    name: 'load',
    category: 'Music',
    description: 'loads a saved Queue',
    ContextMenu: {},
    options: [
        {
            name: 'name',
            description: "the name of the playlist to load",
            type: 3,
            required: false
        }
    ],
    async execute(ctx) {
        
            if (!ctx.guild || !ctx.member.voice.channel) return reply(ctx,"You need to be in a voice channel to use this command");

            let Queue = ps.queues.get(ctx.member.guild.id);

            if (Queue == undefined) {
                Queue = await createQueue(ps.bot, ctx);
            }

            Queue.loadQueue(ctx);
        

    }
}