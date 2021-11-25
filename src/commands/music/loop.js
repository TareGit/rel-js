
const ps = require(`${process.cwd()}/passthrough`);

module.exports = {
    name: 'loop',
    category: 'Music',
    description: 'set the loop state of the Queue to on or off',
    ContextMenu: {},
    options: [
        {
            name: 'newLoopState',
            description: '\'on\' to loop and \'off\' to not loop',
            type: 3,
            required: false
        }
    ],
    async execute(ctx) {
        
            if (!ctx.guild || !ctx.member.voice.channel) return ctx.reply("You need to be in a voice channel to use this command");

            const Queue = ps.queues.get(ctx.member.guild.id);

            if (Queue == undefined) return ctx.reply("Theres no Queue");

            Queue.setLooping(ctx);
        

    }
}