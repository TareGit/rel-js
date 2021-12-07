const { sync, queues } = require(`${process.cwd()}/passthrough.js`);
const { reply } = sync.require(`${process.cwd()}/utils.js`);

module.exports = {
    name: 'remove',
    category: 'Music',
    description: 'removes a song in the queue',
    ContextMenu: {},
    options: [
        {
            name: 'item',
            description: "The song to remove or its index",
            type: 3,
            required: true
        }
    ],
    async execute(ctx) {
        
            if (!ctx.guild || !ctx.member.voice.channel) return reply(ctx,"You need to be in a voice channel to use this command");

            const Queue = queues.get(ctx.member.guild.id);

            if (Queue == undefined) return reply(ctx,"Theres no Queue");

            Queue.remove(ctx);
        

    }
}