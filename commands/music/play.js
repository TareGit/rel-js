const { Queues, createQueue} = require(`${process.cwd()}/handlers/handle_music_queue`);

module.exports = {
    name: 'play',
    category: 'Music',
    description : 'shows help',
    ContextMenu: {
        name: 'Add to Queue'
    },
    options : [
        {
            name : 'url',
            description: 'The song to search for / the link to play',
            type: 3,
            required: false
        }
    ],
    async execute(bot,ctx)
    {
        if (!ctx.guild || !ctx.member.voice.channel) return this.notice(command, "You need to be in a voice channel to use this command");

        let Queue = Queues.get(ctx.member.guild.id);

        if(Queue == undefined)
        {
            Queue = await createQueue(bot,ctx);
        }

        Queue.parseInput(ctx);
    }
}