const { sync, queues } = require(`${process.cwd()}/passthrough.js`);
const { reply } = sync.require(`${process.cwd()}/utils.js`);

module.exports = {
    name: 'playlists',
    category: 'Music',
    description: 'Shows all saved playlists',
    ContextMenu: {},
    options: [],
    async execute(ctx) {
        
            if (!ctx.guild || !ctx.member.voice.channel) return reply(ctx,"You need to be in a voice channel to use this command");

            const Queue = queues.get(ctx.member.guild.id);

            if (Queue == undefined) return reply(ctx,"Theres no Queue");

            Queue.showQueue(ctx);
        

    }
}