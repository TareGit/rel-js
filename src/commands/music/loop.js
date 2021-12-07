
const { sync, queues } = require(`${process.cwd()}/passthrough.js`);
const { reply } = sync.require(`${process.cwd()}/utils.js`);

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
        
            if (!ctx.guild || !ctx.member.voice.channel) return reply(ctx,"You need to be in a voice channel to use this command");

            const Queue = queues.get(ctx.member.guild.id);

            if (Queue == undefined) return reply(ctx,"Theres no Queue");

            Queue.setLooping(ctx);
        

    }
}