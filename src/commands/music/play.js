const { sync, queues } = require(`${process.cwd()}/passthrough.js`);
const { reply } = sync.require(`${process.cwd()}/utils.js`);

const {createQueue } = sync.require(`${process.cwd()}/handlers/handle_music`);


module.exports = {
    name: 'play',
    category: 'Music',
    description: 'shows help',
    ContextMenu: {
        name: 'Add to Queue'
    },
    options: [
        {
            name: 'url',
            description: 'The song to search for / the link to play',
            type: 3,
            required: false
        }
    ],
    async execute(ctx) {
            if (!ctx.guild || !ctx.member.voice.channel) return reply(ctx,"You need to be in a voice channel to use this command");

            let Queue = queues.get(ctx.member.guild.id);

            if (Queue == undefined) {
                Queue = await createQueue(ctx);
            }

            Queue.parseInput(ctx);
    

    }
}