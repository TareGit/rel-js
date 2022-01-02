
const { sync, queues } = require(`${process.cwd()}/passthrough.js`);
const { pauseSong } = sync.require(`${process.cwd()}/handlers/handle_music`);

module.exports = {
    name: 'pause',
    category: 'Music',
    description: 'Pauses the current song',
    ContextMenu: {},
    syntax : '{prefix}{name}',
    options: [],
    async execute(ctx) {
        
            if (!ctx.guild || !ctx.member.voice.channel) return reply(ctx,"You need to be in a voice channel to use this command");

            const Queue = queues.get(ctx.member.guild.id);

            if (Queue == undefined) return reply(ctx,"Theres no Queue");

            log(`${ctx.forceChannelReply} Before pause`)

            await pauseSong(ctx,Queue);
        

    }
}