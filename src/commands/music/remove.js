
const ps = require(`${process.cwd()}/passthrough`);

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
        
            if (!ctx.guild || !ctx.member.voice.channel) return ctx.reply("You need to be in a voice channel to use this command");

            const Queue = ps.queues.get(ctx.member.guild.id);

            if (Queue == undefined) return ctx.reply("Theres no Queue");

            Queue.remove(ctx);
        

    }
}