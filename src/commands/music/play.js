const { sync, queues } = require(`${process.cwd()}/passthrough.js`);


const {createQueue,parseInput } = sync.require(`${process.cwd()}/handlers/handle_music`);

const utils = sync.require(`${process.cwd()}/utils`);

module.exports = {
    name: 'play',
    category: 'Music',
    description: 'Plays a given song or url',
    ContextMenu: {
        name: 'Add to Queue'
    },
    syntax : '{prefix}{name} <spotify url | youtube url | search term>',
    options: [
        {
            name: 'url',
            description: 'The song to search for / the link to play',
            type: 3,
            required: true
        }
    ],
    async execute(ctx) {
            if (!ctx.guild || !ctx.member.voice.channel) returnutils.reply(ctx,"You need to be in a voice channel to use this command.");

            if(!ctx.guild.me.permissions.has('CONNECT')) returnutils.reply(ctx,"I dont have permissions to join voice channels.");

            if(!ctx.guild.me.permissions.has('SPEAK')) returnutils.reply(ctx,"I dont have permissions to speak in voice channels (play music).");
            
            let Queue = queues.get(ctx.member.guild.id);

            if (Queue == undefined) {
                Queue = await createQueue(ctx);
            }

            await parseInput(ctx,Queue);
    

    }
}