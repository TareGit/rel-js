
const { sync, queues } = require(`${process.cwd()}/passthrough.js`);
const { skipSong } = sync.require(`${process.cwd()}/handlers/handle_music`);


module.exports = {
    name: 'skip',
    category: 'Music',
    description: 'skips the current song',
    ContextMenu: {},
    syntax : '{prefix}{name}',
    options: [],
    async execute(ctx) {
        
            if (!ctx.guild || !ctx.member.voice.channel) return reply(ctx,"You need to be in a voice channel to use this command");

            const Queue = queues.get(ctx.member.guild.id);

            if (Queue == undefined) return reply(ctx,"Theres no Queue");

            await skipSong(ctx,Queue);
        

    }
}