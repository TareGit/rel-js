const ps = require(`${process.cwd()}/passthrough`);

const {createQueue } = ps.sync.require(`${process.cwd()}/handlers/handle_music_queue`);

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
            if (!ctx.guild || !ctx.member.voice.channel) return ctx.reply("You need to be in a voice channel to use this command");

            let Queue = ps.queues.get(ctx.member.guild.id);

            if (Queue == undefined) {
                Queue = await createQueue(ctx);
            }

            Queue.parseInput(ctx);
    

    }
}