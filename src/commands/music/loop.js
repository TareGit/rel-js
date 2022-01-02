
const { sync, queues } = require(`${process.cwd()}/passthrough.js`);
const { setLooping } = sync.require(`${process.cwd()}/handlers/handle_music`);

module.exports = {
    name: 'loop',
    category: 'Music',
    description: 'Set the loop state of the Queue',
    syntax : '{prefix}{name} <off | song | queue>',
    ContextMenu: {},
    options: [
        {
            name: 'state',
            description: 'The new loop state (off, song, queue)',
            type: 3,
            required: true,
            choices: [
                {
                    "name": "Off",
                    "value": "off"
                },
                {
                    "name": "Song",
                    "value": "song"
                },
                {
                    "name": "Queue",
                    "value": "queue"
                }
            ]
        }
    ],
    async execute(ctx) {
        
            if (!ctx.guild || !ctx.member.voice.channel) return reply(ctx,"You need to be in a voice channel to use this command");

            const Queue = queues.get(ctx.member.guild.id);

            if (Queue == undefined) return reply(ctx,"Theres no Queue");

            await setLooping(ctx,Queue);
        

    }
}